# Kiến trúc backend — Hồ Chí Minh GPS Guide

## Quyết định cho MVP

API dùng NestJS, PostgreSQL/PostGIS và Prisma. Hệ thống tách theo ba lớp trong từng module:

| Lớp | Trách nhiệm | Ví dụ trong mã |
|---|---|---|
| Presentation | HTTP, DTO, xác thực, mã trạng thái | `poi.controller.ts`, `dto/` |
| Business | Quy tắc nghiệp vụ, điều phối use case | `poi.service.ts` |
| Data access | Truy vấn/ghi dữ liệu, không chứa HTTP | `poi.repository.ts`, Prisma |

Luồng gọi: `Controller → Service → Repository → PostgreSQL/PostGIS`.

## Geofence và chống phát lặp

Client gửi vị trí hiện tại tới `GET /api/v1/pois/nearby`. API chỉ trả POI published nằm trong `radiusM`; client sẽ tự quyết định phát audio khi khoảng cách nhỏ hơn `triggerRadiusM`. Để không phát liên tục, client phải giữ `playedPoiIds` trong phiên và chỉ mở lại sau khi rời bán kính tối thiểu 1.5 lần `triggerRadiusM`. Việc này tránh gọi API liên tục và tuân theo PRD: dữ liệu tour được tải một lần sau khi mở phiên.

PostGIS được dùng qua `ST_DWithin`/`ST_DistanceSphere`; khi số POI lớn, migration tiếp theo sẽ thêm cột `geography(Point,4326)` có GIST index. MVP giữ latitude/longitude rõ ràng để người mới dễ quản trị và kiểm thử.

## Bảo mật và dữ liệu cá nhân

- JWT bảo vệ API tạo POI; mật khẩu được bcrypt hash.
- Không lưu lịch sử vị trí thô ở MVP. Chỉ lưu event ẩn danh khi người dùng đồng ý analytics.
- Audio và hình ảnh cần đặt trong object storage/CDN ở giai đoạn triển khai.

## Lộ trình module

1. Hoàn tất POI + translations + geofence, tour route và access pass/QR (đã khởi tạo).
2. Payment webhook.
3. Hàng đợi dịch/TTS, object storage và cache Redis.
4. RAG: nội dung đã duyệt → chunks/embeddings → chatbot có trích dẫn nguồn.
5. Event analytics, health check, dashboard monitoring.

