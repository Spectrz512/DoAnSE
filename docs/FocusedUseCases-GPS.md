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

