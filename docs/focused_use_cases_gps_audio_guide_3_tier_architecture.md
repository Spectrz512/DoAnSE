# Focused Use Cases — HO CHI MINH CITY GPS Audio Guide

*Tài liệu Đặc tả Use Case Phục vụ Thiết kế Hệ thống 3 Lớp (Controller – Service – DAO) & Vận hành CI/CD*

| Use Case Number | UC1 |
| --- | --- |
| Use Case Name | Kích hoạt và truy cập tour bằng mã QR đã thanh toán |
| Actor(s) | Du khách, Hệ thống vé / Cổng thanh toán |
| Maturity | Focused |
| Summary | Du khách đã thanh toán thành công được cấp một mã QR truy cập. Khi quét mã QR này, ứng dụng xác thực và tự động đưa du khách vào thẳng tour để bắt đầu trải nghiệm mà không cần xem lại bảng giá hay thao tác thanh toán lại. |
| Preconditions | Giao dịch mua tour đã hoàn tất; mã QR kích hoạt hợp lệ; tour đang ở trạng thái `PUBLISHED`. |
| Postconditions | Client nhận `access_pass` (token định danh phiên có hạn dùng) và tải dữ liệu ban đầu của tour; tour chính thức bắt đầu. |

**Basic course of events**

1. Du khách hoàn tất thanh toán (trực tuyến hoặc nhận mã QR in trên vé tại quầy).
2. Du khách mở ứng dụng/camera quét mã QR truy cập được cấp.
3. Client gửi mã xác thực lên máy chủ (`POST /api/tours/redeem-pass`).
4. Tầng Presentation nhận request và chuyển mã vé xuống Tầng Service kiểm tra.
5. Tầng Service xác thực mã vé hợp lệ, kiểm tra hạn dùng, tạo `access_pass` (chứa `tourId`, `deviceId`, thời gian hiệu lực `exp`).
6. Máy chủ trả về `access_pass` kèm toàn bộ dữ liệu cấu trúc tour (danh sách POI, tuyến đường, cấu hình ngôn ngữ).
7. Ứng dụng tự động chuyển thẳng vào màn hình bản đồ tour và bắt đầu phiên hướng dẫn.

**Alternative paths:**

* *Mã QR không hợp lệ hoặc đã qua sử dụng trên thiết bị khác:* Hệ thống trả mã lỗi HTTP 400/404 kèm thông báo mã không hợp lệ hoặc đã được kích hoạt.
* *Vé/Pass đã hết thời gian hiệu lực:* Hệ thống trả mã HTTP 403 Forbidden kèm thông báo vé tham quan đã hết hạn.

**Layer Mapping (3-Tier Architecture):**

* **Presentation (Controller):** `TourAccessController` (`POST /api/tours/redeem-pass`).
* **Business Logic (Service):** `AccessPassService` (thẩm định tính hợp lệ của mã QR, sinh JWT phiên làm việc).
* **Data Access (DAO):** `PassRepository` / `TourDAO` (cập nhật trạng thái vé đã kích hoạt, tải thông tin tour).

---

| Use Case Number | UC2 |
| --- | --- |
| Use Case Name | Tự động thuyết minh POI theo GPS & Chuyển vùng thông minh |
| Actor(s) | Du khách, Dịch vụ vị trí thiết bị (Device Geolocation API) |
| Maturity | Focused |
| Summary | Ứng dụng tự động phát audio thuyết minh đúng ngôn ngữ khi du khách di chuyển vào vùng kích hoạt của một điểm POI. Nếu đang phát mà du khách di chuyển sang điểm mới, hệ thống đếm ngược 3 giây để tự động chuyển phát theo vị trí thực tế hiện tại. |
| Preconditions | Access pass hợp lệ; người dùng đã cấp quyền vị trí GPS; dữ liệu tour đã tải. |
| Postconditions | POI được đánh dấu đã phát trong phiên; sự kiện nghe tự động (`AUTO`) được ghi nhận. |

**Basic course of events**

1. Dịch vụ vị trí thiết bị liên tục cập nhật tọa độ (`lat`, `lng`, `accuracy`).
2. Client/Service tính khoảng cách tới các POI lân cận theo công thức Haversine.
3. Khi du khách bước vào bán kính kích hoạt ($triggerRadiusM \le 15m$) của một POI chưa phát:
   * **Trường hợp không có âm thanh nào đang phát:** Hệ thống tự động hiển thị thẻ địa điểm và phát tệp âm thanh thuyết minh theo ngôn ngữ du khách đã chọn.
   * **Trường hợp đang phát dở một POI khác:** Hệ thống hiển thị thông báo: *"Bạn vừa đến [Tên POI mới]. Tự động chuyển sau 3 giây..."* kèm nút bấm "Tiếp tục nghe bài cũ".
4. Nếu sau 3 giây du khách không can thiệp, hệ thống tự động dừng bài cũ và chuyển sang phát thuyết minh của POI tại vị trí du khách đang đứng.
5. Du khách có thể tạm dừng, nghe lại, đổi ngôn ngữ hoặc mở rộng văn bản chi tiết.
6. Khi phát xong, POI được đánh dấu đã phát. Hệ thống chỉ cho phép tự động kích hoạt lại POI đó nếu du khách đã rời xa khỏi vùng reset ($resetRadiusM \ge 25m$).
7. Sự kiện nghe tự động (`mode: AUTO`) được gửi về máy chủ để thống kê.

**Alternative paths:**

* *Du khách bấm "Tiếp tục nghe bài cũ":* Hệ thống hủy đếm ngược 3 giây, giữ nguyên bài thuyết minh đang phát và chỉ hiển thị biểu tượng thông báo POI mới trên bản đồ.
* *GPS yếu / mất tín hiệu:* Hệ thống giữ trạng thái hiện tại, hiển thị cảnh báo tín hiệu yếu và cung cấp danh sách POI gần nhất để nghe thủ công.
* *Lỗi tải file âm thanh:* Hệ thống hiển thị toàn bộ nội dung văn bản kèm tùy chọn dùng giọng đọc Text-to-Speech (TTS) cục bộ dự phòng.

**Layer Mapping (3-Tier Architecture):**

* **Presentation (Controller):** `TourController` (`GET /api/pois/nearby`), `TelemetryController` (`POST /api/events/listen`).
* **Business Logic (Service):** `GeoSpatialService` (công thức Haversine, logic Hysteresis chống nhảy GPS), `PlaybackConflictService` (xử lý timer 3s ưu tiên vị trí hiện tại).
* **Data Access (DAO):** `POIDAO`, `ListeningEventDAO`.

---

| Use Case Number | UC3 |
| --- | --- |
| Use Case Name | Quản trị POI & Tệp đa phương tiện đa ngôn ngữ |
| Actor(s) | Quản trị viên (Admin), Biên tập viên nội dung |
| Maturity | Focused |
| Summary | Quản trị viên tạo mới, cập nhật thông tin POI, tọa độ địa lý, bán kính trigger, tải lên file audio thuyết minh theo từng ngôn ngữ và xuất bản (Publish) tour. |
| Preconditions | Đăng nhập tài khoản quản trị có phân quyền hợp lệ. |
| Postconditions | Dữ liệu POI, bản dịch và file âm thanh được lưu trữ an toàn; hành động được ghi audit log. |

**Basic course of events**

1. Quản trị viên đăng nhập vào hệ thống quản trị (`admin.html`).
2. Chọn tạo mới POI hoặc chọn một POI cần chỉnh sửa.
3. Thiết lập thông số: Tên địa điểm, Tọa độ GPS (`lat`, `lng`), Bán kính kích hoạt `triggerRadiusM` (m), Bán kính reset `resetRadiusM` (m).
4. Thiết lập nội dung theo từng ngôn ngữ hỗ trợ: Tiêu đề, mô tả tóm tắt, nội dung chi tiết và tải lên file âm thanh (`.mp3`/`.wav`) hoặc kích hoạt tính năng sinh giọng tự động (TTS).
5. Tầng Presentation nhận dữ liệu và file đa phương tiện (`multipart/form-data`).
6. Tầng Service kiểm tra dung lượng ($\le 15MB$), định dạng, lưu trữ file vào thư mục tĩnh hoặc Object Storage, sinh URL truy cập.
7. Quản trị viên chuyển trạng thái sang `PUBLISHED` và bấm "Lưu".
8. Tầng DAO lưu bản ghi POI và các bản ghi ngôn ngữ liên kết vào cơ sở dữ liệu.

**Alternative paths:**

* *Tệp âm thanh sai định dạng hoặc vượt quá kích thước:* Hệ thống từ chối lưu và hiển thị thông báo lỗi cụ thể cho quản trị viên.

**Layer Mapping (3-Tier Architecture):**

* **Presentation (Controller):** `AdminPOIController`, `MediaUploadController`.
* **Business Logic (Service):** `POIManagementService`, `FileStorageService`, `TTSService`.
* **Data Access (DAO):** `POIDAO`, `POITranslationDAO`, `AuditLogDAO`.

---

| Use Case Number | UC4 |
| --- | --- |
| Use Case Name | Trợ lý Hướng dẫn viên AI đồng hành |
| Actor(s) | Du khách |
| Maturity | Focused |
| Summary | Du khách đã mua tour được quyền trò chuyện, hỏi đáp không giới hạn với Trợ lý AI về thông tin lịch sử, văn hóa, kiến trúc của các địa điểm trong tour. |
| Preconditions | Access pass hợp lệ trong thời gian hiệu lực của tour; kho tri thức POI đã được lập chỉ mục. |
| Postconditions | Phản hồi thông tin được tạo ra kèm nguồn trích dẫn từ bài thuyết minh chính thức. |

**Basic course of events**

1. Du khách mở khung hội thoại "Hướng dẫn viên AI" trên ứng dụng.
2. Du khách nhập câu hỏi thắc mắc (văn bản hoặc giọng nói) liên quan đến các địa điểm trong chuyến đi.
3. Client gửi yêu cầu `POST /api/ai/ask` kèm nội dung câu hỏi và `tourId`.
4. Tầng Service thực hiện kiểm soát kỹ thuật chống gửi lặp quá tải (Anti-spam/Flood protection: từ chối các request gửi liên tục dưới 1 giây).
5. Hệ thống trích xuất nội dung liên quan nhất từ kho tri thức chính thống của tour (RAG - Retrieval-Augmented Generation).
6. Tầng Service gửi ngữ cảnh cùng câu hỏi của du khách tới mô hình ngôn ngữ lớn (LLM) để sinh câu trả lời ngắn gọn, chuẩn xác.
7. Du khách nhận phản hồi tức thì kèm liên kết trích dẫn tới POI tương ứng. Du khách có thể tiếp tục hỏi các câu hỏi tiếp theo mà không bị trừ phí hay giới hạn số câu hỏi trong phiên.

**Alternative paths:**

* *Gửi liên tục quá nhanh (Spam prevention):* Hệ thống hiển thị thông báo: *"Bạn gửi câu hỏi hơi nhanh, vui lòng chờ vài giây để AI trả lời nhé."* (Bảo vệ tải hệ thống, không phải giới hạn hạn mức dịch vụ).
* *Câu hỏi hoàn toàn không liên quan đến chuyến tham quan:* Hệ thống lịch sự phản hồi: *"Tôi là hướng dẫn viên ảo của tour này, tôi chỉ có thể hỗ trợ bạn các thông tin liên quan đến lịch sử và các địa điểm trong chuyến đi."*
* *Lỗi kết nối tới dịch vụ AI:* Hệ thống thông báo lỗi đường truyền và gợi ý du khách đọc phần thuyết minh có sẵn trên thẻ POI.

**Layer Mapping (3-Tier Architecture):**

* **Presentation (Controller):** `AIChatController` (`POST /api/ai/ask`).
* **Business Logic (Service):** `RAGService`, `AIOrchestrationService`, `FloodControlService`.
* **Data Access (DAO):** `POIContentRepository` / `VectorSearchDAO`.

---

| Use Case Number | UC5 |
| --- | --- |
| Use Case Name | Thuyết minh thủ công khi chạm vào POI trên bản đồ |
| Actor(s) | Du khách |
| Maturity | Focused |
| Summary | Du khách chủ động chọn một điểm POI trên bản đồ hoặc danh sách để xem thông tin chi tiết và phát thuyết minh audio theo ý muốn mà không phụ thuộc vào vị trí GPS. |
| Preconditions | Dữ liệu tour đã tải; phiên tham quan đang hoạt động. |
| Postconditions | File âm thanh được phát, thông tin POI hiển thị đầy đủ và sự kiện nghe thủ công (`MANUAL`) được ghi nhận. |

**Basic course of events**

1. Du khách duyệt bản đồ hoặc danh mục điểm đến và chạm vào một POI bất kỳ.
2. Hệ thống hiển thị thẻ chi tiết POI gồm: tên, hình ảnh, bài viết thuyết minh, thời lượng audio.
3. Du khách đổi ngôn ngữ nghe (nếu muốn khác với ngôn ngữ mặc định).
4. Du khách bấm nút "Phát thuyết minh" (Play).
5. Hệ thống tải và phát tệp âm thanh (hoặc TTS), cập nhật thanh tiến trình.
6. Hệ thống tạo sự kiện nghe thủ công (`mode: MANUAL`) gửi về máy chủ để phục vụ báo cáo.

**Alternative paths:**

* *Lỗi tải file âm thanh:* Hệ thống hiển thị nội dung văn bản kèm nút "Thử lại" hoặc kích hoạt giọng đọc Web Speech API dự phòng trên thiết bị.

**Layer Mapping (3-Tier Architecture):**

* **Presentation (Controller):** `TourController` (`GET /api/pois/{id}`), `TelemetryController` (`POST /api/events/listen`).
* **Business Logic (Service):** `PlaybackService`, `TelemetryService`.
* **Data Access (DAO):** `POIDAO`, `POITranslationDAO`, `ListeningEventDAO`.

---

| Use Case Number | UC6 |
| --- | --- |
| Use Case Name | Gợi ý và tùy biến lộ trình tham quan |
| Actor(s) | Du khách |
| Maturity | Focused |
| Summary | Du khách chọn các tour gợi ý sẵn theo chủ đề hoặc tự sắp xếp danh sách các điểm POI yêu thích thành lộ trình riêng kèm thời gian ước tính hoàn thành. |
| Preconditions | Ứng dụng đã nạp danh sách POI và các tuyến mẫu. |
| Postconditions | Tuyến tham quan cá nhân được tạo và lưu trữ trên phiên làm việc của thiết bị. |

**Basic course of events**

1. Du khách mở mục "Lộ trình tham quan" (Tours).
2. Hệ thống hiển thị các tour gợi ý theo chủ đề kèm tổng thời lượng dự kiến.
3. Du khách chọn một tour có sẵn hoặc bấm "Tạo tour cá nhân".
4. Với tour cá nhân: Du khách chọn thêm/bớt POI, kéo thả sắp xếp thứ tự các điểm dừng.
5. Tầng Service tính toán tổng thời gian dự kiến (thời gian nghe thuyết minh + thời gian di chuyển ước lượng giữa các điểm) và vẽ lộ trình lên bản đồ.
6. Du khách bấm "Bắt đầu tour" để hệ thống dẫn đường tuần tự theo thứ tự đã định.

**Alternative paths:**

* *Bỏ qua điểm dừng:* Khi đang đi, du khách có thể bấm "Bỏ qua điểm này"; hệ thống sẽ tự động vẽ lại lộ trình đến điểm tiếp theo và cập nhật lại thời gian còn lại.

**Layer Mapping (3-Tier Architecture):**

* **Presentation (Controller):** `RouteController` (`POST /api/routes/calculate`).
* **Business Logic (Service):** `RoutingService` (thuật toán ước tính lộ trình và thời lượng).
* **Data Access (DAO):** `TourDAO`, `RouteTemplateDAO`.

---

| Use Case Number | UC7 |
| --- | --- |
| Use Case Name | Xem bảng điều khiển giám sát và thống kê lượt nghe theo thời gian thực |
| Actor(s) | Quản trị viên (Admin) |
| Maturity | Focused |
| Summary | Quản trị viên theo dõi các chỉ số vận hành gồm tổng POI, tổng lượt nghe, phân bổ theo chế độ phát (`AUTO` vs `MANUAL`), tỷ lệ ngôn ngữ và danh sách nhật ký sự kiện gần nhất. |
| Preconditions | Quản trị viên đã xác thực với Admin Token hợp lệ. |
| Postconditions | Bảng số liệu KPI tổng hợp và danh sách sự kiện được tải và trực quan hóa trên giao diện quản trị. |

**Basic course of events**

1. Quản trị viên truy cập mục "Bảng điều khiển & Thống kê" (Dashboard/Stats).
2. Client gửi yêu cầu lấy số liệu: `GET /api/admin/stats` kèm tham số lọc thời gian (hôm nay, 7 ngày, 30 ngày).
3. Tầng Service tổng hợp dữ liệu từ cơ sở dữ liệu:
   * Tổng số POI và trạng thái hoạt động.
   * Tổng lượt nghe và tỷ lệ kích hoạt tự động qua GPS so với bấm thủ công.
   * Top 5 POI được du khách nghe nhiều nhất.
   * Biểu đồ phân bổ tỷ lệ các ngôn ngữ được sử dụng.
4. Giao diện hiển thị các thẻ KPI trực quan và bảng nhật ký sự kiện mới nhất.
5. Quản trị viên có thể bấm "Làm mới dữ liệu" hoặc tải về file báo cáo.

**Alternative paths:**

* *Token hết hạn hoặc không có quyền:* Trả về HTTP 401/403, điều hướng về màn hình đăng nhập.

**Layer Mapping (3-Tier Architecture):**

* **Presentation (Controller):** `AnalyticsController` (`GET /api/admin/stats`).
* **Business Logic (Service):** `AnalyticsAggregatorService` (xử lý logic gom nhóm, đếm thống kê).
* **Data Access (DAO):** `ListeningEventDAO` (truy vấn tổng hợp `COUNT`, `GROUP BY` trên bảng sự kiện).

---

| Use Case Number | UC8 |
| --- | --- |
| Use Case Name | Tải trước gói dữ liệu ngoại tuyến (Offline Tour Package) |
| Actor(s) | Du khách (Client) |
| Maturity | Focused |
| Summary | Du khách tải trọn bộ dữ liệu của tour (danh sách POI, bản dịch, file audio) về lưu trữ trên bộ nhớ thiết bị để trải nghiệm xuyên suốt mà không phụ thuộc vào kết nối mạng 3G/4G ngoài trời. |
| Preconditions | Access pass hợp lệ; thiết bị có kết nối mạng ổn định (khuyên dùng Wi-Fi). |
| Postconditions | Dữ liệu tour và các tệp âm thanh được lưu trong bộ nhớ máy (IndexedDB / Cache Storage); ứng dụng sẵn sàng hoạt động ở chế độ ngoại tuyến. |

**Basic course of events**

1. Sau khi kích hoạt tour thành công, ứng dụng hiển thị gợi ý: *"Tải dữ liệu ngoại tuyến để chuyến tham quan không bị gián đoạn khi mạng yếu"*.
2. Du khách bấm "Tải gói ngoại tuyến".
3. Client gửi yêu cầu: `GET /api/tours/{id}/package`.
4. Tầng Service thu thập toàn bộ metadata tour, danh mục POI và danh sách URL tệp âm thanh đã được tối ưu hóa nén.
5. Client nhận gói dữ liệu, tiến hành tải các tệp audio về lưu trữ vào IndexedDB/Cache Storage của trình duyệt.
6. Ứng dụng thông báo "Đã sẵn sàng sử dụng ngoại tuyến". Mọi hoạt động định vị GPS, phát audio từ thời điểm này sẽ ưu tiên đọc dữ liệu cục bộ.

**Alternative paths:**

* *Mất mạng giữa chừng:* Ứng dụng tạm dừng tải, lưu lại tiến độ hiện tại và hiển thị nút "Tiếp tục tải" khi mạng hoạt động trở lại.

**Layer Mapping (3-Tier Architecture):**

* **Presentation (Controller):** `TourPackageController` (`GET /api/tours/{id}/package`).
* **Business Logic (Service):** `PackagingService` (tổng hợp dữ liệu POI và link media, gắn ETag quản lý phiên bản).
* **Data Access (DAO):** `TourDAO`, `POIDAO`, `POITranslationDAO`.

---

| Use Case Number | UC9 (Use Case Hệ thống / Vận hành) |
| --- | --- |
| Use Case Name | Kiểm tra sức khỏe hệ thống phục vụ Pipeline CI/CD (System Health Check) |
| Actor(s) | CI/CD Pipeline Runner, Công cụ Giám sát Uptime |
| Maturity | Focused |
| Summary | Cung cấp endpoint kỹ thuật để kiểm tra tự động trạng thái kết nối Database và khả năng sẵn sàng của ứng dụng, phục vụ việc kiểm thử tự động và triển khai không gián đoạn (Zero-downtime Deployment) trên CI/CD. |
| Preconditions | Yêu cầu gửi tới endpoint sức khỏe hệ thống. |
| Postconditions | Trả về mã HTTP 200 (OK) nếu dịch vụ hoạt động bình thường, hoặc HTTP 503 nếu cơ sở dữ liệu gặp sự cố. |

**Basic course of events**

1. Quy trình CI/CD Pipeline (GitHub Actions / GitLab CI) sau khi build container tiến hành gửi yêu cầu `GET /health` tới Backend.
2. Tầng Controller gọi xuống Tầng Service thực hiện kiểm tra trạng thái vận hành:
   * Ping kết nối cơ sở dữ liệu (`SELECT 1`).
   * Kiểm tra khả năng truy cập thư mục lưu trữ media.
3. Nếu tất cả đều sẵn sàng, Tầng Controller trả về mã HTTP 200 kèm payload JSON: `{"status": "UP", "database": "CONNECTED", "timestamp": "..."}`.
4. Pipeline CI/CD xác nhận bản dựng đạt chuẩn và hoàn tất bước triển khai (Continuous Deployment).

**Alternative paths:**

* *Cơ sở dữ liệu bị ngắt kết nối:* Trả về HTTP 503 Service Unavailable `{"status": "DOWN", "database": "DISCONNECTED"}`. Pipeline CI/CD tự động phát cảnh báo lỗi và hủy triển khai (Rollback).

**Layer Mapping (3-Tier Architecture):**

* **Presentation (Controller):** `HealthController` (`GET /health`).
* **Business Logic (Service):** `HealthCheckService`.
* **Data Access (DAO):** `PingDAO` / `DatabaseHealthIndicator`.