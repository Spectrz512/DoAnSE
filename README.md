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