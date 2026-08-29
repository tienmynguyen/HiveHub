function getAgentFunctionList() {
  return [
    {
      id: "CREATE_PROJECT",
      purpose: "Tạo dự án mới cho user đang đăng nhập",
      required: ["projectName"],
      optional: ["projectDescription"],
      notes: [
        "Không cần projectId đầu vào",
        "Mọi user đang đăng nhập đều có thể tạo dự án",
      ],
      examples: [
        "Tạo dự án CRM nội bộ",
        "Lập dự án Mobile Sprint 5",
      ],
    },
    {
      id: "CREATE_PROJECT_BLUEPRINT",
      purpose: "Tao du an va dung cau truc sprint/story/subtask tu 1 lenh",
      required: ["projectName", "projectDescription", "sprintCount", "storiesPerSprint", "tasksPerStory", "sprintDurationWeeks", "startDate"],
      optional: [],
      notes: [
        "Tu dong tao toan bo hierarchy: project -> sprint -> story -> subtask",
        "Phu hop lenh planning dai va co thong so cau truc ro rang",
      ],
      examples: [
        "Tao du an ABC, muc dich xay dung app ABC, gom 4 sprint moi sprint 1 tuan tu 26/4, moi sprint 2 story, moi story 2 subtask",
      ],
    },
    {
      id: "CREATE_SPRINT",
      purpose: "Tao sprint moi trong project",
      required: ["projectId", "sprintName"],
      optional: ["sprintGoal", "sprintStatus", "timeStart", "timeEnd"],
      notes: [
        "Chỉ Owner được phép thực thi",
        "projectId phải tồn tại",
      ],
      examples: [
        "Tạo sprint Sprint 2 cho P-12345678",
      ],
    },
    {
      id: "CREATE_STORY",
      purpose: "Tạo story trong một project",
      required: ["projectId", "storyName"],
      optional: ["sprintId", "epicId", "storyStatus"],
      notes: [
        "Cần projectId hợp lệ mà user đang tham gia",
        "Chi Owner được phép thực thi",
      ],
      examples: [
        "Tạo story đăng nhập OTP cho P-12345678",
        "Thêm story thanh toán vào sprint 2 của P-12345678",
      ],
    },
    {
      id: "CREATE_TASK",
      purpose: "Tạo task/subtask trong project",
      required: ["projectId", "taskName"],
      optional: ["storyId", "description", "taskStatus", "deadline"],
      notes: [
        "Nếu có storyId thì task được gán story",
        "Chi Owner được phép thực thi",
      ],
      examples: [
        "Tạo task fix login cho P-12345678",
        "Thêm subtask viết test cho story 21 thuộc P-12345678",
      ],
    },
    {
      id: "UPDATE_SPRINT_STATUS",
      purpose: "Cập nhật trạng thái sprint",
      required: ["projectId", "sprintId", "sprintStatus"],
      optional: [],
      notes: [
        "sprintStatus chỉ nhận TODO|IN_PROGRESS|DONE",
        "Chi Owner được phép thực thi",
      ],
      examples: [
        "Doi sprint 3 cua P-12345678 sang DONE",
      ],
    },
    {
      id: "CREATE_CALENDAR_NOTE",
      purpose: "Tạo lịch nhắc việc cá nhân ở Calendar kèm thời điểm thông báo",
      required: ["noteTitle", "reminderAt"],
      optional: ["noteContent", "noteDate"],
      notes: [
        "Lịch nhắc được tạo cho đúng user đang đăng nhập",
        "reminderAt nên ở dạng thời gian cụ thể (ISO hoặc YYYY-MM-DD HH:mm)",
      ],
      examples: [
        "Nhắc tôi họp với team lúc 2026-05-01 09:30",
        "Đặt báo thức nộp báo cáo vào 2026-05-03 08:00",
      ],
    },
    {
      id: "REPORT",
      purpose: "Tổng hợp tiến độ project/sprint cho người dùng",
      required: ["projectId"],
      optional: ["userId"],
      notes: [
        "Lấy theo dữ liệu thực tế từ DB",
      ],
      examples: [
        "Báo cáo dự án P-12345678",
      ],
    },
  ];
}

function getAgentUsageGuide() {
  return {
    principles: [
      "Reasoning trước, không đoán theo keyword đơn lẻ",
      "Sử dụng user memory + project hints để hiểu 'dự án này/dự án hiện tại'",
      "Nếu thiếu thông tin quan trọng thì hỏi tiếp để làm rõ",
      "Không đẩy xuất hành động vuot qua quyền policy",
    ],
    decisionFlow: [
      "1) Xác định mục tiêu người dùng",
      "2) Chọn function phù hợp nhất",
      "3) Trích xuất tham số bắt buộc/tương đối",
      "4) Điền tham số từ memory và context dự án",
      "5) Nếu còn thiếu => hỏi rõ từng trường",
      "6) Nếu đủ => trả action để preview/execute",
    ],
  };
}

function buildGuideForPrompt() {
  return {
    functions: getAgentFunctionList(),
    usageGuide: getAgentUsageGuide(),
  };
}

module.exports = {
  getAgentFunctionList,
  getAgentUsageGuide,
  buildGuideForPrompt,
};
