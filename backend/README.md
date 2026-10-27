# GPS Chùa Linh Ứng API

Backend NestJS theo ba lớp: **Controller** (HTTP/validation), **Service** (nghiệp vụ) và **Repository/Prisma** (truy cập PostgreSQL). API mặc định dùng tiền tố `/api`; trải nghiệm người dùng không cần đăng nhập.

## Chạy local

1. Sao chép `.env.example` thành `.env`, đặt `DATABASE_URL` và `JWT_SECRET`.
2. Chạy `npm ci`, `npm run prisma:generate`, `npm run prisma:migrate` và `npm run start:dev`.
3. Hoặc chạy toàn bộ Postgres + API bằng `docker compose up --build` tại thư mục gốc.

## API hiện có

| Method | URL | Mô tả |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/pois?q=&category=` và `/api/pois/:id` | Tìm kiếm, duyệt danh mục và chi tiết POI |
| GET | `/api/languages`, `/api/pois/:id/narrations?language=vi` | Ba ngôn ngữ và nội dung/audio thuyết minh |
| GET | `/api/geo/trigger-candidates?lat=&lng=&language=vi` | Ứng viên geofence theo khoảng cách và ưu tiên |
| GET/POST | `/api/tours/suggested`, `/api/tours/plan` | Tour gợi ý và lập tour cá nhân phía client |
| GET/POST | `/api/listening-events` | Lưu/lấy lịch sử nghe theo `visitorId` ẩn danh |
| POST/PUT/DELETE | `/api/admin/*` | Quản trị POI và nội dung, yêu cầu header `x-admin-key` |

Frontend lấy vị trí GPS, áp dụng cooldown, tốc độ đọc và tự phát audio. Backend không lưu luồng GPS liên tục: endpoint geofence chỉ nhận một tọa độ và trả các điểm phù hợp, đã ưu tiên theo `priority`; điều này giảm thu thập dữ liệu vị trí. Ba ngôn ngữ hiện cấu hình là `vi`, `en`, `ko` và có thể thay đổi khi chốt yêu cầu.

## CI/CD

GitHub Actions kiểm tra lint, test, build cho PR/push vào `main`/`develop`. Push vào `main` tạo và đẩy image Docker có tag `latest` và commit SHA. Để bật deploy SSH, thêm biến repository `DEPLOY_ENABLED=true` và secrets `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`; máy chủ cần có file Compose tại `/var/www/gps-backend` và đặt `BACKEND_IMAGE=<docker-user>/gps-chua-linh-ung-backend:latest` trong `.env` của máy chủ.
