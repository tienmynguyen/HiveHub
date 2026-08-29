# TỔNG QUAN DỰ ÁN HIVEHUB

HiveHub là một ứng dụng di động quản lý công việc và cộng tác nhóm chuyên sâu theo mô hình Agile/Scrum, tích hợp trợ lý ảo AI Agent và công nghệ Blockchain để tối ưu hóa hiệu suất làm việc.

---

## 1. Mục tiêu dự án
*   **Quản trị công việc hiệu quả**: Xây dựng công cụ di động trực quan, phân cấp Scrum rõ ràng (`Dự án` -> `Sprint` -> `Story` -> `Task`) giúp đội ngũ dễ dàng lập kế hoạch và theo dõi tiến độ mọi lúc mọi nơi.
*   **Hợp nhất cộng tác**: Tích hợp kênh chat thời gian thực (Real-time Chat) ngay trong nội bộ dự án để tránh phân mảnh thông tin khi sử dụng nhiều ứng dụng bên thứ ba (như Zalo, Slack, Messenger).
*   **Tự động hóa bằng AI**: Triển khai trợ lý ảo AI thông minh với hai chế độ:
    *   *AI Agent (Thực thi)*: Tự động hóa tạo mới tác vụ bằng ngôn ngữ tự nhiên và tự động kết xuất báo cáo tiến độ (Sprint Report, Daily Standup) kèm biểu đồ trực quan.
    *   *Chatbot (Tư vấn)*: Giải đáp thắc mắc về quy trình Scrum và gợi ý hướng giải quyết công việc.
*   **Minh bạch & Khuyến khích**: Ứng dụng Blockchain để ghi nhận bằng chứng hoàn thành công việc (Proof of Work) và thưởng Token nội bộ nhằm thúc đẩy tinh thần làm việc của thành viên.

---

## 2. Lý do chọn dự án
*   **Hạn chế của công cụ hiện tại**: Các công cụ như Jira, Trello trên thiết bị di động thường có giao diện phức tạp, tải chậm và khó thao tác nhanh.
*   **Phân mảnh thông tin trao đổi**: Việc tách rời giữa nơi quản lý task (Jira) và nơi giao tiếp (Slack, Zalo, Telegram) làm loãng bối cảnh, dễ thất lạc tài liệu và giảm hiệu suất truyền thông.
*   **Tốn thời gian làm báo cáo**: Các buổi họp Daily Standup hay báo cáo cuối Sprint thường tốn nhiều công sức để tổng hợp số liệu thủ công và dễ xảy ra sai sót.
*   **Thiếu động lực cống hiến thực tế**: Quy trình kiểm duyệt và khen thưởng truyền thống thiếu tính minh bạch và không tạo được động lực tức thời cho các thành viên đóng góp tích cực.

---

## 3. Các vấn đề đã giải quyết (Theo thực tiễn)
*   **Trải nghiệm di động tối ưu**: Thiết kế giao diện React Native mượt mà, tối giản hóa quy trình cập nhật trạng thái công việc xuống dưới 3 bước chạm.
*   **Hội thoại gắn liền với bối cảnh**: Thành viên thảo luận trực tiếp trong room chat riêng biệt của từng dự án, dữ liệu tin nhắn được lưu trữ lịch sử bằng Socket.IO.
*   **Tự động hóa báo cáo bằng AI chỉ với 1 câu lệnh**: Người dùng chỉ cần nhập hoặc ra lệnh (ví dụ: *"Lập báo cáo dự án"*, *"Daily Standup của tôi"*), AI Assistant sẽ tự động truy vấn cơ sở dữ liệu, tổng hợp chỉ số và vẽ biểu đồ SVG động trực quan ngay trên điện thoại.
*   **Kiến trúc cơ sở dữ liệu Hybrid linh hoạt**: Hệ thống backend có khả năng tự động đồng bộ lên đám mây MongoDB Atlas khi có mạng và tự động chuyển đổi sang cơ chế lưu trữ cục bộ offline (`db.json`) khi mất kết nối, đảm bảo ứng dụng không bao giờ bị gián đoạn.
*   **Giao dịch blockchain đáng tin cậy**: Khi Owner duyệt task hoàn thành, hệ thống tự động lưu trữ mã giao dịch (`txHash`) lên blockchain Ganache và chuyển token thưởng đến ví thành viên, cam kết sự công bằng, minh bạch trong đánh giá hiệu suất.

---

## 4. Mô tả dự án
*   **Công nghệ sử dụng**:
    *   **Frontend**: React Native + Expo (Kiến trúc Modular/Feature-based tối ưu hóa hiệu năng).
    *   **Backend**: Node.js + Express.js (kết nối Socket.IO hỗ trợ realtime).
    *   **Cơ sở dữ liệu**: MongoDB Atlas kết hợp với file dữ liệu fallback cục bộ (`db.json`).
    *   **Công nghệ đột phá**: Tích hợp mô hình ngôn ngữ lớn (LLM) cho AI Assistant và Smart Contract trên Blockchain để ghi nhận Proof of Work.
*   **Tính năng cốt lõi**:
    1.  Xác thực & Bảo mật tài khoản nâng cao bằng cơ chế JWT (Access & Refresh Token).
    2.  Phân quyền vai trò dự án chặt chẽ (Owner, Leader, Member).
    3.  Lập kế hoạch và quản lý vòng đời Task/Story/Sprint linh hoạt.
    4.  Nhóm chat Real-time theo dự án.
    5.  Bảng thống kê phân tích (Dashboard), quản lý lịch trình và ghi chú cá nhân.
    6.  Trợ lý thông minh AI Assistant hỗ trợ thực thi câu lệnh và tư vấn nghiệp vụ.
