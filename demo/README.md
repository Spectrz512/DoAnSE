# 📱 Sài Gòn Di Sản – Giao Diện Người Dùng (Frontend Demo)

Thư mục `demo/` chứa toàn bộ mã nguồn giao diện người dùng theo kiến trúc **Progressive Web App (PWA)** siêu nhẹ, viết bằng Vanilla JavaScript (ES6+), HTML5 và CSS3 hiện đại, không phụ thuộc vào framework nặng nề (như React/Angular/Vue), giúp khởi chạy tức thì trên mọi trình duyệt di động mà không cần cài đặt.

---

## 📄 Vai Trò & Mối Liên Kết Giữa Các File

```
                       +-----------------------+
                       |    demo/api-client.js  |
                       | (Trung tâm kết nối API)|
                       +-----------+-----------+
                                   |
        +--------------------------+--------------------------+
        |                          |                          |
        v                          v                          v
+---------------+          +---------------+          +---------------+
|  index.html   |          |    qr.html    |          |   admin.html  |
| (App Du Khách)|          | (Standee Kiosk)|          | (Bảng Quản Trị|
+---------------+          +---------------+          +---------------+
        |                          |                          |
        +--------------------------+--------------------------+
                                   |
                                   v
                       +-----------------------+
                       |    demo/nginx.conf    |
                       | (Reverse Proxy :8080) |
                       +-----------------------+
```

### 1. `demo/index.html` – Ứng Dụng Dành Cho Du Khách
- **Chức năng chính**:
  - Tích hợp bản đồ Leaflet.js hiển thị 13 điểm di tích lịch sử Sài Gòn với vòng hào quang Geofence kích hoạt tự động.
  - Bộ mô phỏng di chuyển (Auto-Walk Simulator) và hỗ trợ GPS vệ tinh thật trên điện thoại.
  - Trình phát âm thanh 3 tầng (File MP3 $\rightarrow$ Backend Cloud TTS Proxy $\rightarrow$ Web Speech API nội bộ) với kịch bản chữ chạy Karaoke đồng bộ.
  - Hỗ trợ đổi giao diện và nội dung tức thì giữa **20 ngôn ngữ quốc tế**.
  - Chatbot Hướng dẫn viên AI Sài Gòn thông minh (Hybrid RAG kết hợp Gemini 2.5 Flash).
  - Quản lý lộ trình 3 Tour chuyên gia gợi ý và danh sách điểm yêu thích cá nhân.
  - Tự động phát nhịp tim ngầm mỗi 12 giây (`sendHeartbeat`) và thông báo rời trang (`sendLeave`) về cho Admin Dashboard.

### 2. `demo/qr.html` – Kiosk In Ấn Mã QR Di Tích
- **Chức năng chính**:
  - Dành cho Ban Quản trị hoặc đơn vị in ấn tạo mã QR Standee đặt tại cổng 13 di tích.
  - Tự động gọi API `/api/system/network-info` để phát hiện địa chỉ IP Wi-Fi LAN thật của máy chủ (ví dụ `192.168.1.6`), **loại bỏ hoàn toàn lỗi trỏ về `localhost`**.
  - Hiển thị trực quan chuỗi URL thực tế ngay bên dưới ảnh mã QR để kiểm tra bằng mắt thường.
  - Cho phép tùy chọn điểm di tích trọng tâm, ngôn ngữ mặc định và tour gắn kèm.
  - Cung cấp nút tải ảnh PNG chất lượng cao và nút in ấn định dạng chuẩn khổ giấy A4.

### 3. `demo/admin.html` – Trung Tâm Giám Sát & Quản Trị Viên
- **Chức năng chính**:
  - **4 phân hệ nghiệp vụ cốt lõi**:
    1. **Analytics Dashboard**: 4 thẻ KPI trọng tâm (Tổng lượt nghe, Du khách online, Tỷ lệ hoàn thành, Ngôn ngữ phổ biến nhất), biểu đồ thời gian thực, bảng nhật ký kiểm toán (Audit Logs) kèm tính năng **Xuất file CSV**.
    2. **Live Radar**: Giám sát phân bổ du khách thực tế xung quanh 13 di tích thời gian thực qua chấm phát xung xanh lá.
    3. **POI Editor & Audio Studio**: Quản lý CRUD 13 địa điểm di tích, đổi trạng thái hoạt động, chỉnh sửa tọa độ GPS và tải lên file âm thanh MP3 thuyết minh cho từng ngôn ngữ.
    4. **QR Print Studio**: Xem trước standee A4 và tạo nhanh mã vé Access Pass có hạn dùng 72 giờ.
  - Bảo vệ các thao tác nhạy cảm bằng `Admin Key` (`x-admin-key`).

### 4. `demo/api-client.js` – Adapter Kết Nối API & Chuẩn Hóa Dữ Liệu
- **Chức năng chính**:
  - Đóng vai trò là cầu nối API duy nhất cho cả 3 giao diện HTML.
  - **Tự động nhận diện Base URL (`resolveBaseUrl`)**: Nhận biết thông minh khi chạy qua Nginx cổng `8080`, chạy qua HTTPS Cloudflare Tunnel, mở qua IP LAN `192.168.x.x` hay mở trực tiếp cổng `3000`.
  - Chuẩn hóa cấu trúc dữ liệu địa điểm (`normalizePoi`), dữ liệu lộ trình tour (`normalizeTour`) và mã ngôn ngữ (`normalizeLanguage`).
  - Cung cấp sẵn từ điển đa ngôn ngữ cho lộ trình Tour (`TOUR_I18N`) trên cả 20 thứ tiếng.
  - Cơ chế chống gửi lặp sự kiện nghe liên tiếp (Deduplication trong 5 giây).

### 5. `demo/nginx.conf` – Cấu Hình Máy Chủ Nginx Reverse Proxy
- Lắng nghe tại cổng `80` (trong container `web`, ánh xạ ra cổng `8080` của máy tính).
- Phục vụ toàn bộ file tĩnh trong `demo/` trực tiếp đến trình duyệt.
- Tự động chuyển tiếp (reverse-proxy) các yêu cầu bắt đầu bằng `/api/` và `/uploads/` sang container Backend `api:3000`.
- Nhờ đó, điện thoại chỉ cần kết nối duy nhất 1 cổng `8080` qua Wi-Fi là sử dụng được toàn bộ hệ thống mà không lo bị tường lửa chặn cổng `3000`.
