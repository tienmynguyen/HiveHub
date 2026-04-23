const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { readDb, writeDb } = require("../data/db");
const { roleName, findUsersByProject, isOwner } = require("../services/projectAccess");

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
  const userId = Number(req.query.userId);
  const body = req.body || {};
  const db = readDb();
  const project = {
    project_id: body.project_id || `P-${Date.now().toString().slice(-8)}`,
    projectName: body.projectName || "Untitled Project",
    projectDescription: body.projectDescription || "",
    projectowner: userId,
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

router.post("/updateuserproject", (req, res) => {
  const userId = Number(req.query.userId);
  const projectId = String(req.query.projectId);
  const roleId = Number(req.query.roleId || 1);
  const db = readDb();
  let link = db.userProjects.find((x) => x.projectId === projectId && x.userId === userId);
  if (!link) {
    link = { userProjectId: uuidv4(), projectId, userId, roleId };
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
  if (!isOwner(db, projectId, ownerId)) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Only owner can add members" });
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
