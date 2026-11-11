# Các thuộc tính chất lượng phần mềm

## 1. Dễ bảo trì (Maintainability)

- **Kiến trúc mô-đun hóa:** Mỗi nghiệp vụ nằm trong một NestJS Module riêng biệt; tuân thủ nghiêm ngặt nguyên lý Single Responsibility (Controller chỉ đón HTTP, Service xử lý logic, Repository thao tác database).
- **Hợp đồng dữ liệu minh bạch:** Sử dụng DTO kết hợp `class-validator` để kiểm soát dữ liệu đầu vào; tài liệu Swagger/OpenAPI được sinh tự động tại `/docs`.
- **Quản lý CSDL có phiên bản:** Toàn bộ thay đổi CSDL được quản lý bằng Prisma Migrations; cung cấp script `seed` chuẩn hóa để môi trường dev/test luôn đồng nhất.
- **Tự động hóa kiểm soát:** Pipeline CI kiểm tra linting, unit test và build trước khi cho phép merge code vào nhánh chính.

## 2. Hiệu năng & Độ trễ thấp (Performance & Latency)

- **Tối ưu hóa truy vấn không gian:** Sử dụng PostGIS Spatial Index (GIST) trên tọa độ điểm (SRID 4326), giúp việc tìm kiếm địa điểm lân cận đạt độ phức tạp $O(\log N)$ thay vì quét toàn bộ bảng.
- **Giảm tải cho Backend:** Hỗ trợ tải gói dữ liệu Tour một lần (`GET /package`); Client tự tính toán khoảng cách GPS cục bộ, triệt tiêu việc ping API liên tục khi di chuyển.
- **Truy xuất media độc lập:** Các tệp âm thanh tĩnh được cấu hình phục vụ qua Web Server (Nginx) hỗ trợ HTTP Range Request, không làm nghẽn luồng xử lý I/O của ứng dụng NestJS.

## 3. Độ tin cậy & Chống chịu lỗi (Reliability & Resilience)

- **Cơ chế Hysteresis chống rung GPS:** Sử dụng quy tắc giãn cách ngưỡng kích hoạt (vào $\le 1.0 \times$ bán kính, ra $\ge 1.5 \times$ mới reset) để ngăn hiện tượng âm thanh bị ngắt/phát lặp khi GPS trôi ở ranh giới POI.
- **Hoạt động khi mất mạng (Offline Capable):** Du khách có thể tải trước gói tham quan để sử dụng toàn bộ tính năng định vị và nghe thuyết minh ngay cả khi mất sóng 3G/4G.
- **Chế độ suy giảm linh hoạt (Graceful Degradation):** Nếu GPS mất tín hiệu hoặc gặp sự cố, hệ thống luôn có phương án dự phòng hiển thị danh sách để phát thủ công.
- **Giám sát sức khỏe:** Cung cấp endpoint `GET /health` kiểm tra kết nối DB và trạng thái tài nguyên, tích hợp trực tiếp vào hệ sinh thái CI/CD để tự động phát hiện lỗi triển khai.

## 4. Khả năng mở rộng (Scalability)

- **Tách rời thẩm quyền vé và thanh toán:** Thực thể `AccessPass` độc lập với phương thức thanh toán; dễ dàng tích hợp thêm VNPay, MoMo hoặc tạo mã kích hoạt offline cho quầy vé truyền thống.
- **Mở rộng đa ngôn ngữ không phá vỡ cấu trúc:** Bảng dịch `PoiTranslation` lưu trữ độc lập theo mã ngôn ngữ (`locale`), cho phép bổ sung thêm nhiều thứ tiếng mà không phải thay đổi bảng `Poi` gốc.
- **Thu thập sự kiện độc lập:** Thực thể `ListeningEvent` tách rời khỏi dữ liệu nghiệp vụ chính, dễ dàng tối ưu hóa chỉ mục theo thời gian hoặc chuyển sang cơ chế hàng đợi (Queue/Message Broker) khi lượng người dùng tăng cao.

## 5. Khả năng tái sử dụng (Reusability)

- **Tầng DAO dùng chung:** Phương thức tìm kiếm địa lý `PoiRepository.findNearby` phục vụ đa mục đích: hiển thị bản đồ, tính toán Geofence, gợi ý lộ trình và làm ngữ cảnh cho AI Chatbot.
- **Đóng gói phân phối đa nền tảng:** Gói dữ liệu tour chuẩn hóa JSON có thể tái sử dụng cho PWA, Mobile App (React Native/Flutter) hoặc trạm Kiosk thông tin công cộng.