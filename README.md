# Linh Ứng GPS Guide API

Backend MVP cho hệ thống thuyết minh tự động theo GPS, triển khai theo NestJS 3 lớp.

## Chạy local

1. Sao chép `.env.example` thành `.env`.
2. Cài dependencies: `npm install`.
3. Khởi động PostGIS: `docker compose up -d db`.
4. Áp dụng schema/migrations: `npx prisma migrate deploy`.
5. Nạp dữ liệu mẫu: `npm run prisma:seed`.
6. Chạy API: `npm run start:dev`.

Mở Swagger tại `http://localhost:3000/docs`.

### Chạy toàn bộ thiết lập và kiểm tra bằng một lệnh

Trong PowerShell ở thư mục dự án, chạy:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-and-verify.ps1
```

Script chỉ tạo `.env` khi file này chưa tồn tại, khởi động PostGIS, thực hiện các bước Prisma, lint, test, build và security audit. Nó không dùng `npm audit fix --force`. `npm audit fix` có thể trả mã lỗi khi chỉ còn dependency development cần nâng major; script sẽ ghi cảnh báo và tiếp tục. `npm run audit:prod` vẫn chặn khi dependency production có lỗ hổng high/critical.

Tài khoản seed: `admin@linhung.local` / `ChangeMe123!` (chỉ dùng local, đổi ngay khi triển khai).

## Endpoint MVP

| Method | Path | Mục đích |
|---|---|---|
| POST | `/api/v1/auth/login` | Lấy JWT cho quản trị |
| GET | `/api/v1/health` | Kiểm tra API và database sẵn sàng |
| POST | `/api/v1/access-passes/activate` | Kích hoạt tour qua QR và tải gói POI một lần |
| GET | `/api/v1/pois/nearby?latitude=16.10699&longitude=108.27354&radiusM=250&language=vi` | Tìm POI published gần vị trí |
| POST | `/api/v1/pois` | Tạo POI draft (Bearer JWT) |

Để thử luồng QR của dữ liệu mẫu, gửi `POST /api/v1/access-passes/activate` với body `{"qrCode":"LINH-UNG-DEMO","language":"vi"}`. API trả một access token và danh sách stop đã được đóng gói cho client.

Sau khi kéo thay đổi mới, hãy chạy `npx prisma migrate deploy`, `npx prisma generate` và `npm run prisma:seed` trước khi build/chạy API.

## Bảo mật dependencies

`bcrypt` đã được nâng lên v6 (Node 20 được hỗ trợ), loại bỏ nhánh cài đặt cũ dùng `node-pre-gyp`. Để cập nhật lockfile theo các bản vá tương thích mà npm xác định, chạy `npm audit fix --package-lock-only`, sau đó `npm install`, `npm test` và `npm run build`. Không dùng `--force` nếu chưa xem kỹ thay đổi major. Chạy `npm run audit:prod` để chỉ chặn pipeline khi dependency production có lỗ hổng mức high/critical.

### Prisma generate báo `EPERM ... query_engine-windows.dll.node`

Dừng mọi terminal đang chạy `npm run start:dev`, Prisma Studio hoặc chương trình đang dùng API, rồi chạy lại script. Đây là Windows đang khoá file native Prisma khi nó được thay thế; script sẽ tự thử lại 3 lần trước khi dừng.

## Nghiên cứu tham chiếu

- [izi.TRAVEL](https://izi.travel/en/app) kết hợp QR, GPS và nội dung đa phương tiện/đa ngôn ngữ.
- [GuideAlong](https://guidealong.com/how-it-works/) tải nội dung trước để vẫn phát GPS khi offline.
- [STQRY](https://support.stqry.com/support/solutions/articles/153000233914-how-the-stqry-app-works) mô tả automatic mode: vào geofence thì thông báo và phát audio.

Các tham chiếu này dẫn đến các yêu cầu MVP: geofence, manual fallback, tải trước, đa ngôn ngữ và giảm thiểu lưu dữ liệu vị trí.
