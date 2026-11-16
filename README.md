# Hồ Chí Minh GPS Audio Guide – Thuyết minh tự động đa ngôn ngữ

Hệ thống hướng dẫn du lịch âm thanh tự động (Location-based Audio Guide) phục vụ du khách tham quan các di tích lịch sử và văn hóa tại Thành phố Hồ Chí Minh và Chùa Linh Ứng (Đà Nẵng). Ứng dụng hoạt động trực tiếp trên trình duyệt Web (PWA/Mobile Web), không yêu cầu du khách phải đăng nhập hay cài đặt ứng dụng.

---

## 1. Thành viên phát triển

| STT | Họ và tên | Vai trò | Trách nhiệm chính |
|:---:|---|:---:|---|
| 1 | **Trần Lê Trung** | **Lead** | Chuẩn hóa 3 lớp Translation, Tour Planning & Offline Package (UC8) |
| 2 | **Lê Tấn Phát** | **Dev** | Hạ tầng, Docker PostGIS, Core Architecture, Routing & Health Check |
| 3 | **Như Phát** | **Dev** | AI Chatbot RAG tri thức POI, Rate Limiting & E2E Testing |

---

## 2. Tech Stack

- **Backend Framework:** [NestJS](https://nestjs.com/) (Node.js v20/v22, TypeScript ESM).
- **Database & Spatial Engine:** [PostgreSQL 16](https://www.postgresql.org/) kết hợp [PostGIS 3.4](https://postgis.net/) (tự động kích hoạt extension `postgis`, truy vấn không gian `ST_DWithin`, `ST_DistanceSphere` + fallback Haversine).
- **ORM:** [Prisma ORM 7](https://www.prisma.io/) với `@prisma/adapter-pg`.
- **AI & Media:** Google Gemini 2.5 Flash REST API (RAG kèm fallback `knowledge-grounded`), Multer (`FileInterceptor`) upload audio và Express Static (`/uploads`).
- **Testing:** [Vitest](https://vitest.dev/) (9 test suites, 55 Unit Tests), Supertest (E2E API Integration trên PostGIS container).
- **Linter & Code Quality:** [Oxlint](https://oxc.rs/) (type-aware linting, 0 lỗi / 0 cảnh báo).
- **Security & Docs:** Helmet, CORS, Swagger UI (`/docs`), `AdminKeyGuard` (`x-admin-key`), `RateLimitGuard` (in-memory sliding window).
- **Infrastructure & Proxy:** [Docker](https://www.docker.com/), Docker Compose, [Nginx](https://nginx.org/) (Reverse Proxy serving client static assets on port 8080, proxy `/api/` và `/uploads/`).
- **CI/CD:** GitHub Actions (Oxlint, 55 Unit Tests, Prisma Migrate Deploy + E2E PostGIS tests, Docker build & SSH deploy).

---

## 3. Kiến trúc hệ thống (3-Tier Architecture)

Toàn bộ các module trong `backend/src/` tuân thủ nghiêm ngặt mô hình 3 lớp phân tách trách nhiệm:

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT (Web / Mobile)                │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP Request (JSON)
                            ▼
┌────────────────────────────────────────────────────────┐
│ 1. PRESENTATION LAYER (Controllers & DTOs)             │
│    - Xử lý Routing, HTTP Status Code, CORS             │
│    - Validation Pipe lọc dữ liệu đầu vào bằng DTO      │
│    - Guards kiểm soát quyền truy cập & Rate Limiting   │
└───────────────────────────┬────────────────────────────┘
                            │ Method Call
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. BUSINESS LOGIC LAYER (Services)                     │
│    - Triển khai nghiệp vụ của 9 Use Cases              │
│    - Thuật toán Hysteresis 1.0x / 1.5x chống phát lặp  │
│    - Xử lý ngữ cảnh tri thức cho Chatbot (RAG)         │
│    - Tính toán thời gian đi bộ và thời lượng lộ trình  │
└───────────────────────────┬────────────────────────────┘
                            │ Method Call
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. DATA ACCESS LAYER (Repositories)                    │
│    - Tách biệt hoàn toàn việc truy xuất cơ sở dữ liệu  │
│    - Thực thi truy vấn không gian PostGIS ($queryRaw)  │
│    - Cơ chế Hybrid Fallback tự động về Haversine       │
│    - Tương tác với PostgreSQL qua Prisma ORM           │
└───────────────────────────┬────────────────────────────┘
                            │ SQL / PostGIS
                            ▼
┌────────────────────────────────────────────────────────┐
│ DATABASE: PostgreSQL 16 + PostGIS 3.4                  │
└────────────────────────────────────────────────────────┘
```

---

## 4. Danh sách 9 Use Cases cốt lõi

1. **UC1: Quét QR cấp vé vào thẳng Tour (`AccessPass`)**  
   Khách quét QR tại cổng hoặc di tích để nhận mã `access_pass` có thời hạn (mặc định 24h hoặc 30 ngày cho demo), tự động nạp gói dữ liệu tour mà không hiển thị bảng giá hay yêu cầu đăng ký tài khoản.
2. **UC2: Tự động thuyết minh theo vị trí GPS (`Geofence & Hysteresis`)**  
   Tự động phát âm thanh khi du khách đi vào bán kính kích hoạt (`distanceM <= 1.0 * activationRadius`). Áp dụng ngưỡng Hysteresis: chỉ reset trạng thái phát khi du khách rời xa khỏi bán kính tối thiểu `1.5 * activationRadius`. Khi phát hiện điểm di tích mới, giao diện hiển thị thông báo đếm ngược 3 giây trước khi tự động chuyển bài thuyết minh.
3. **UC3: Quản trị POI, đa ngôn ngữ & Upload Audio (`Admin Dashboard`)**  
   Quản trị viên dùng header `x-admin-key` (`ADMIN_API_KEY`) để CRUD POI, kiểm soát trạng thái (`DRAFT` / `PUBLISHED`), biên tập thuyết minh 20 ngôn ngữ (`PUT /api/admin/pois/:id/narrations`) và upload trực tiếp file âm thanh (`.mp3`, `.wav`, `.ogg`, `.m4a`, tối đa 15MB) qua `POST /api/admin/upload-audio` hoặc `POST /api/admin/pois/:id/audio`. File được lưu tại `backend/uploads/audio/`, phục vụ tĩnh qua `/uploads/audio/*`, tự động gắn vào `Narration` và ghi nhận `AuditEvent`.
4. **UC4: Hỏi đáp AI Guide dựa trên nội dung POI đã duyệt (`Gemini 2.5 Flash RAG & Rate Limit`)**  
   Trợ lý ảo tìm kiếm tri thức từ các POI đã duyệt (`findPublishedForKnowledge`), hỗ trợ khớp tiếng Việt có dấu và không dấu (`normalizeText`). Khi cấu hình `GEMINI_API_KEY`, hệ thống gọi **Google Gemini 2.5 Flash REST API** (`provider: 'gemini-rag'`) để tổng hợp câu trả lời tự nhiên kèm trích dẫn `references`; nếu thiếu key hoặc lỗi/timeout API sẽ tự động fallback an toàn về `provider: 'knowledge-grounded'`. Endpoint được bảo vệ bởi `RateLimitGuard` (20 request/phút).
5. **UC5: Thuyết minh thủ công khi chạm POI trên bản đồ (`mode: MANUAL`)**  
   Cho phép du khách chủ động bấm chọn điểm trên bản đồ hoặc danh sách để xem thông tin chi tiết và phát audio theo ngôn ngữ tùy chọn mà không phụ thuộc vào GPS. Ghi nhận nhật ký nghe với chế độ `MANUAL`.
6. **UC6: Gợi ý & tùy chỉnh lộ trình tham quan cá nhân (`Tour Planning`)**  
   Hiển thị các tour gợi ý theo chủ đề và cung cấp tính năng tự lập lộ trình cá nhân (`/api/tours/plan`). Tự động tính toán tổng khoảng cách di chuyển, thời gian đi bộ dựa trên tốc độ và tổng thời lượng nghe audio.
7. **UC7: Dashboard thống kê lượt nghe & Telemetry du khách theo thời gian thực**  
   Theo dõi tổng lượt nghe, tỷ lệ nghe tự động GPS (`AUTO`) so với bấm tay (`MANUAL`), phân bổ theo ngôn ngữ, top điểm di tích được nghe nhiều nhất, danh sách phiên nghe trực tiếp (`ListeningSession`) và radar giám sát du khách đang online (`VisitorSession`).
8. **UC8: Tải gói dữ liệu Tour ngoại tuyến (`GET /api/tours/:id/package`)**  
   Cho phép ứng dụng tải toàn bộ thông tin Tour, danh sách các điểm dừng (Stops), chi tiết POI và nội dung thuyết minh/audio theo ngôn ngữ chỉ định để lưu trữ vào LocalStorage/IndexedDB phục vụ nghe ngoại tuyến khi mất sóng 4G/GPS.
9. **UC9: Kiểm tra sức khỏe hệ thống thời gian thực (`GET /health`)**  
   Endpoint giám sát dành riêng cho Docker Healthcheck và CI/CD probe. Kiểm tra kết nối cơ sở dữ liệu thực tế bằng truy vấn `SELECT 1` qua Prisma, trả về `{ status: 'ok', database: 'connected', timestamp, uptime }` mà không làm sập tiến trình khi DB gặp sự cố.

---

## 5. Hướng dẫn cài đặt & Khởi chạy

### Cách 1: Chạy toàn bộ hệ thống bằng Docker Compose (Khuyên dùng)

Yêu cầu máy đã cài Docker Desktop. Tại thư mục gốc của dự án:

```bash
# 1. Khởi động PostgreSQL PostGIS, Backend NestJS và Frontend Nginx
docker compose up --build -d

# 2. Kiểm tra trạng thái các container
docker compose ps
```

Các cổng truy cập:
- **Giao diện Du khách:** `http://localhost:8080/index.html`
- **Trang Tạo mã QR di tích:** `http://localhost:8080/qr.html`
- **Trang Quản trị Admin:** `http://localhost:8080/admin.html` (Khóa quản trị mặc định: `local-admin-key-change-me`)
- **Tài liệu Swagger API:** `http://localhost:3000/docs`
- **Kiểm tra Healthcheck:** `http://localhost:3000/health`

---

### Cách 2: Chạy Local Development (Backend)

Yêu cầu: Node.js >= 20, PostgreSQL >= 16.

```bash
# 1. Di chuyển vào thư mục backend
cd backend

# 2. Cài đặt các gói phụ thuộc
npm ci

# 3. Cấu hình biến môi trường
cp .env.example .env
# Cấu hình trong .env:
# - DATABASE_URL: chuỗi kết nối PostgreSQL / PostGIS
# - ADMIN_API_KEY: khóa bảo vệ các API quản trị (header x-admin-key)
# - GEMINI_API_KEY: (tùy chọn) API key cho Chatbot Gemini 2.5 Flash RAG

# 4. Sinh Prisma Client & Đẩy schema vào DB
npm run prisma:generate
npm run db:push

# 5. Nạp dữ liệu mẫu (Seed 13 POI Sài Gòn & Chùa Linh Ứng, 3 Tour, 20 ngôn ngữ, QR, AccessPass & thống kê UC7)
npm run db:seed

# 6. Khởi chạy server ở chế độ Development (Hot-reload)
npm run start:dev
```

---

## 6. Lệnh kiểm thử & Đảm bảo chất lượng mã nguồn

Hệ thống được thiết lập sẵn bộ công cụ kiểm tra tự động trước khi commit:

```bash
# Di chuyển vào thư mục backend
cd backend

# 1. Kiểm tra lỗi cú pháp và kiểu dữ liệu với Oxlint (Yêu cầu 0 lỗi, 0 cảnh báo)
npm run lint

# 2. Chạy toàn bộ 9 bộ kiểm thử tự động với Vitest (55 Unit Tests PASS)
npm run test

# 3. Chạy kiểm thử tích hợp E2E với PostGIS (cần TEST_DATABASE_URL chứa 'test' và RUN_INTEGRATION_TESTS=true)
npm run test:e2e

# 4. Biên dịch TypeScript sang JavaScript trong thư mục dist/
npm run build
```

---

## 7. Tài liệu phân công nhiệm vụ chi tiết

Nội dung phân chia công việc kỹ thuật cho từng thành viên được lưu tại thư mục `docs/tasks/`:
- **Lê Tấn Phát (Lead):** `docs/tasks/task-tan-phat.md`
- **Trần Lê Trung (Dev):** `docs/tasks/task-trung.md`
- **Như Phát (Dev):** `docs/tasks/task-nhu-phat.md`