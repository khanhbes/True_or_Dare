# Truth or Dare for Couples

Vite frontend chạy trên Cloudflare Pages. Catalog thẻ và cấu hình Developer dùng D1; ảnh và snapshot dùng hai bucket R2 riêng. Tên, trang phục và thiết lập cá nhân của người chơi chỉ nằm trên thiết bị.

## Player và Admin

- `/` là luồng Player công khai. Người chơi chỉ nhập tên hiển thị; server đặt cookie ID ẩn danh, không yêu cầu email/OTP/mật khẩu và không lưu IP.
- `/admin` là Developer, được bảo vệ bằng Cloudflare Access Email OTP cho email quản trị.
- Admin xem được số phiên đang online (heartbeat trong 2 phút), hoạt động 24 giờ và tổng thiết bị từng đăng nhập.
- Player kiểm tra revision catalog mỗi 10 giây và khi quay lại tab; bản cập nhật của Admin được tải tự động, còn lỗi mạng không ghi đè cache hợp lệ.
- Snapshot đầy đủ dùng để seed/fallback nằm tại `data/catalog`: `catalog.json` chứa 157 thẻ đã merge, `seed-bundle.json` giữ cấu trúc nhập cloud, `assets/` chứa 43 ảnh và `manifest.json` chứa checksum.

Tạo lại snapshot local từ gói backup đã xác minh:

```powershell
npm run catalog:materialize -- C:\path\to\backup.todbackup.zip
```

## Chạy frontend nhanh

**Yêu cầu:** Node.js 20 trở lên.


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

Mở `http://localhost:3000`. Vite thuần không có Pages Functions nên ứng dụng sẽ ghi rõ đang dùng dữ liệu cục bộ. Để kiểm thử cloud local đầy đủ:

```powershell
npm run build
npx wrangler d1 migrations apply true-or-dare-catalog-local --local
npx wrangler pages dev dist --port 8788
```

Copy `.dev.vars.example` thành `.dev.vars` và đặt một email local trước khi mở `http://localhost:8788/admin`. `.dev.vars`, backup và dữ liệu forensic đều đã được gitignore.

## Gói phục hồi 157 thẻ

Script chỉ đọc bản forensic và tạo ZIP mới có manifest/checksum:

```powershell
python scripts\recover_catalog.py `
  --source C:\Users\khanh\Downloads\True_or_Dare_recovery_20260820 `
  --output C:\Users\khanh\Downloads\True_or_Dare_recovered_157.todbackup.zip `
  --ccl-root C:\Users\khanh\AppData\Local\Temp\tod-recovery-tools
```

Dry-run trước, sau đó mới thêm `--apply`:

```powershell
python scripts\import_catalog.py C:\path\backup.todbackup.zip --base-url http://127.0.0.1:8788
python scripts\import_catalog.py C:\path\backup.todbackup.zip --base-url http://127.0.0.1:8788 --apply
```

Import chỉ seed database rỗng. Khi cần thay catalog đã có, thêm `--replace`; API sẽ tạo snapshot `pre_restore` trước khi thay.

## Tạo tài nguyên Cloudflare

Đăng nhập và tạo tài nguyên riêng cho preview/production:

```powershell
npx wrangler login
npx wrangler d1 create true-or-dare-catalog-preview
npx wrangler d1 create true-or-dare-catalog
npx wrangler r2 bucket create true-or-dare-card-assets-preview
npx wrangler r2 bucket create true-or-dare-card-backups-preview
npx wrangler r2 bucket create true-or-dare-card-assets
npx wrangler r2 bucket create true-or-dare-card-backups
```

Thay các UUID mẫu trong `wrangler.jsonc` và `backup-worker/wrangler.jsonc` bằng ID thật. Không bind database production vào preview.

```powershell
npx wrangler d1 migrations apply true-or-dare-catalog-preview --remote --env preview
npx wrangler d1 migrations apply true-or-dare-catalog --remote --env production
npx wrangler deploy --config backup-worker/wrangler.jsonc
```

Pages project build bằng `npm run build`, output `dist`. Binding Pages phải đúng tên `DB`, `CARD_ASSETS`, `CARD_BACKUPS`; biến `ENVIRONMENT=production` ở production.

## Cloudflare Access

Tạo Access Application dạng self-hosted, dùng Email OTP và allow-list email quản trị cho hai path:

- `/admin*`
- `/api/admin/*`

Thêm `ACCESS_TEAM_DOMAIN` và `ACCESS_AUD` vào Pages environment. API tự xác minh JWT Access; việc ẩn nút Developer không được xem là lớp bảo mật.

## Backup và phục hồi

- Mỗi mutation tăng `datasetRevision` và ghi before/after vào `catalog_revisions`.
- Worker chạy `0 17 * * *` UTC: daily giữ 30 ngày, Chủ nhật giữ 12 tuần.
- Ảnh dùng object key SHA-256 bất biến và được mirror sang bucket backup trước khi metadata D1 được commit.
- Developer có Xuất `.todbackup.zip`, Nhập dry-run và Snapshot thủ công.
- Luôn thử restore file vừa tải vào preview trước khi coi rollout hoàn tất.

## Kiểm tra

```powershell
npm run lint
npm test
npm run build
```
