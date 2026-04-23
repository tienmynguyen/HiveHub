# Software Requirements Specification (SRS)

## 1. Giới thiệu

### 1.1 Mục đích
Tài liệu này mô tả đầy đủ yêu cầu phần mềm cho hệ thống `HiveHub` - ứng dụng quản lý công việc nhóm trên mobile, có tích hợp chat realtime và xác thực/ghi nhận công việc qua blockchain.

### 1.2 Phạm vi hệ thống
`HiveHub` cho phép:
- Người dùng đăng ký/đăng nhập và quản lý hồ sơ cá nhân.
- Tạo và quản lý dự án, thành viên, vai trò.
- Tạo/giao/theo dõi công việc theo trạng thái và thời gian.
- Trao đổi theo dự án bằng chat realtime.
- Ghi chú cá nhân.
- Duyệt task và ghi proof lên blockchain, kèm cơ chế thưởng token.

### 1.3 Định nghĩa và viết tắt
- `SRS`: Software Requirements Specification.
- `FE`: Frontend (React Native/Expo).
- `BE`: Backend (Spring Boot).
- `Owner/Leader/Member`: Vai trò trong dự án.
- `txHash`: Mã giao dịch blockchain.

## 2. Mô tả tổng quan

### 2.1 Bối cảnh sản phẩm
Hệ thống gồm:
- Ứng dụng mobile React Native (Expo) cho người dùng cuối.
- API backend Spring Boot kết nối MySQL.
- WebSocket phục vụ chat realtime.
- Tích hợp Web3j để tương tác blockchain/token.

### 2.2 Nhóm người dùng
- **Khách (Guest)**: chưa đăng nhập, chỉ dùng luồng auth.
- **Thành viên (Member)**: tham gia dự án, nhận/submit task, chat.
- **Trưởng nhóm (Leader)**: phân công task, quản lý một phần thành viên.
- **Chủ dự án (Owner)**: toàn quyền vai trò, duyệt/từ chối task, thưởng token.

### 2.3 Giả định và phụ thuộc
- Có kết nối mạng ổn định.
- CSDL MySQL hoạt động.
- Node blockchain/Ganache và smart contract khả dụng khi dùng chức năng token/proof.
- FE và BE dùng cùng chuẩn hash password ở luồng auth.

## 3. Yêu cầu chức năng

### FR-01: Đăng ký tài khoản
- Người dùng nhập `email`, `userName`, `password`.
- Hệ thống kiểm tra hợp lệ dữ liệu và trùng email.
- Mật khẩu được xử lý hash theo chuẩn hiện tại và lưu an toàn tại BE.

### FR-02: Đăng nhập
- Người dùng đăng nhập bằng email và mật khẩu.
- Hệ thống xác thực và trả thông tin user cần thiết cho phiên làm việc.

### FR-03: Cập nhật hồ sơ người dùng
- Người dùng cập nhật tên, email, mô tả, avatar, địa chỉ ví.
- Hệ thống lưu và phản hồi trạng thái thành công/thất bại.

### FR-04: Quản lý dự án
- Tạo dự án mới.
- Lấy danh sách dự án theo user.
- Tham gia dự án bằng mã/ID dự án.

### FR-05: Quản lý thành viên dự án
- Lấy danh sách thành viên theo dự án.
- Lấy vai trò user trong dự án.
- Owner/Leader đổi vai trò thành viên.
- Owner/Leader có thể kick user khỏi dự án.

### FR-06: Quản lý công việc
- Tạo task theo dự án.
- Gán task cho một hoặc nhiều user.
- Cập nhật task (trạng thái, thông tin).
- Xóa task.
- Lấy task theo dự án, theo user, theo ngày.

### FR-07: Vòng đời task và duyệt kết quả
- Member submit task hoàn thành.
- Owner duyệt task: hệ thống ghi proof blockchain, cập nhật trạng thái `COMPLETED`, lưu `txHash`.
- Owner từ chối task: lưu lý do và trả về trạng thái phù hợp.

### FR-08: Ghi nhận lịch sử và bình luận
- Người dùng gửi bình luận theo task.
- Hệ thống ghi lịch sử các hành động quan trọng (submit/approve/reject).

### FR-09: Chat realtime theo dự án
- Người dùng gửi/nhận tin nhắn realtime trong project room.
- Hệ thống lưu lịch sử chat để tải lại khi mở màn hình chat.

### FR-10: Quản lý ghi chú cá nhân
- Tạo, sửa, xóa, lấy danh sách ghi chú theo user.
- Hỗ trợ ghim ghi chú để ưu tiên hiển thị.

### FR-11: Dashboard và lịch/timeline
- Hiển thị tổng quan số dự án, số task, task hôm nay.
- Hiển thị tiến độ theo timeline/Gantt/calendar.

### FR-12: Token và ví blockchain
- Lấy số dư token theo địa chỉ ví.
- Chuyển token giữa các ví.
- Hỗ trợ thưởng token khi duyệt task (theo cấu hình nghiệp vụ backend).

## 4. Yêu cầu phi chức năng

### NFR-01: Bảo mật
- Không trả plaintext password qua API.
- Password lưu dạng hash an toàn ở backend.
- Dữ liệu nhạy cảm (private key, endpoint blockchain) phải tách khỏi code cứng trong bản production.

### NFR-02: Hiệu năng
- API danh sách (project/task/note/chat) phản hồi trong thời gian chấp nhận được trên mạng 4G/WiFi phổ biến.
- Chat realtime phải hiển thị tin nhắn gần như tức thời.

### NFR-03: Tính sẵn sàng và ổn định
- Hệ thống không crash khi API lỗi; FE có fallback/loading/error handling.
- Khi blockchain không khả dụng, các chức năng không phụ thuộc blockchain vẫn hoạt động.

### NFR-04: Khả năng mở rộng và bảo trì
- FE tổ chức theo kiến trúc feature-based.
- Endpoint tập trung trong file cấu hình chung để dễ bảo trì.
- Module BE tách controller/service/repository rõ ràng.

### NFR-05: Khả dụng
- Giao diện mobile trực quan, thao tác chính <= 3 bước.
- Trạng thái loading/thất bại cần hiển thị rõ cho người dùng.

## 5. Ràng buộc hệ thống
- FE: React Native (Expo).
- BE: Spring Boot.
- DB: MySQL.
- Realtime: WebSocket/STOMP.
- Blockchain: Web3j + smart contract tương thích.

## 6. Use Case chính

### UC-01: User đăng ký và đăng nhập
- **Actor**: Guest
- **Tiền điều kiện**: Chưa có phiên đăng nhập.
- **Luồng chính**:
  1. Nhập thông tin đăng ký.
  2. Hệ thống tạo tài khoản.
  3. User đăng nhập và vào màn hình chính.
- **Kết quả**: Phiên user hợp lệ.

### UC-02: Tạo dự án và phân công công việc
- **Actor**: Owner/Leader
- **Luồng chính**:
  1. Tạo dự án.
  2. Mời/thêm thành viên (join bằng mã).
  3. Tạo task và gán user phụ trách.

### UC-03: Submit và duyệt task
- **Actor**: Member, Owner
- **Luồng chính**:
  1. Member cập nhật tiến độ/submit task.
  2. Owner duyệt hoặc từ chối.
  3. Nếu duyệt: ghi proof blockchain và cập nhật `txHash`.

### UC-04: Chat nhóm theo dự án
- **Actor**: Thành viên dự án
- **Luồng chính**:
  1. Mở phòng chat của dự án.
  2. Gửi/nhận tin nhắn realtime.
  3. Lịch sử tin nhắn được lưu và truy xuất lại.

## 7. Tiêu chí nghiệm thu (Acceptance Criteria)
- Đăng ký/đăng nhập thành công với dữ liệu hợp lệ.
- Tạo/join project thành công, danh sách dự án cập nhật đúng.
- Tạo task, gán user, xem task theo ngày/project/user đúng dữ liệu.
- Submit/approve/reject task phản ánh đúng trạng thái trên FE.
- Chat dự án realtime hoạt động, có lịch sử.
- Note CRUD hoạt động ổn định.
- Lấy số dư/chuyển token trả kết quả hợp lệ khi blockchain sẵn sàng.

## 8. Danh sách API nghiệp vụ chính (tham chiếu)
- Auth: `/register`, `/login`, `/updateuser`
- Project/UserProject: `/createdproject`, `/getprjectbyuserId`, `/joinproject`, `/updateuserproject`, `/findroleinuspr`
- Task: `/addtask`, `/gettaskbyprojectid`, `/getalltaskbyuser`, `/findtaskbydate`, `/updatetask`, `/approvetask`, `/rejecttask`, `/submittask`
- Comment: `/postcomment`, `/getallcommentbyTask`
- Chat/Message: `/chat/getallmessage`, WebSocket `/ws`
- Note: `/addnote`, `/getallnotebyuser`, `/updatenote`, `/deletenote`
- Wallet/Token: `/getbalance`, `/transfertoken`

## 9. Hướng phát triển tiếp theo (khuyến nghị)
- Tách DTO riêng cho `login/register/update profile`.
- Chuẩn hóa error code/message API.
- Bổ sung JWT/refresh token thay cho session đơn giản.
- Viết test tích hợp cho luồng auth, task approval, chat.
- Tách config bí mật blockchain sang biến môi trường.

