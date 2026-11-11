<<<<<<< HEAD
# GPS Chùa Linh Ứng – Thuyết minh tự động đa ngôn ngữ

Backend cho ứng dụng hướng dẫn tham quan: du khách quét mã QR, mở web (không cần tài khoản), nghe thuyết minh theo ngôn ngữ mình chọn và được tự động phát khi đến gần điểm tham quan (GPS).

> Đồ án môn **Công nghệ phần mềm** – trọng tâm: **BE Dev theo hướng 3 lớp, bao gồm CI/CD**.

## Tính năng

- Kích hoạt phiên tham quan bằng mã QR (Access Pass), không cần đăng nhập.
- Thuyết minh đa ngôn ngữ (`vi`, `en`, `ko`, `ja`, `zh`) cho từng điểm tham quan (POI).
- Tự động gợi ý phát thuyết minh theo GPS (geofence), chống phát lặp; phát thủ công khi chạm vào POI.
- Tour gợi ý và lập tour cá nhân, ước tính quãng đường và thời gian.
- Ghi nhận lượt nghe (`AUTO`/`MANUAL`) ẩn danh theo `visitorId`, theo dõi phiên đang hoạt động.
- Quản trị POI, thuyết minh, trạng thái `DRAFT`/`PUBLISHED`, thống kê và audit log.
- Chatbot hướng dẫn viên (hiện là bản placeholder).

## Luồng hoạt động

```mermaid
flowchart LR
  A[Du khách quét QR] --> B[POST /api/access-passes/activate]
  B --> C[Nhận gói tour, POI và thuyết minh theo ngôn ngữ]
  C --> D{Vị trí GPS}
  D -->|Vào bán kính POI| E[Tự động phát thuyết minh]
  D -->|Chạm POI trên bản đồ| F[Phát thủ công]
  E --> G[POST /api/listening-events]
  F --> G
  H[Admin] -->|x-admin-key| I[Quản lý POI, thuyết minh, thống kê]
```

1. Du khách quét QR và gửi mã tới `POST /api/access-passes/activate`. Server kiểm tra hạn dùng và trạng thái, trả về gói tour, POI và thuyết minh theo ngôn ngữ đã chọn.
2. Client lấy vị trí và gọi `GET /api/pois/nearby` hoặc `GET /api/geo/trigger-candidates`. Server tính khoảng cách (haversine), lọc POI trong bán kính kích hoạt, sắp xếp theo `priority`.
3. POI đã phát chỉ được mở lại khi người dùng rời xa tối thiểu 1,5 lần bán kính kích hoạt.
4. Client gửi sự kiện nghe (`POST /api/listening-events`) và `heartbeat` để admin theo dõi.

## Kiến trúc 3 lớp

Mỗi module trong `backend/src` tách theo ba lớp:

| Lớp | Trách nhiệm | Ví dụ |
|---|---|---|
| Controller (Presentation) | Nhận HTTP, validate DTO, trả response | `poi.controller.ts`, `dto.ts` |
| Service (Business) | Quy tắc nghiệp vụ, điều phối use case | `poi.service.ts` |
| Repository (Data access) | Truy vấn/ghi dữ liệu qua Prisma | `poi.repository.ts` |

Luồng gọi: `Controller → Service → Repository → PrismaService → PostgreSQL`.

## Công nghệ

- **Backend:** NestJS 12, TypeScript, class-validator
- **DB:** PostgreSQL 16, Prisma 7 (driver adapter `pg`)
- **Test/Lint:** Vitest, Supertest, oxlint, Prettier
- **DevOps:** Docker, Docker Compose, GitHub Actions, Docker Hub
- **Demo web:** HTML/JS tĩnh, phục vụ bằng nginx

## Cấu trúc thư mục

```
.
├── .github/workflows/ci-cd.yml   # CI/CD
├── backend/
│   ├── prisma/                   # schema, migrations, seed
│   ├── src/
│   │   ├── access-pass/  admin/  chatbot/  geo/
│   │   ├── listening/    poi/    tour/     translation/
│   │   ├── auth/  config/  database/
│   │   └── main.ts  app.module.ts
│   ├── test/                     # unit test + e2e
│   └── Dockerfile
├── demo/                         # giao diện demo (index, admin, qr)
├── docs/                         # Architecture, Use Cases, Quality Attributes
└── docker-compose.yml
```

## Chạy nhanh bằng Docker

Yêu cầu: Docker Desktop.

```bash
git clone git@github.com:Spectrz512/DoAnSE.git
cd DoAnSE
docker compose up --build
```

- API: http://localhost:3000/api/health
- Giao diện demo: http://localhost:8080
- PostgreSQL: `localhost:5432` (user/password `postgres`, DB `linh_ung`)

Khi khởi động, container `api` tự tạo bảng và nạp dữ liệu mẫu.

## Chạy local (không Docker cho API)

Yêu cầu: Node.js 20+ và một PostgreSQL đang chạy (có thể dùng `docker compose up -d db`).

```bash
cd backend
cp .env.example .env        # Windows: copy .env.example .env
npm ci
npm run prisma:generate
npm run prisma:migrate
npx tsx prisma/seed.ts      # nạp dữ liệu mẫu
npm run start:dev
```

## Biến môi trường

| Biến | Mô tả | Ví dụ |
|---|---|---|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL | `postgresql://postgres:postgres@localhost:5432/linh_ung?schema=public` |
| `JWT_SECRET` | Khóa bí mật (hiện chưa dùng để xác thực) | `change-this-to-a-long-random-secret` |
| `ADMIN_API_KEY` | Khóa cho API admin (header `x-admin-key`) | `change-this-admin-key` |
| `PORT` | Cổng API | `3000` |
| `CORS_ORIGIN` | Danh sách origin, cách nhau bằng dấu phẩy | `http://localhost:8080` |

Không commit file `.env`. Đặt khóa riêng cho môi trường thật.

## Dữ liệu và tài khoản demo

- Mã Access Pass: `DEMO-2026`
- Khóa admin (chỉ dùng cho local/Docker Compose): `local-admin-key-change-me`
- Dữ liệu mẫu: 13 POI (Chùa Linh Ứng – Đà Nẵng, trung tâm Sài Gòn), 3 tour gợi ý.

## API

Tiền tố `/api`.

**Công khai**

| Method | URL | Mô tả |
|---|---|---|
| GET | `/health` | Kiểm tra hoạt động |
| POST | `/access-passes/activate` | Kích hoạt mã QR, nhận gói tour và thuyết minh |
| GET | `/access-passes/validate/:code` | Kiểm tra mã |
| GET | `/pois`, `/pois/:id`, `/pois/bootstrap` | Danh sách, chi tiết, dữ liệu khởi tạo |
| GET | `/pois/nearby?lat=&lng=&radiusM=&language=&playedPoiIds=` | POI lân cận, trạng thái kích hoạt |
| GET | `/geo/trigger-candidates?lat=&lng=&language=` | POI đủ điều kiện kích hoạt |
| GET | `/languages` | Ngôn ngữ hỗ trợ |
| GET | `/pois/:poiId/narrations?language=` | Thuyết minh của POI |
| GET | `/tours`, `/tours/suggested`, `/tours/:id` | Tour |
| POST | `/tours/plan`, `/tours/custom-route` | Lập tour cá nhân |
| POST | `/listening-events` | Ghi nhận lượt nghe |
| POST | `/listening-events/heartbeat`, `/listening-events/leave` | Phiên du khách |
| POST | `/chatbot/messages` | Hỏi đáp (placeholder) |

**Admin** (header `x-admin-key`)

| Method | URL | Mô tả |
|---|---|---|
| GET | `/admin/stats` | Thống kê tổng hợp |
| GET | `/admin/audit-events` | Nhật ký thao tác |
| POST | `/admin/pois` | Tạo POI |
| PUT | `/admin/pois/:id` | Cập nhật POI |
| PATCH | `/admin/pois/:id/status` | Đổi trạng thái `DRAFT`/`PUBLISHED` |
| DELETE | `/admin/pois/:id` | Xóa POI |
| PUT | `/admin/pois/:id/narrations` | Thêm/sửa thuyết minh theo ngôn ngữ |

## Kiểm thử và chất lượng

```bash
cd backend
npm run lint
npm test               # unit test
npm run test:e2e       # cần RUN_INTEGRATION_TESTS=true và TEST_DATABASE_URL (tên DB chứa "test")
```

## CI/CD

Workflow `.github/workflows/ci-cd.yml`:

1. **continuous-integration** (PR và push vào `main`, `develop`): `npm ci` → `prisma generate` → lint → test → build.
2. **continuous-delivery** (push vào `main`): build image Docker và đẩy lên Docker Hub với tag `latest` và commit SHA.
3. **deploy-production** (khi biến `DEPLOY_ENABLED=true`): SSH vào server, `docker compose pull api` và `up -d api`.

Cần cấu hình trong *Settings → Secrets and variables → Actions*:
`DOCKER_USERNAME`, `DOCKER_PASSWORD`, `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY` và biến `DEPLOY_ENABLED`.

## Quy trình làm việc nhóm

- Không push trực tiếp lên `main`; mỗi việc một nhánh `feature/<tên>` hoặc `fix/<tên>`, mở Pull Request.
- PR cần CI xanh và ít nhất 1 người review trước khi merge.
- Commit theo Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`.

## Hiện trạng và hướng phát triển

- [x] POI, thuyết minh đa ngôn ngữ, geofence, tour, access pass, thống kê admin
- [x] CI/CD với Docker Hub và deploy qua SSH
- [ ] Tự động dịch và sinh giọng nói (TTS) cho thuyết minh
- [ ] Chatbot dựa trên nội dung đã duyệt, có trích dẫn nguồn
- [ ] Xác thực admin bằng JWT, giới hạn tốc độ, Swagger
- [ ] Thanh toán/vé, cache Redis, lưu trữ audio và hình ảnh trên CDN

## Thành viên

| Thành viên | Vai trò |
|---|---|
| `<Tên>` | `<Vai trò>` |
=======
# Hồ Chí Minh GPS Audio Guide – Thuyết minh tự động đa ngôn ngữ

Hệ thống hướng dẫn du lịch âm thanh tự động (Location-based Audio Guide) phục vụ du khách tham quan các di tích lịch sử và văn hóa tại Thành phố Hồ Chí Minh và Chùa Linh Ứng (Đà Nẵng). Ứng dụng hoạt động trực tiếp trên trình duyệt Web (PWA/Mobile Web), không yêu cầu du khách phải đăng nhập hay cài đặt ứng dụng.

---

## 1. Thành viên phát triển

| STT | Họ và tên | Vai trò | Trách nhiệm chính |
|:---:|---|:---:|---|
| 1 | **Lê Tấn Phát** | **Lead** | Hạ tầng, Docker PostGIS, Core Architecture, Routing & Health Check |
| 2 | **Trần Lê Trung** | **Dev** | Chuẩn hóa 3 lớp Translation, Tour Planning & Offline Package (UC8) |
| 3 | **Như Phát** | **Dev** | AI Chatbot RAG tri thức POI, Rate Limiting & E2E Testing |

---

## 2. Tech Stack

- **Backend Framework:** [NestJS](https://nestjs.com/) (Node.js v20/v22, TypeScript ESM).
- **Database & Spatial Engine:** [PostgreSQL 16](https://www.postgresql.org/) kết hợp [PostGIS 3.4](https://postgis.net/) (xử lý truy vấn không gian `ST_DWithin`, `ST_DistanceSphere`).
- **ORM:** [Prisma ORM 7](https://www.prisma.io/) với `@prisma/adapter-pg`.
- **Testing:** [Vitest](https://vitest.dev/) (Unit Tests, Test Spies, Mocking), Supertest (E2E API Integration).
- **Linter & Code Quality:** [Oxlint](https://oxc.rs/) (type-aware linting siêu tốc).
- **Security & Docs:** Helmet, CORS, Swagger UI (`/docs`), Rate Limiting (in-memory sliding window).
- **Infrastructure & Proxy:** [Docker](https://www.docker.com/), Docker Compose, [Nginx](https://nginx.org/) (Reverse Proxy serving client static assets on port 8080).
- **CI/CD:** GitHub Actions (Lint, Vitest, Build, Docker Image build & SSH deploy).

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
3. **UC3: Quản trị POI, đa ngôn ngữ & file audio (`Admin Dashboard`)**  
   Quản trị viên sử dụng `x-admin-key` để quản lý danh mục địa điểm (tọa độ, bán kính, độ ưu tiên), biên tập nội dung thuyết minh đa ngôn ngữ (Việt, Anh, Hàn, Nhật, Trung...), tải file audio và kiểm soát trạng thái xuất bản (`DRAFT` / `PUBLISHED`) có ghi nhật ký kiểm toán (`AuditEvent`).
4. **UC4: Hỏi đáp AI Guide dựa trên nội dung POI đã duyệt (`RAG & Rate Limit`)**  
   Trợ lý ảo hỗ trợ trả lời câu hỏi của khách tham quan dựa trên dữ liệu các POI đã được phê duyệt trong cơ sở dữ liệu (`findPublishedForKnowledge`), đính kèm nguồn trích dẫn (`references`). Endpoint được bảo vệ bằng `RateLimitGuard` giới hạn 20 request/phút để chống spam kỹ thuật.
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
# Chỉnh sửa DATABASE_URL trong .env trỏ về PostgreSQL của bạn

# 4. Sinh Prisma Client & Đẩy schema vào DB
npm run prisma:generate
npm run db:push

# 5. Nạp dữ liệu mẫu (Seed 8 POI Sài Gòn, Chùa Linh Ứng, Tour mẫu, 20 ngôn ngữ)
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

# 2. Chạy toàn bộ 8 bộ kiểm thử tự động với Vitest (41 Unit Tests)
npm run test

# 3. Biên dịch TypeScript sang JavaScript trong thư mục dist/
npm run build
```

---

## 7. Tài liệu phân công nhiệm vụ chi tiết

Nội dung phân chia công việc kỹ thuật cho từng thành viên được lưu tại thư mục [`docs/tasks/`](file:///d:/1_eda/DA_CNPM/docs/tasks/):
- **Lê Tấn Phát (Lead):** [`docs/tasks/task-tan-phat.md`](file:///d:/1_eda/DA_CNPM/docs/tasks/task-tan-phat.md)
- **Trần Lê Trung (Dev):** [`docs/tasks/task-trung.md`](file:///d:/1_eda/DA_CNPM/docs/tasks/task-trung.md)
- **Như Phát (Dev):** [`docs/tasks/task-nhu-phat.md`](file:///d:/1_eda/DA_CNPM/docs/tasks/task-nhu-phat.md)

>>>>>>> b7f808b (docs: cập nhật README chuẩn 3 lớp, tạo bộ file task và dọn dẹp gitignore)
