const { canManageProject, getUserRoleInProject } = require("./projectAccess");

function canExecuteAction(db, action, userId) {
  const canManage = canManageProject(db, action.projectId, userId);
  switch (action.type) {
    case "CREATE_PROJECT":
    case "CREATE_PROJECT_BLUEPRINT":
    case "CREATE_CALENDAR_NOTE":
      return true;
    case "CREATE_SPRINT":
    case "CREATE_STORY":
    case "CREATE_TASK":
    case "UPDATE_SPRINT_STATUS":
      return canManage;
    case "REPORT":
      return getUserRoleInProject(db, action.projectId, userId) !== null;
    default:
      return false;
  }
}

function explainPolicy(action) {
  switch (action.type) {
    case "CREATE_PROJECT":
      return "Mọi user đã đăng nhập đều có thể tạo project.";
    case "CREATE_PROJECT_BLUEPRINT":
      return "Mọi user đã đăng nhập đều có thể tạo project theo blueprint.";
    case "CREATE_CALENDAR_NOTE":
      return "Mọi user đã đăng nhập đều có thể tạo lịch nhắc cá nhân.";
    case "CREATE_SPRINT":
    case "CREATE_STORY":
    case "CREATE_TASK":
    case "UPDATE_SPRINT_STATUS":
      return "Chỉ Owner hoặc Management của project mới được phép thực hiện thao tác này.";
    case "REPORT":
      return "Mọi thành viên tham gia dự án đều có thể xem báo cáo.";
    default:
      return "Không xác định quyền cho thao tác.";
  }
}

module.exports = {
  canExecuteAction,
  explainPolicy,
};
