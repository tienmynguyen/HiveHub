const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { readDb, writeDb, ensureScrumSchema } = require("../data/db");
const {
  roleName,
  findUsersByProject,
  isOwner,
  canManageProject,
  getUserRoleInProject,
} = require("../services/projectAccess");

const router = express.Router();

router.post("/updateuser", (req, res) => {
  const userId = Number(req.query.userId);
  const body = req.body || {};
  const db = readDb();
  const user = db.users.find((u) => u.user_id === userId);
  if (!user) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "User not found" });

  user.email = body.email || body.emaildto || user.email;
  user.username = body.userName || user.username;
  user.imagePath = body.imagePath ?? user.imagePath;
  user.description = body.description ?? user.description;
  user.walletAddress = body.walletAddress ?? user.walletAddress;
  writeDb(db);
  return res.json({ ...user, password: "********" });
});

router.post("/createdproject", (req, res) => {
  const userId = Number(req.query.userId || req.body?.userId || 0);
  const body = req.body || {};
  const db = readDb();

  const scale = body.projectScale || "MEDIUM";
  const methodology = (body.methodology || "SCRUM").toUpperCase();
  const wipLimits = body.wipLimits || { todo: 10, in_progress: 3, in_review: 3, done: 100 };

  let defaultPhases = body.phases || [];
  if (!defaultPhases.length) {
    if (methodology === "WATERFALL") {
      defaultPhases = [
        { phase_id: "P1", name: "1. Yêu Cầu & Phân Tích", status: "IN_PROGRESS", order: 1 },
        { phase_id: "P2", name: "2. Thiết Kế Hệ Thống", status: "TODO", order: 2 },
        { phase_id: "P3", name: "3. Phát Triển & Lập Trình", status: "TODO", order: 3 },
        { phase_id: "P4", name: "4. Kiểm Thử (QA / UAT)", status: "TODO", order: 4 },
        { phase_id: "P5", name: "5. Nghiệm Thu & Blockchain PoW", status: "TODO", order: 5 },
      ];
    } else if (methodology === "HYBRID") {
      defaultPhases = [
        { phase_id: "H1", name: "Giai Đoạn 1 (Waterfall): Khởi Tạo & Yêu Cầu", status: "IN_PROGRESS", order: 1 },
        { phase_id: "H2", name: "Giai Đoạn 2 (Agile Scrum/Kanban): Phát Triển Tính Năng", status: "TODO", order: 2 },
        { phase_id: "H3", name: "Giai Đoạn 3 (Waterfall): Kiểm Thử & Triển Khai", status: "TODO", order: 3 },
      ];
    }
  }

  const project = {
    project_id: body.project_id || `P-${Date.now().toString().slice(-8)}`,
    projectName: body.projectName || "Untitled Project",
    projectDescription: body.projectDescription || "",
    projectowner: userId,
    projectScale: scale,
    methodology: methodology,
    wipLimits: wipLimits,
    phases: defaultPhases,
    timeStart: body.timeStart || new Date().toISOString(),
    timeEnd: body.timeEnd || new Date().toISOString(),
  };

  db.projects.push(project);
  db.userProjects.push({
    userProjectId: uuidv4(),
    projectId: String(project.project_id),
    userId,
    roleId: 3,
  });
  writeDb(db);
  return res.json(project);
});

router.get("/getprjectbyuserId", (req, res) => {
  const userId = Number(req.query.userId);
  const db = readDb();
  const projectIds = db.userProjects.filter((x) => x.userId === userId).map((x) => x.projectId);
  const projects = db.projects.filter((p) => projectIds.includes(String(p.project_id)));
  return res.json(projects);
});

router.post("/joinproject", (req, res) => {
  const userId = Number(req.query.userId);
  const projectId = String(req.query.projectId);
  const db = readDb();
  const exists = db.userProjects.some((x) => x.projectId === projectId && x.userId === userId);
  if (!exists) {
    db.userProjects.push({ userProjectId: uuidv4(), projectId, userId, roleId: 1 });
    writeDb(db);
  }
  return res.json({ projectId, userId });
});

router.get("/getprojectbyid", (req, res) => {
  const projectId = String(req.query.projectId || "");
  const userId = Number(req.query.userId || 0);
  if (!projectId || !userId) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Missing projectId or userId" });
  }
  const db = readDb();
  if (getUserRoleInProject(db, projectId, userId) == null) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Not a project member" });
  }
  const project = db.projects.find((p) => String(p.project_id) === projectId);
  if (!project) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Project not found" });
  return res.json(project);
});

router.post("/updateuserproject", (req, res) => {
  const targetUserId = Number(req.query.userId);
  const projectId = String(req.query.projectId);
  const roleId = Number(req.query.roleId || 1);
  const actorId = Number(req.query.actorId || 0);
  const db = readDb();
  const project = db.projects.find((p) => String(p.project_id) === projectId);
  if (!project) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Project not found" });
  if (!actorId) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Missing actorId" });
  }
  if (getUserRoleInProject(db, projectId, actorId) == null) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Actor is not in this project" });
  }

  const ownerUserId = Number(project.projectowner);
  if (Number(targetUserId) === ownerUserId && roleId !== 3) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Cannot change project owner's role" });
  }
  if (roleId === 3 && Number(targetUserId) !== ownerUserId) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Owner role is reserved for project creator" });
  }

  if (Number(targetUserId) !== Number(actorId)) {
    if (!isOwner(db, projectId, actorId)) {
      return res.status(403).json({ code: "FORBIDDEN", message: "Only project owner can change another member's role" });
    }
  } else if (roleId === 3 && Number(actorId) !== ownerUserId) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Cannot self-assign Owner" });
  }

  let link = db.userProjects.find((x) => x.projectId === projectId && Number(x.userId) === Number(targetUserId));
  if (!link) {
    link = { userProjectId: uuidv4(), projectId, userId: targetUserId, roleId };
    db.userProjects.push(link);
  } else {
    link.roleId = roleId;
  }
  writeDb(db);
  return res.json({
    ...link,
    role: { role_id: roleId, roleName: roleName(roleId) },
  });
});

router.post("/removememberfromproject", (req, res) => {
  const projectId = String(req.query.projectId || "");
  const targetUserId = Number(req.query.targetUserId || 0);
  const actorId = Number(req.query.actorId || 0);
  if (!projectId || !targetUserId || !actorId) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Missing projectId, targetUserId, or actorId" });
  }
  const db = readDb();
  const project = db.projects.find((p) => String(p.project_id) === projectId);
  if (!project) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Project not found" });
  if (!isOwner(db, projectId, actorId)) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Only owner can remove members" });
  }
  if (Number(targetUserId) === Number(project.projectowner)) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Cannot remove project owner" });
  }
  const before = db.userProjects.length;
  db.userProjects = db.userProjects.filter(
    (x) => !(String(x.projectId) === projectId && Number(x.userId) === Number(targetUserId))
  );
  if (db.userProjects.length === before) {
    return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Member link not found" });
  }

  // Get all task IDs of this project
  const projectTaskIds = db.tasks
    .filter((t) => String(t.project_id) === projectId)
    .map((t) => Number(t.task_id));

  // Unassign the user from these project tasks
  db.userTasks = db.userTasks.filter(
    (ut) => !(projectTaskIds.includes(Number(ut.taskId)) && Number(ut.userId) === Number(targetUserId))
  );

  // Unassign the user from stories in this project
  db.stories.forEach((story) => {
    if (String(story.project_id) === projectId && Number(story.assignee_user_id) === Number(targetUserId)) {
      story.assignee_user_id = null;
    }
  });

  writeDb(db);
  return res.json({ ok: true, projectId, removedUserId: targetUserId });
});

function deleteProjectCascade(db, projectId) {
  const pid = String(projectId);
  ensureScrumSchema(db);
  if (!Array.isArray(db.tasks)) db.tasks = [];
  if (!Array.isArray(db.userTasks)) db.userTasks = [];
  if (!Array.isArray(db.comments)) db.comments = [];
  if (!Array.isArray(db.messages)) db.messages = [];
  const storyIds = db.stories.filter((s) => String(s.project_id) === pid).map((s) => Number(s.story_id));
  const taskIds = db.tasks.filter((t) => String(t.project_id) === pid).map((t) => Number(t.task_id));
  db.userTasks = (db.userTasks || []).filter((x) => !taskIds.includes(Number(x.taskId)));
  db.comments = (db.comments || []).filter((x) => !taskIds.includes(Number(x.taskId)));
  db.storyComments = (db.storyComments || []).filter((c) => !storyIds.includes(Number(c.storyId)));
  db.tasks = db.tasks.filter((t) => String(t.project_id) !== pid);
  db.stories = db.stories.filter((s) => String(s.project_id) !== pid);
  db.sprints = db.sprints.filter((s) => String(s.project_id) !== pid);
  db.epics = (db.epics || []).filter((e) => String(e.project_id) !== pid);
  db.messages = (db.messages || []).filter((m) => String(m.project_id) !== pid);
  db.notifications = (db.notifications || []).filter((n) => String(n.projectId) !== pid);
  db.userProjects = db.userProjects.filter((x) => String(x.projectId) !== pid);
  db.projects = db.projects.filter((p) => String(p.project_id) !== pid);
}

router.post("/deleteproject", (req, res) => {
  const projectId = String(req.query.projectId || "");
  const actorId = Number(req.query.actorId || 0);
  const confirmProjectId = String((req.body && req.body.confirmProjectId) || "").trim();
  if (!projectId || !actorId) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Missing projectId or actorId" });
  }
  if (confirmProjectId !== projectId) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "confirmProjectId must match project id" });
  }
  const db = readDb();
  const project = db.projects.find((p) => String(p.project_id) === projectId);
  if (!project) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Project not found" });
  if (!isOwner(db, projectId, actorId)) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Only owner can delete project" });
  }
  if (Number(project.projectowner) !== Number(actorId)) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Only the project creator can delete this project" });
  }
  deleteProjectCascade(db, projectId);
  writeDb(db);
  return res.json({ ok: true, deletedProjectId: projectId });
});

router.get("/findroleinuspr", (req, res) => {
  const userId = Number(req.query.userId);
  const projectId = String(req.query.projectId);
  const db = readDb();
  const link = db.userProjects.find((x) => x.projectId === projectId && x.userId === userId);
  if (!link) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Role not found" });
  return res.json({
    projectId,
    userId,
    role: { role_id: link.roleId, roleName: roleName(link.roleId) },
  });
});

router.get("/getalluserbyprojectId", (req, res) => {
  const projectId = String(req.query.projectId);
  const db = readDb();
  return res.json(findUsersByProject(db, projectId));
});

router.post("/addmemberbyemail", (req, res) => {
  const projectId = String(req.query.projectId);
  const ownerId = Number(req.query.ownerId || 0);
  const email = String((req.body?.email || "").trim()).toLowerCase();
  if (!email) return res.status(400).json({ code: "VALIDATION_ERROR", message: "Missing email" });
  const db = readDb();
  if (!canManageProject(db, projectId, ownerId)) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Only owner or management can add members" });
  }
  const user = db.users.find((u) => String(u.email || "").toLowerCase() === email);
  if (!user) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "User with email not found" });
  const exists = db.userProjects.some((x) => String(x.projectId) === projectId && Number(x.userId) === Number(user.user_id));
  if (!exists) {
    db.userProjects.push({
      userProjectId: uuidv4(),
      projectId,
      userId: Number(user.user_id),
      roleId: 1,
    });
    writeDb(db);
  }
  return res.json({ projectId, userId: user.user_id, email: user.email, roleId: 1 });
});

module.exports = router;
