# Kiến trúc backend — Hồ Chí Minh GPS Guide

## 1. Quyết định kiến trúc cho MVP

Hệ thống xây dựng trên nền tảng **NestJS**, **PostgreSQL (kèm PostGIS)** và **Prisma ORM**. Hệ thống tuân thủ chặt chẽ kiến trúc 3 lớp (3-Tier Architecture) được mô-đun hóa:

| Lớp | Trách nhiệm | Thành phần trong mã |
|---|---|---|
| **Presentation Layer** | Tiếp nhận HTTP/REST, xác thực DTO, phân quyền (Guards), chuẩn hóa mã HTTP response. | `*.controller.ts`, `dto/` |
| **Business Logic Layer** | Xử lý quy tắc nghiệp vụ, điều phối Use Case, giải thuật geofence, logic chống phát lặp. | `*.service.ts` |
| **Data Access Layer** | Thực hiện truy vấn/ghi dữ liệu, bọc các truy vấn PostGIS thuần, không chứa mã HTTP. | `*.repository.ts`, Prisma Client |

Luồng dữ liệu chuẩn: `Client Request → Controller → Service → Repository → PostgreSQL/PostGIS`.

## 2. Geofence, Đồng bộ dữ liệu & Chống phát lặp

- **Chiến lược Geofencing:**
  - *Chế độ theo Tour (Khuyên dùng):* Sau khi kích hoạt vé, Client gọi `GET /api/v1/tours/:id/package` để tải trọn gói dữ liệu POI. Toàn bộ việc tính toán khoảng cách và kích hoạt thuyết minh được thực hiện **cục bộ trên Client** nhằm tiết kiệm pin, băng thông và hạn chế gọi API liên tục.
  - *Chế độ Khám phá tự do (Online):* Client gửi vị trí định kỳ tới `GET /api/v1/pois/nearby`. Tầng Service lọc các POI published trong bán kính tìm kiếm.
- **Cơ chế Hysteresis (Chống phát lặp / Chống rung GPS):** Client giữ danh sách `playedPoiIds` trong phiên. POI chỉ được đưa vào trạng thái sẵn sàng phát tự động lần tiếp theo khi người dùng di chuyển ra xa tối thiểu **1.5 lần `triggerRadiusM`**.
- **Tối ưu hóa PostGIS:** Sử dụng `ST_DWithin` và `ST_DistanceSphere` qua `prisma.$queryRaw`. Các bảng chứa vị trí địa lý được đánh chỉ mục không gian (Spatial GIST Index) trên kiểu dữ liệu `geography(Point, 4326)` để đảm bảo độ trễ truy vấn thấp khi dữ liệu tăng trưởng.

## 3. Quản lý Tệp tĩnh & Media Streaming

- **Lưu trữ:** Ở giai đoạn MVP, file âm thanh thuyết minh (.mp3) và hình ảnh được lưu trữ tại Local Directory, phục vụ trực tiếp qua Nginx Static Cache hoặc NestJS ServeStatic.
- **Trừu tượng hóa (Abstraction):** Tầng Service tương tác với tệp thông qua `StorageService` interface, cho phép dễ dàng chuyển đổi sang Object Storage (MinIO / AWS S3) trong tương lai mà không phải sửa logic nghiệp vụ.
- **Streaming:** Máy chủ web hỗ trợ HTTP Range Requests (`206 Partial Content`) để du khách có thể tua hoặc phát mượt mà trên thiết bị di động.

## 4. Bảo mật, Quyền riêng tư & Phục hồi

- Xác thực Admin bằng JWT; mật khẩu quản trị được băm bằng `bcrypt`.
- Không lưu vết lịch sử GPS thô (raw telemetry) của người dùng để bảo vệ quyền riêng tư; chỉ ghi nhận các sự kiện nghe (`ListeningEvent`: POI ID, chế độ AUTO/MANUAL, thời lượng) phục vụ thống kê.
- Xử lý lỗi linh hoạt (Graceful Degradation): Nếu GPS mất tín hiệu hoặc module AI/TTS bị lỗi mạng, Client tự động chuyển về chế độ phát thủ công (Fallback).

## 5. Quy trình Tích hợp và Triển khai Liên tục (CI/CD)

Pipeline được tự động hóa qua GitHub Actions:
1. **CI (Kiểm tra chất lượng):**
   - Linting & Formatting (`eslint`, `prettier`).
   - Kiểm tra tính hợp lệ của Prisma Schema (`prisma validate`).
   - Chạy bộ kiểm thử tự động (Unit Test cho các Service tính toán khoảng cách và logic vé).
   - Kiểm tra biên dịch TypeScript (`nest build`).
2. **CD (Triển khai):**
   - Đóng gói Docker Image ứng dụng.
   - Chạy lệnh migration cơ sở dữ liệu (`prisma migrate deploy`).
   - Khởi động lại container phía sau Nginx Reverse Proxy mà không làm gián đoạn các kết nối đang nghe audio.

## 6. Lộ trình phát triển Module

1. Core POIs + Translations + Tour Routing + Access Pass/QR.
2. Quản trị Media Streaming và Cơ chế Tải gói Tour ngoại tuyến (Offline Pack).
3. Telemetry Event Analytics, Health Check (`/health`), Dashboard Quản trị.
4. Tích hợp AI Guide RAG: Nội dung POI đã duyệt → Embeddings Vector Store → Trợ lý giải đáp có trích dẫn nguồn.
5. Cổng thanh toán (Payment Webhook) và Tự động hóa sinh giọng nói (TTS Service).