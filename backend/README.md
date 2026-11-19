# 🏛️ Sài Gòn Di Sản (HCM GPS Audio Guide) – Backend API

Hệ thống Backend xây dựng trên **NestJS 10**, tuân thủ nghiêm ngặt chuẩn kiến trúc **3-Tier Enterprise**:
- **Presentation Layer (Controllers)**: Tiếp nhận HTTP request, validate dữ liệu đầu vào qua `DTO`, phân quyền qua `Guards`.
- **Business Logic Layer (Services)**: Chứa toàn bộ luật nghiệp vụ, thuật toán Geofencing Haversine, Hybrid RAG AI Chatbot, xử lý luồng âm thanh TTS.
- **Data Access Layer (Repositories)**: Thực thi các câu truy vấn Prisma ORM và tính toán không gian địa lý PostGIS.

Tất cả API chính đều có tiền tố chuẩn `/api` (ngoại trừ `/health`, `/system/network-info`, `/docs`, `/uploads`).

---

## 📂 Cấu Trúc Các Thư Mục Trong `backend/src/`

| Thư mục | Chức năng & Vai trò nghiệp vụ | Các file chính |
| :--- | :--- | :--- |
| `poi/` | Quản lý 13 địa điểm di tích Sài Gòn, Geofence trigger & **Cloud TTS Proxy Stream** | `poi.controller.ts`, `poi.service.ts`, `poi.repository.ts`, `dto.ts` |
| `chatbot/` | Hướng dẫn viên AI Hybrid RAG (Grounding 13 POI + Gemini 2.5 Flash + Fallback) | `chatbot.controller.ts`, `chatbot.service.ts`, `chatbot.repository.ts` |
| `admin/` | Quản trị viên: CRUD POI, Upload Audio MP3, KPI Dashboard & Audit Logs | `admin.controller.ts`, `admin.service.ts`, `admin.repository.ts` |
| `listening/` | Theo dõi phiên nghe thuyết minh, chống lặp 5s, Heartbeat Telemetry & Leave | `listening.controller.ts`, `listening.service.ts`, `listening.repository.ts` |
| `tour/` | Lộ trình 3 Tour chuyên gia gợi ý, tính khoảng cách & thời gian đi bộ | `tour.controller.ts`, `tour.service.ts`, `tour.repository.ts` |
| `translation/` | Danh mục 20 ngôn ngữ quốc tế và nội dung thuyết minh tương ứng | `translation.controller.ts`, `translation.service.ts`, `translation.repository.ts` |
| `geo/` | Thuật toán tính khoảng cách lượng giác và tìm kiếm ứng viên Geofence lân cận | `geo.controller.ts`, `geo.service.ts` |
| `access-pass/` | Quản lý mã vé tham quan QR (hạn dùng 72 giờ) | `access-pass.controller.ts`, `access-pass.service.ts` |
| `access-event/`| Nhật ký quét mã QR và lượt truy cập của du khách | `access-event.controller.ts`, `access-event.service.ts` |
| `auth/` | Bảo vệ API Quản trị viên qua header `x-admin-key` (`AdminKeyGuard`) | `admin-key.guard.ts` |
| `database/` | `PrismaService` kết nối PostgreSQL và tự động kích hoạt extension PostGIS | `prisma.service.ts` |

---

## 🚀 Danh Sách API Chính

| Phương thức | Đường dẫn Endpoint | Mô tả chức năng |
| :--- | :--- | :--- |
| **GET** | `/health`, `/api/health` | Kiểm tra trạng thái máy chủ & kết nối CSDL PostgreSQL |
| **GET** | `/api/system/network-info` | Lấy danh sách IP LAN thật của máy chủ (lọc bỏ IP ảo) cho mã QR |
| **GET** | `/api/pois` | Lấy danh sách 13 điểm di tích lịch sử Sài Gòn |
| **GET** | `/api/pois/tts?lang=vi&text=...` | **Cloud TTS Proxy**: Chuyển văn bản thành audio MP3 cho cả 20 thứ tiếng |
| **GET** | `/api/pois/nearby` | Tìm kiếm các di tích lân cận kèm trạng thái kích hoạt Geofence |
| **POST** | `/api/chatbot/messages` | Hỏi đáp với AI Guide Gemini 2.5 Flash RAG (giới hạn 20 req/phút) |
| **GET** | `/api/languages` | Danh mục 20 ngôn ngữ chính thức được hỗ trợ |
| **GET** | `/api/tours/suggested` | Lấy danh sách 3 lộ trình Tour chuyên gia gợi ý |
| **POST** | `/api/listening/heartbeat` | Gửi nhịp tim du khách (mỗi 12s) để Admin đếm người online |
| **POST** | `/api/listening/leave` | Du khách đóng tab / rời trang, giảm ngay số online |
| **GET** | `/api/admin/stats` | Thống kê số liệu KPI Dashboard thời gian thực (`x-admin-key`) |
| **GET** | `/api/admin/audit-events` | Xem toàn bộ nhật ký kiểm toán thao tác quản trị (`x-admin-key`) |
| **POST** | `/api/admin/upload-audio` | Tải lên file âm thanh MP3 thuyết minh ($\le 15\text{MB}$) |
| **POST/PUT/DEL**| `/api/admin/pois/*` | Thêm, sửa, đổi trạng thái và xóa điểm di tích (`x-admin-key`) |

---

## 🧪 Kiểm Thử & Kiểm Soát Chất Lượng Mã Nguồn

```bash
# Kiểm tra cú pháp bằng Oxlint (0 warnings, 0 errors)
npm run lint

# Chạy toàn bộ 61 Unit Tests với Vitest
npm test

# Build biên dịch NestJS sang thư mục dist/
npm run build
```
