[CmdletBinding()]
param(
    [string]$Message = "",
    [switch]$SkipChecks,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$repoRoot = (& git -C $projectRoot rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($repoRoot)) {
    throw "Khong tim thay Git repository cha cua: $projectRoot"
}
$projectPath = [System.IO.Path]::GetRelativePath($repoRoot, $projectRoot).Replace("\", "/")
$actionsUrl = "https://github.com/khanhbes/True_or_Dare/actions/workflows/deploy-staging.yml"
$stagingUrl = "https://staging.true-or-dare-couples.pages.dev"

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

function Assert-NoSensitiveFilesAreStaged {
    param(
        [Parameter(Mandatory)]
        [string]$Pathspec
    )

    $sensitivePattern = '(^|/)(\.env($|\.)|\.dev\.vars$|credentials(\..+)?\.json$|secrets?(/|$))|(\.pem|\.key|\.p12|\.pfx|\.secret)$'
    $allowedExamples = @('.env.example', '.dev.vars.example')
    $stagedFiles = @(& git diff --cached --name-only -- $Pathspec)

    if ($LASTEXITCODE -ne 0) {
        throw "Khong the kiem tra danh sach file da stage."
    }

    $blocked = @(
        $stagedFiles | Where-Object {
            $_ -match $sensitivePattern -and $_ -notin $allowedExamples
        }
    )

    if ($blocked.Count -gt 0) {
        Write-Host ""
        Write-Host "DA DUNG: phat hien file co the chua bi mat:" -ForegroundColor Red
        $blocked | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
        Write-Host "Hay bo cac file nay khoi Git va them quy tac vao .gitignore." -ForegroundColor Yellow
        throw "Tu choi commit file co the chua bi mat."
    }
}

function Wait-GitHubDeployment {
    param(
        [Parameter(Mandatory)]
        [string]$CommitSha
    )

    $headers = @{
        Accept       = "application/vnd.github+json"
        "User-Agent" = "true-or-dare-deploy-helper"
    }
    $apiUrl = "https://api.github.com/repos/khanhbes/True_or_Dare/actions/runs?head_sha=$CommitSha&per_page=10"
    $deadline = (Get-Date).AddMinutes(15)
    $run = $null

    Write-Host ""
    Write-Host "Dang cho GitHub Actions nhan commit..." -ForegroundColor Cyan

    try {
        while ((Get-Date) -lt $deadline) {
            $response = Invoke-RestMethod -Uri $apiUrl -Headers $headers -Method Get
            $run = @($response.workflow_runs | Where-Object {
                $_.path -eq ".github/workflows/deploy-staging.yml"
            } | Sort-Object created_at -Descending | Select-Object -First 1)

            if ($run.Count -gt 0) {
                $run = $run[0]
                break
            }

            Start-Sleep -Seconds 10
        }

        if ($null -eq $run) {
            Write-Warning "Chua thay workflow sau khi cho. Kiem tra tai: $actionsUrl"
            return
        }

        Write-Host "Workflow: $($run.html_url)" -ForegroundColor DarkGray
        while ($run.status -ne "completed" -and (Get-Date) -lt $deadline) {
            Write-Host "Trang thai deploy: $($run.status)..."
            Start-Sleep -Seconds 20
            $run = Invoke-RestMethod -Uri $run.url -Headers $headers -Method Get
        }

        if ($run.status -ne "completed") {
            Write-Warning "Deploy van dang chay. Kiem tra tai: $($run.html_url)"
            return
        }

        if ($run.conclusion -ne "success") {
            throw "GitHub Actions ket thuc voi trang thai '$($run.conclusion)'. Xem: $($run.html_url)"
        }

        Write-Host "GitHub Actions deploy thanh cong." -ForegroundColor Green
    }
    catch {
        if ($_.Exception.Message -like "GitHub Actions ket thuc*") {
            throw
        }

        Write-Warning "Khong the theo doi GitHub Actions tu dong: $($_.Exception.Message)"
        Write-Host "Commit da push. Kiem tra thu cong tai: $actionsUrl"
        return
    }

    try {
        $webResponse = Invoke-WebRequest -Uri $stagingUrl -Method Head -UseBasicParsing
        if ($webResponse.StatusCode -ge 200 -and $webResponse.StatusCode -lt 400) {
            Write-Host "Web da hoat dong: $stagingUrl" -ForegroundColor Green
        }
    }
    catch {
        Write-Warning "Deploy thanh cong nhung chua kiem tra duoc URL: $stagingUrl"
    }
}

Push-Location $projectRoot
try {
    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot ".git"))) {
        throw "Thu muc nay khong phai Git repository: $repoRoot"
    }

    $branch = (& git branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or $branch -ne "main") {
        throw "Can chay tren branch main. Branch hien tai: '$branch'."
    }

    Write-Host "=== DAY CODE LEN GITHUB VA CAP NHAT WEB ===" -ForegroundColor Magenta
    Write-Host "Git repo: $repoRoot"
    Write-Host "Web app: $projectRoot"

    if ($DryRun) {
        Write-Host "Che do DryRun: khong stage, commit hoac push." -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "[1/5] Dong bo thong tin origin/main..." -ForegroundColor Cyan
    Invoke-NativeCommand git fetch origin main --quiet
    $distance = Get-BranchDistance
    if ($distance.Behind -gt 0) {
        throw "Local dang cham origin/main $($distance.Behind) commit. Hay chay .\keo-tu-github.ps1 truoc."
    }

    if (-not $SkipChecks) {
        Write-Host "[2/5] Kiem tra TypeScript..." -ForegroundColor Cyan
        Invoke-NativeCommand npm run lint

        Write-Host "[3/5] Chay test..." -ForegroundColor Cyan
        Invoke-NativeCommand npm test

        Write-Host "[4/5] Build production..." -ForegroundColor Cyan
        Invoke-NativeCommand npm run build
    }
    else {
        Write-Host "[2-4/5] Da bo qua lint, test va build theo yeu cau." -ForegroundColor Yellow
    }

    $changes = @(& git status --short -- $projectPath)
    if ($LASTEXITCODE -ne 0) {
        throw "Khong the doc git status."
    }

    if ($DryRun) {
        Write-Host ""
        if ($changes.Count -eq 0) {
            Write-Host "Khong co file thay doi."
        }
        else {
            Write-Host "Cac file se duoc commit:" -ForegroundColor Cyan
            $changes | ForEach-Object { Write-Host $_ }
        }
        Write-Host "DryRun hoan tat."
        return
    }

    if ($changes.Count -gt 0) {
        Write-Host "[5/5] Stage va commit thay doi..." -ForegroundColor Cyan
        Invoke-NativeCommand git add --all -- $projectPath
        Assert-NoSensitiveFilesAreStaged -Pathspec $projectPath

        & git diff --cached --quiet -- $projectPath
        $hasStagedChanges = $LASTEXITCODE -eq 1
        if ($LASTEXITCODE -notin @(0, 1)) {
            throw "Khong the kiem tra thay doi da stage."
        }

        if ($hasStagedChanges) {
            if ([string]::IsNullOrWhiteSpace($Message)) {
                $Message = "update web $((Get-Date).ToString('yyyy-MM-dd HH:mm'))"
            }
            Invoke-NativeCommand git commit -m $Message -- $projectPath
        }
    }
    else {
        Write-Host "Khong co file moi can commit."
    }

    $distance = Get-BranchDistance
    if ($distance.Ahead -eq 0) {
        Write-Host "GitHub da o phien ban moi nhat; khong can push." -ForegroundColor Green
        Write-Host "Web: $stagingUrl"
        return
    }

    Write-Host "Dang push $($distance.Ahead) commit len origin/main..." -ForegroundColor Cyan
    Invoke-NativeCommand git push origin main

    $commitSha = (& git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0) {
        throw "Khong the doc commit SHA sau khi push."
    }

    Write-Host "Push thanh cong: $commitSha" -ForegroundColor Green
    Wait-GitHubDeployment -CommitSha $commitSha
}
catch {
    Write-Host ""
    Write-Host "LOI: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}
