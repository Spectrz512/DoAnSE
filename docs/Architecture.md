# Kiến trúc backend — Hồ Chí Minh GPS Audio Guide

## 1. Quyết định kiến trúc cho MVP

Hệ thống xây dựng trên nền tảng **NestJS**, **PostgreSQL 16 (kèm PostGIS 3.4)** và **Prisma ORM 7** (`@prisma/adapter-pg`). Toàn bộ mã nguồn tuân thủ chặt chẽ kiến trúc 3 lớp (3-Tier Architecture) được mô-đun hóa:

| Lớp | Trách nhiệm | Thành phần trong mã |
|---|---|---|
| **Presentation Layer** | Tiếp nhận HTTP/REST, xác thực DTO, phân quyền (`AdminKeyGuard`, `RateLimitGuard`), Upload `FileInterceptor`. | `*.controller.ts`, `dto.ts`, `*.guard.ts` |
| **Business Logic Layer** | Xử lý nghiệp vụ 9 Use Cases, giải thuật Hysteresis, Gemini RAG + fallback, ước tính lộ trình, kiểm tra file audio. | `*.service.ts` |
| **Data Access Layer** | Thực thi truy vấn/ghi dữ liệu qua Prisma Client và truy vấn không gian PostGIS `$queryRaw`, không chứa logic HTTP. | `*.repository.ts`, `PrismaService` |

Luồng dữ liệu chuẩn: `Client Request → Controller → Service → Repository → PostgreSQL/PostGIS`.

## 2. Geofence, Hybrid PostGIS & Chống phát lặp (UC2, UC6, UC8)

- **Kích hoạt PostGIS tự động:** `PrismaService.onModuleInit()` và migration khởi tạo (`20261020000000_init`) tự động chạy `CREATE EXTENSION IF NOT EXISTS postgis;` an toàn.
- **Chiến lược Hybrid Geofencing (`PoiRepository.findNearby`):**
  - *Tầng 1 (PostGIS Native):* Thực thi `prisma.$queryRaw` với `ST_DWithin(::geography)` và `ST_DistanceSphere` kết hợp `LEFT JOIN "Narration"` theo ngôn ngữ.
  - *Tầng 2 (Fallback an toàn):* Tự động fallback về thuật toán Haversine in-memory khi DB chưa bật PostGIS hoặc trong môi trường unit test mock.
- **Chế độ theo Tour & Khám phá tự do:**
  - *Theo Tour (Offline Package - UC8):* Client gọi `GET /api/tours/:id/package?language=vi` để tải trọn gói thông tin tour, stops, POI và audio URL.
  - *Khám phá trực tuyến (UC2):* Client gửi vị trí tới `GET /api/pois/nearby` hoặc `GET /api/geo/trigger-candidates`.
- **Cơ chế Hysteresis (Chống phát lặp / Chống rung GPS):** Vào vùng kích hoạt khi `distanceM <= triggerRadiusM` (`1.0x`) và chỉ đưa POI vào `resetPoiIds` để sẵn sàng phát lại khi du khách rời xa tối thiểu **`1.5 * triggerRadiusM`**.

## 3. Quản lý Tệp tĩnh & Upload Audio (UC3)

- **Upload âm thanh trực tiếp:** `AdminController` cung cấp `POST /api/admin/upload-audio` và `POST /api/admin/pois/:id/audio` (bảo vệ bởi `AdminKeyGuard`), nhận `multipart/form-data` (field `file`) thông qua `FileInterceptor('file')`.
- **Kiểm tra & Lưu trữ:** `AdminService.uploadAudio` xác thực phần mở rộng (`.mp3`, `.wav`, `.ogg`, `.m4a`), mimetype `audio/*` và giới hạn tối đa **15MB** (`BadRequestException` nếu sai), làm sạch tên file và lưu vào `backend/uploads/audio/`. Nếu truyền kèm `poiId` và `language`, hệ thống tự động upsert `audioUrl` vào bảng `Narration` và ghi nhận `AuditEvent` (`UPLOAD_AUDIO`).
- **Phục vụ Static Files:** Cấu hình `app.use('/uploads', express.static(join(process.cwd(), 'uploads')))` trong `app.setup.ts`; Nginx reverse proxy `/uploads/` sang `api:3000/uploads/` (`demo/nginx.conf`) và mount volume `./backend/uploads:/app/uploads` trong `docker-compose.yml`.

## 4. Bảo mật, AI Chatbot RAG & Phục hồi (UC4, UC7)

- **Phân quyền & Chống spam:**
  - API quản trị yêu cầu header `x-admin-key` đối chiếu với `ADMIN_API_KEY` (`AdminKeyGuard`).
  - Endpoint `POST /api/chatbot/messages` gắn `RateLimitGuard` giới hạn **20 request/phút** theo IP (in-memory sliding window).
- **Quyền riêng tư:** Backend không lưu vết tọa độ GPS thô liên tục; chỉ lưu sự kiện nghe (`ListeningEvent` với chế độ `AUTO`/`MANUAL`), phiên nghe trực tiếp (`ListeningSession`), lượt truy cập (`AccessEvent`) và trạng thái online (`VisitorSession`) phục vụ thống kê UC7.
- **Kiến trúc AI Guide RAG 2 tầng (UC4):**
  1. `ChatbotService` trích xuất từ khóa, truy vấn `PoiRepository.findPublishedForKnowledge()` (có fallback tìm kiếm không dấu trên toàn bộ POI `PUBLISHED` bằng `normalizeText`) để xếp hạng `rankedPois`.
  2. Nếu cấu hình `GEMINI_API_KEY`, hệ thống gọi **Google Gemini 2.5 Flash REST API** (`AbortSignal.timeout(8000)`) kèm ngữ cảnh top 3 POI và trả về `provider: 'gemini-rag'`.
  3. **Graceful Degradation:** Khi thiếu `GEMINI_API_KEY` hoặc API timeout/lỗi, hệ thống tự động trả về câu trả lời ghép sẵn từ tri thức đã duyệt với `provider: 'knowledge-grounded'` kèm danh sách `references`.

## 5. Quy trình Tích hợp và Triển khai Liên tục (CI/CD)

Pipeline được tự động hóa qua GitHub Actions (`.github/workflows/ci-cd.yml`):
1. **Continuous Integration (`continuous-integration`):**
   - Cài đặt dependencies (`npm ci`) và sinh Prisma Client (`npm run prisma:generate`).
   - Linting type-aware với Oxlint (`npm run lint` — yêu cầu 0 lỗi, 0 cảnh báo).
   - Chạy toàn bộ **9 test suites / 55 Unit Tests** bằng Vitest (`npm test`).
   - Khởi động service container `postgis/postgis:16-3.4-alpine`, chạy `npx prisma migrate deploy` và bộ kiểm thử tích hợp E2E (`npm run test:e2e`).
   - Kiểm tra biên dịch TypeScript (`npm run build`).
2. **Continuous Delivery & Deployment:**
   - Đóng gói Docker Image `${{ secrets.DOCKER_USERNAME }}/hcm-gps-audio-guide-backend` (`latest` và commit SHA) khi push lên `main`.
   - Deploy qua SSH tới `/var/www/gps-backend` (`docker compose pull api && docker compose up -d api`) khi bật `DEPLOY_ENABLED=true`.

## 6. Trạng thái hoàn thiện Module (9/9 Use Cases)

- **Hoàn thiện 100%:** UC1 (Access Pass QR), UC2 (Geofence PostGIS Hybrid & Hysteresis), UC3 (Admin CRUD, Đa ngôn ngữ & Upload Audio `/uploads`), UC4 (Chatbot Gemini 2.5 Flash RAG + fallback `knowledge-grounded` & Rate Limit), UC5 (Manual Playback), UC6 (Tour Planning), UC7 (Dashboard Analytics & Seed mẫu đa dạng), UC8 (Offline Tour Package), UC9 (Real-time Health Check `SELECT 1`).
