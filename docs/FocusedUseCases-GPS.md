# Focused Use Cases — Linh Ứng GPS Guide

| Use Case Number | UC1 |
|---|---|
| Use Case Name | Kích hoạt và truy cập tour qua QR |
| Actor(s) | Du khách, cổng thanh toán |
| Maturity | Focused |
| Summary | Du khách quét QR, thanh toán hoặc xác thực vé để tạo phiên tham quan. |
| Preconditions | QR tour hợp lệ; tour đã published. |
| Postconditions | Client nhận access pass và bộ dữ liệu tour phù hợp. |

**Basic course of events**

1. Du khách quét QR tại cổng.
2. Hệ thống hiển thị tour, giá và ngôn ngữ mặc định.
3. Du khách thanh toán hoặc nhân viên xác nhận vé offline.
4. Hệ thống xác nhận giao dịch và tạo access pass có hạn dùng.
5. Ứng dụng tải gói POI/tuyến/nội dung của tour một lần; tour bắt đầu.

| Use Case Number | UC2 |
|---|---|
| Use Case Name | Tự động thuyết minh POI theo GPS |
| Actor(s) | Du khách, dịch vụ vị trí của thiết bị |
| Maturity | Focused |
| Summary | Ứng dụng phát audio đúng ngôn ngữ khi du khách vào vùng của một POI. |
| Preconditions | Access pass hợp lệ; người dùng đã cấp quyền vị trí; dữ liệu tour đã tải. |
| Postconditions | POI được đánh dấu đã phát trong phiên. |

**Basic course of events**

1. Thiết bị gửi/cập nhật vị trí.
2. Client tính khoảng cách đến các POI tải sẵn hoặc gọi `GET /pois/nearby` khi cần làm mới.
3. Nếu vào `triggerRadiusM` của POI chưa phát, client hiển thị thẻ POI và phát audio.
4. Du khách có thể pause, phát lại, đổi ngôn ngữ hoặc mở mô tả.
5. Client đánh dấu POI đã phát; chỉ cho phát tự động lần nữa sau khi người dùng rời vùng reset.

**Alternative paths:** GPS bị từ chối/mất tín hiệu → hiển thị bản đồ và nút phát thủ công. Audio lỗi → vẫn hiển thị văn bản và nút thử lại.

| Use Case Number | UC3 |
|---|---|
| Use Case Name | Quản trị POI đa ngôn ngữ |
| Actor(s) | Admin, nhân viên nội dung |
| Maturity | Focused |
| Summary | Nhân viên tạo/sửa POI, bán kính trigger, bản dịch và file audio trước khi publish. |
| Preconditions | Người dùng đăng nhập vai trò được cấp quyền. |
| Postconditions | POI draft/published được lưu với audit event. |

| Use Case Number | UC4 |
|---|---|
| Use Case Name | Hỏi đáp hướng dẫn viên AI |
| Actor(s) | Du khách |
| Maturity | Focused |
| Summary | Du khách đặt câu hỏi và nhận câu trả lời dựa trên nội dung POI đã được duyệt. |
| Preconditions | Access pass hợp lệ; kho tri thức đã lập chỉ mục. |
| Postconditions | Câu trả lời kèm trích dẫn nguồn; không đủ dữ kiện thì hệ thống nói rõ không biết. |

| Use Case Number | UC5 |
|---|---|
| Use Case Name | Thuyết minh thủ công khi chạm vào POI trên bản đồ |
| Actor(s) | Du khách |
| Maturity | Focused |
| Summary | Du khách chạm vào điểm POI trên bản đồ hoặc danh sách để xem thông tin chi tiết và phát thuyết minh (audio/text) theo ngôn ngữ tùy chọn mà không phụ thuộc vào vị trí GPS. |
| Preconditions | Dữ liệu POI đã tải; ứng dụng đang mở trong phiên tham quan. |
| Postconditions | Audio thuyết minh được phát, thông tin POI hiển thị đầy đủ và ghi nhận sự kiện nghe thủ công (MANUAL). |

**Basic course of events**

1. Du khách duyệt bản đồ hoặc danh sách địa điểm và chạm vào một POI bất kỳ.
2. Hệ thống hiển thị thẻ chi tiết POI gồm: tên, hình ảnh, văn bản thuyết minh, thời lượng và trình phát audio.
3. Du khách chọn ngôn ngữ mong muốn trong danh mục hỗ trợ (nếu muốn thay đổi so với ngôn ngữ mặc định).
4. Du khách nhấn nút "Phát thuyết minh" (Play).
5. Hệ thống tải và phát tệp âm thanh (hoặc TTS), hiển thị thanh tiến trình và hiệu ứng sóng âm (visualizer).
6. Hệ thống gửi sự kiện nghe thủ công (`mode: MANUAL`) kèm mã POI và ngôn ngữ về máy chủ.

**Alternative paths:** Tệp âm thanh gặp lỗi mạng → Hệ thống hiển thị đầy đủ nội dung văn bản kèm nút thử lại hoặc kích hoạt TTS dự phòng trên trình duyệt.

| Use Case Number | UC6 |
|---|---|
| Use Case Name | Gợi ý và tùy chỉnh lộ trình tham quan |
| Actor(s) | Du khách |
| Maturity | Focused |
| Summary | Du khách xem các tuyến tour gợi ý có sẵn từ hệ thống hoặc tự tạo, sắp xếp danh sách các điểm POI yêu thích thành lộ trình tham quan riêng với ước tính thời gian hoàn thành. |
| Preconditions | Ứng dụng đã tải danh mục POI và danh sách tour mẫu. |
| Postconditions | Lộ trình tham quan cá nhân được tạo và lưu trữ trên phiên làm việc của thiết bị. |

**Basic course of events**

1. Du khách mở mục "Lộ trình tham quan" (Tours).
2. Hệ thống hiển thị các tour gợi ý (ví dụ: Tour Toàn cảnh, Tour Tâm linh) với tổng thời lượng ước tính và các điểm dừng (stops).
3. Du khách chọn một tour có sẵn hoặc nhấn "Tạo tour cá nhân".
4. Đối với tour cá nhân: Du khách chọn thêm các điểm POI từ bản đồ/danh sách vào hành trình, sắp xếp lại thứ tự ưu tiên hoặc xóa bớt điểm dừng.
5. Hệ thống tự động tính toán tổng thời gian dự kiến (dựa trên số lượng POI và thời lượng nghe) và hiển thị lộ trình trực quan trên bản đồ.
6. Du khách bấm "Bắt đầu tour" để hệ thống dẫn đường tuần tự qua từng điểm.

**Alternative paths:** Du khách muốn làm mới hành trình → Bấm "Xóa tour" để reset danh sách và quay về chế độ khám phá tự do.

| Use Case Number | UC7 |
|---|---|
| Use Case Name | Xem bảng điều khiển giám sát và thống kê lượt nghe theo thời gian thực |
| Actor(s) | Quản trị viên (Admin) |
| Maturity | Focused |
| Summary | Quản trị viên truy cập bảng điều khiển để theo dõi các chỉ số vận hành gồm tổng POI, tổng lượt nghe, phân bổ theo chế độ phát (AUTO vs MANUAL), tỉ lệ ngôn ngữ và danh sách sự kiện gần nhất. |
| Preconditions | Quản trị viên đã xác thực với Admin Key hợp lệ. |
| Postconditions | Dữ liệu thống kê tổng hợp và chuỗi sự kiện được tải và trực quan hóa trên giao diện quản trị. |

**Basic course of events**

1. Quản trị viên truy cập trang quản trị (`admin.html`) với Admin Key hợp lệ.
2. Quản trị viên chuyển tới mục "Bảng điều khiển & Thống kê" (Dashboard/Stats).
3. Hệ thống gửi yêu cầu xác thực tới máy chủ (`GET /api/admin/stats` và `GET /api/listening-events`).
4. Máy chủ tổng hợp dữ liệu từ cơ sở dữ liệu: tổng số POI, tổng lượt nghe, tỷ lệ nghe tự động qua GPS so với bấm thủ công, top POI được nghe nhiều nhất và phân bổ ngôn ngữ du khách sử dụng.
5. Giao diện hiển thị các thẻ chỉ số KPI cùng bảng nhật ký sự kiện nghe (listening events) theo thời gian thực.
6. Quản trị viên có thể bấm nút "Làm mới dữ liệu" để cập nhật số liệu mới nhất.

**Alternative paths:** Admin Key không hợp lệ hoặc hết hạn → Hệ thống từ chối yêu cầu (HTTP 401/403) và thông báo yêu cầu nhập lại khóa quản trị.


