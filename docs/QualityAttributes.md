# Các thuộc tính chất lượng

## Dễ bảo trì

- Mỗi use case nằm trong một module NestJS độc lập; controller chỉ xử lý HTTP, service chứa nghiệp vụ, repository chỉ truy cập dữ liệu.
- DTO là hợp đồng đầu vào có validation; Swagger là tài liệu API được sinh cùng mã nguồn.
- Migration Prisma được version-control; seed giúp mọi người có cùng dữ liệu demo.
- CI bắt buộc lint, test và build trước khi tạo Docker image.

## Dễ sử dụng

- Luồng khách chỉ cần QR → `POST /access-passes/activate` → client nhận toàn bộ POI/audio theo ngôn ngữ đã chọn.
- Khi GPS không khả dụng, client vẫn nhận route package và có thể hiển thị danh sách/nút phát thủ công.
- `GET /health` hỗ trợ vận hành; Swagger tại `/docs` giúp frontend và QA thử API không cần đọc mã nguồn.

## Khả năng mở rộng

- `AccessPass` tách khỏi thanh toán: payment provider chỉ cần kích hoạt pass sau webhook thành công.
- `VisitEvent` là điểm tích hợp analytics/monitoring; không phải sửa POI hoặc session khi thêm dashboard.
- Bản dịch nằm ở `PoiTranslation`, nên thêm ngôn ngữ không đổi schema POI.
- Khi số POI tăng, có thể thêm cột geography/GIST index PostGIS mà API service không đổi.

## Tái sử dụng

- `PoiRepository.findNearby` có thể tái sử dụng cho map, geofence, gợi ý route và chatbot theo vị trí.
- Access pass là một module độc lập, tái dùng cho QR miễn phí, vé trả phí, vé offline hoặc tour đối tác.
- Cùng route package phục vụ PWA, mobile app và kiosk mà không sao chép nghiệp vụ.
