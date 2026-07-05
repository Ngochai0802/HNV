#  Medical System with X-Ray AI (Hệ thống Y tế thông minh)

**Đồ án:** Thiết kế hệ thống quản lý khám bệnh và hỗ trợ nhận diện bất thường trong ảnh X-quang phổi.

##  Giới thiệu
Hệ thống y tế toàn diện giúp số hóa và quản lý quy trình khám chữa bệnh tại phòng khám/bệnh viện. Điểm nhấn của hệ thống là việc tích hợp Trí tuệ nhân tạo (AI) giúp tự động phân tích và nhận diện các bất thường trên ảnh chụp X-quang phổi, từ đó tối ưu hóa luồng làm việc giữa Bệnh nhân, Bác sĩ và Quản trị viên.

## Các chức năng chính

###  Dành cho Bệnh nhân (Patient)
* **Tải ảnh X-quang & Phân tích AI:** Bệnh nhân tự tải ảnh X-quang của mình lên hệ thống. AI sẽ tự động phân tích và khoanh vùng các khu vực nghi ngờ có bất thường. (Hệ thống có bộ lọc thông minh: tự động nhận diện và từ chối nếu ảnh tải lên không phải là ảnh X-quang hợp lệ).
* **Quản lý lịch khám:** Đặt và theo dõi lịch khám bệnh của cá nhân.
* **Tư vấn trực tuyến:** Nhắn tin (Chat) trực tiếp với bác sĩ để trao đổi và nhận tư vấn về tình trạng bệnh.

###  Dành cho Bác sĩ (Doctor)
* **Chẩn đoán bệnh án:** Tiếp nhận các ca bệnh, xem ảnh X-quang đã được AI khoanh vùng bất thường để đưa ra kết luận và chẩn đoán.
* **Tư vấn bệnh nhân:** Nhắn tin (Chat) với bệnh nhân để hướng dẫn điều trị.
* **Quản lý lịch khám:** Theo dõi và quản lý lịch hẹn khám bệnh của chính mình.

### Dành cho Quản trị viên (Admin)
* **Quản lý toàn hệ thống & Người dùng:** Khởi tạo tài khoản chuyên trách cho Bác sĩ, quản lý danh sách bệnh nhân và bác sĩ.
* **Phân ca ảnh X-quang (Tự động/Thủ công):** Quản lý luồng ảnh X-quang do bệnh nhân tải lên, phân công ca bệnh cho các bác sĩ chẩn đoán bằng cơ chế: Phân tự động hoặc Phân công thủ công.
* **Quản lý lịch khám tổng thể:** Giám sát và điều phối lịch hẹn khám của tất cả các bác sĩ trong hệ thống.

## Công nghệ sử dụng
* **Frontend:** ReactJS, TailwindCSS, Zustand
* **Backend API:** ASP.NET Core C#, Entity Framework Core
* **AI Service:** Python, Machine Learning/Computer Vision (Nhận diện ảnh X-quang, lọc ảnh và khoanh vùng bất thường)
* **Cơ sở dữ liệu:** SQL Server
* **Realtime:** SignalR (Hỗ trợ Chat)


