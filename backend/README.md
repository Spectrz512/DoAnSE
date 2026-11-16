# Hồ Chí Minh GPS Audio Guide – Backend API

Backend NestJS tuân thủ nghiêm ngặt kiến trúc 3 lớp: **Controller** (HTTP/DTO validation/Guards) $\rightarrow$ **Service** (nghiệp vụ 9 Use Cases) $\rightarrow$ **Repository** (truy cập PostgreSQL/PostGIS qua Prisma ORM). API mặc định dùng tiền tố `/api` (ngoại trừ `/health`, `/system/network-info`, `/docs`, `/uploads`).

## Chạy local

1. Sao chép `.env.example` thành `.env` và cấu hình các biến môi trường:
   - `DATABASE_URL`: chuỗi kết nối PostgreSQL / PostGIS.
   - `ADMIN_API_KEY`: khóa xác thực Admin cho header `x-admin-key` (mặc định Docker: `local-admin-key-change-me`).
   - `JWT_SECRET`: khóa bí mật ứng dụng.
   - `GEMINI_API_KEY`: *(tùy chọn)* API key Google Gemini 2.5 Flash cho Chatbot AI RAG; nếu bỏ trống hoặc gặp lỗi mạng, chatbot tự fallback sang `knowledge-grounded`.
2. Chạy `npm ci`, `npm run prisma:generate`, `npm run prisma:migrate`, `npm run db:seed` và `npm run start:dev`.
3. Hoặc khởi chạy toàn bộ PostGIS + Backend API + Nginx web tại thư mục gốc bằng `docker compose up --build`.

## API hiện có

| Method | URL | Mô tả |
|---|---|---|
| GET | `/health`, `/api/health` | Health check thời gian thực kèm truy vấn DB `SELECT 1` (UC9) |
| POST / GET | `/api/access-passes/activate`, `/api/access-passes/validate/:code` | Kích hoạt và kiểm tra mã QR / Access Pass vào tour (UC1) |
| GET | `/api/pois`, `/api/pois/:id`, `/api/pois/nearby` | Danh sách, chi tiết POI và tìm kiếm lân cận kèm Hysteresis 1.0x/1.5x (UC2, UC5) |
| GET | `/api/geo/trigger-candidates?lat=&lng=&language=vi` | Ứng viên geofence trong bán kính kích hoạt, ưu tiên theo `priority` (UC2) |
| GET | `/api/languages`, `/api/pois/:poiId/narrations?language=vi` | Danh mục 20 ngôn ngữ và nội dung/audio thuyết minh đa ngôn ngữ |
| GET / POST | `/api/tours/suggested`, `/api/tours/plan`, `/api/tours/:id/package` | Tour gợi ý, lập lộ trình cá nhân và tải gói tour ngoại tuyến (UC6, UC8) |
| POST | `/api/chatbot/messages` | Chatbot AI Guide Gemini 2.5 Flash RAG + fallback `knowledge-grounded`, giới hạn 20 req/phút (UC4) |
| GET / POST | `/api/listening-events/*`, `/api/access-events/*` | Ghi nhận sự kiện nghe (`AUTO`/`MANUAL`), phiên nghe trực tiếp, heartbeat & lượt truy cập (UC7) |
| GET / POST / PUT / PATCH / DELETE | `/api/admin/*` | Thống kê Dashboard, nhật ký kiểm toán, CRUD POI và thuyết minh (`x-admin-key`) (UC3, UC7) |
| POST | `/api/admin/upload-audio`, `/api/admin/pois/:id/audio` | Upload file âm thanh `.mp3`/`.wav`/`.ogg`/`.m4a` ($\le$ 15MB, `multipart/form-data`), lưu tại `/uploads/audio/*` (UC3) |

## Kiểm thử & CI/CD

```bash
npm run lint       # Oxlint type-aware: 0 warnings, 0 errors
npm test           # Vitest: 9 test suites, 55 unit tests PASS
npm run test:e2e   # Supertest E2E với PostGIS (cần TEST_DATABASE_URL & RUN_INTEGRATION_TESTS=true)
npm run build      # Biên dịch NestJS sang dist/
```

GitHub Actions (`.github/workflows/ci-cd.yml`) tự động chạy `oxlint`, `npm test` (55 unit tests), `prisma migrate deploy` và `npm run test:e2e` trên service `postgis/postgis:16-3.4-alpine`, sau đó `nest build`. Khi push vào `main`, pipeline build và đẩy Docker image `${{ secrets.DOCKER_USERNAME }}/hcm-gps-audio-guide-backend` (`latest` và commit SHA), hỗ trợ deploy SSH khi bật `DEPLOY_ENABLED=true`.
