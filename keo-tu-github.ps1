[CmdletBinding()]
param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,

        [Parameter(ValueFromRemainingArguments)]
        [string[]]$ArgumentList
    )

    & $FilePath @ArgumentList
    if ($LASTEXITCODE -ne 0) {
        throw "Lenh that bai ($LASTEXITCODE): $FilePath $($ArgumentList -join ' ')"
    }
}

function Get-BranchDistance {
    $raw = (& git rev-list --left-right --count HEAD...origin/main).Trim()
    if ($LASTEXITCODE -ne 0) {
        throw "Khong the so sanh nhanh local voi origin/main."
    }

    $parts = $raw -split "\s+"
    if ($parts.Count -ne 2) {
        throw "Ket qua git rev-list khong hop le: $raw"
    }

    return @{
        Ahead  = [int]$parts[0]
        Behind = [int]$parts[1]
    }
}

function Get-LockFileRevision {
    $value = & git rev-parse "HEAD:package-lock.json" 2>$null
    if ($LASTEXITCODE -ne 0) {
        return ""
    }

    return $value.Trim()
}

Push-Location $repoRoot
try {
    if (-not (Test-Path -LiteralPath ".git")) {
        throw "Thu muc nay khong phai Git repository: $repoRoot"
    }

    $branch = (& git branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or $branch -ne "main") {
        throw "Can chay tren branch main. Branch hien tai: '$branch'."
    }

    Write-Host "=== KEO CODE MOI NHAT TU GITHUB VE MAY ===" -ForegroundColor Magenta
    Write-Host "Repo: $repoRoot"

    $changes = @(& git status --short)
    if ($LASTEXITCODE -ne 0) {
        throw "Khong the doc git status."
    }

    if ($changes.Count -gt 0) {
        Write-Host ""
        Write-Host "Local dang co thay doi chua commit:" -ForegroundColor Yellow
        $changes | ForEach-Object { Write-Host $_ }
        if ($DryRun) {
            Write-Host "DryRun: neu chay that, script se dung de bao ve thay doi local."
            return
        }
        throw "Hay chay .\day-web.ps1 de commit/push, hoac tu xu ly cac thay doi tren truoc khi pull."
    }

    if ($DryRun) {
        Write-Host "DryRun: working tree sach; co the fetch va pull an toan." -ForegroundColor Green
        return
    }

    Write-Host "Dang kiem tra origin/main..." -ForegroundColor Cyan
    Invoke-NativeCommand git fetch origin main --prune
    $distance = Get-BranchDistance

    if ($distance.Ahead -gt 0 -and $distance.Behind -gt 0) {
        throw "Local va GitHub da tach nhanh. Script khong tu merge de tranh mat code; can xu ly conflict thu cong."
    }

    if ($distance.Ahead -gt 0) {
        throw "Local dang co $($distance.Ahead) commit chua push. Hay chay .\day-web.ps1."
    }

    if ($distance.Behind -eq 0) {
        Write-Host "Local da la phien ban moi nhat." -ForegroundColor Green
        return
    }

    $oldLockRevision = Get-LockFileRevision
    Write-Host "Dang fast-forward $($distance.Behind) commit..." -ForegroundColor Cyan
    Invoke-NativeCommand git pull --ff-only origin main
    $newLockRevision = Get-LockFileRevision

    if ($oldLockRevision -ne $newLockRevision) {
        Write-Host "package-lock.json da thay doi; dang cap nhat dependencies..." -ForegroundColor Cyan
        Invoke-NativeCommand npm ci
    }

    $latestCommit = (& git log -1 --pretty=format:"%h %s").Trim()
    if ($LASTEXITCODE -ne 0) {
        throw "Da pull xong nhung khong doc duoc commit moi nhat."
    }

    Write-Host ""
    Write-Host "Da cap nhat thanh cong: $latestCommit" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "LOI: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}

