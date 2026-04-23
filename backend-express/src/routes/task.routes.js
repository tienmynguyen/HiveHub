const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { readDb, writeDb, ensureScrumSchema } = require("../data/db");
const { isOwner, ensureDefaultStoryForProject, createOwnerNotification } = require("../services/projectAccess");

const router = express.Router();

router.post("/addtask", (req, res) => {
  const projectId = String(req.query.projectId);
  const ownerId = Number(req.query.ownerId || req.body?.ownerId || 0);
  const storyIdFromQuery = req.query.storyId ? Number(req.query.storyId) : null;
  const body = req.body || {};
  const db = readDb();
  ensureScrumSchema(db);
  if (!isOwner(db, projectId, ownerId)) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Only owner can create subtask" });
  }
  const fallback = ensureDefaultStoryForProject(db, projectId);
  const storyId = Number(body.storyId || storyIdFromQuery || fallback.story.story_id);
  const story = db.stories.find((x) => Number(x.story_id) === storyId);
  const task = {
    task_id: db.tasks.length ? Math.max(...db.tasks.map((t) => t.task_id)) + 1 : 1,
    project_id: projectId,
    sprint_id: story?.sprint_id ?? fallback.sprint.sprint_id,
    epic_id: story?.epic_id ?? null,
    story_id: story?.story_id ?? fallback.story.story_id,
    taskName: body.taskName || "Untitled Task",
    description: body.description || "",
    taskStatus: body.taskStatus || "TODO",
    timeStart: body.timeStart || new Date().toISOString(),
    timeEnd: body.timeEnd || new Date().toISOString(),
    deadline: body.deadline || new Date().toISOString(),
    is_approved: false,
    txHash: null,
  };
  db.tasks.push(task);
  writeDb(db);
  return res.json(task);
});

router.post("/addusertask", (req, res) => {
  const taskId = Number(req.query.taskId);
  const userId = Number(req.query.userId);
  const db = readDb();
  const exists = db.userTasks.some((x) => x.taskId === taskId && x.userId === userId);
  if (!exists) db.userTasks.push({ id: uuidv4(), taskId, userId });
  writeDb(db);
  return res.json({ taskId, userId });
});

router.get("/gettaskbyprojectid", (req, res) => {
  const projectId = String(req.query.projectid || req.query.projectId);
  const sprintId = req.query.sprintId ? Number(req.query.sprintId) : null;
  const storyId = req.query.storyId ? Number(req.query.storyId) : null;
  const epicId = req.query.epicId ? Number(req.query.epicId) : null;
  const db = readDb();
  let tasks = db.tasks.filter((t) => String(t.project_id) === projectId);
  if (sprintId) tasks = tasks.filter((t) => Number(t.sprint_id) === sprintId);
  if (storyId) tasks = tasks.filter((t) => Number(t.story_id) === storyId);
  if (epicId) tasks = tasks.filter((t) => Number(t.epic_id) === epicId);
  return res.json(tasks);
});

router.get("/getsubtaskbystoryid", (req, res) => {
  const storyId = Number(req.query.storyId);
  const db = readDb();
  const tasks = db.tasks.filter((t) => Number(t.story_id) === storyId);
  return res.json(tasks);
});

router.get("/getalltaskbyuser", (req, res) => {
  const userId = Number(req.query.userId);
  const db = readDb();
  const taskIds = db.userTasks.filter((x) => x.userId === userId).map((x) => x.taskId);
  const tasks = db.tasks.filter((t) => taskIds.includes(t.task_id));
  return res.json(tasks);
});

router.get("/findtaskbydate", (req, res) => {
  const userId = Number(req.query.user_id);
  const date = String(req.query.date || "");
  const db = readDb();
  const taskIds = db.userTasks.filter((x) => x.userId === userId).map((x) => x.taskId);
  const tasks = db.tasks.filter((t) => {
    if (!taskIds.includes(t.task_id)) return false;
    const sourceDate = (t.deadline || t.timeStart || "").slice(0, 10);
    return sourceDate === date;
  });
  return res.json(tasks);
});

router.post("/updatetask", (req, res) => {
  const taskId = Number(req.query.taskId);
  const userId = Number(req.query.userId || req.body?.userId || 0);
  const body = req.body || {};
  const db = readDb();
  const task = db.tasks.find((t) => t.task_id === taskId);
  if (!task) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Task not found" });
  const owner = isOwner(db, task.project_id, userId);
  const assigned = db.userTasks.some((x) => Number(x.taskId) === Number(taskId) && Number(x.userId) === Number(userId));
  if (!owner && !assigned) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Not allowed to update this subtask" });
  }
  if (!owner) {
    if (body.taskStatus !== undefined) task.taskStatus = body.taskStatus;
    createOwnerNotification(
      db,
      task.project_id,
      userId,
      "SUBTASK_STATUS_CHANGED",
      `Subtask "${task.taskName}" changed to ${task.taskStatus}`
    );
  } else {
    Object.assign(task, body);
  }
  writeDb(db);
  return res.json(task);
});

router.post("/approvetask", (req, res) => {
  const taskId = Number(req.body.taskId);
  const db = readDb();
  const task = db.tasks.find((t) => t.task_id === taskId);
  if (!task) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Task not found" });
  task.taskStatus = "COMPLETED";
  task.is_approved = true;
  writeDb(db);
  return res.json({ taskStatus: task.taskStatus, message: "Approved" });
});

router.post("/rejecttask", (req, res) => {
  const taskId = Number(req.query.taskId);
  const reason = String(req.query.reason || "");
  const db = readDb();
  const task = db.tasks.find((t) => t.task_id === taskId);
  if (!task) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Task not found" });
  task.taskStatus = "IN_PROGRESS";
  task.is_approved = false;
  db.comments.push({
    comment_id: db.comments.length ? Math.max(...db.comments.map((c) => c.comment_id)) + 1 : 1,
    taskId,
    userId: Number(req.query.adminId || 0),
    commmentContent: `REJECTED: ${reason}`,
    date: new Date().toISOString(),
  });
  writeDb(db);
  return res.json(task);
});

router.get("/getalluserbytaskId", (req, res) => {
  const taskId = Number(req.query.taskId);
  const db = readDb();
  const userIds = db.userTasks.filter((x) => x.taskId === taskId).map((x) => x.userId);
  const users = db.users
    .filter((u) => userIds.includes(u.user_id))
    .map((u) => ({ user_id: u.user_id, email: u.email, username: u.username, imagePath: u.imagePath || null }));
  return res.json(users);
});

router.post("/postcomment", (req, res) => {
  const taskId = Number(req.query.taskId);
  const userId = Number(req.query.userId);
  const body = req.body || {};
  const db = readDb();
  const comment = {
    comment_id: db.comments.length ? Math.max(...db.comments.map((c) => c.comment_id)) + 1 : 1,
    taskId,
    userId,
    commmentContent: body.commmentContent || "",
    date: body.date || new Date().toISOString(),
    users: db.users.find((u) => u.user_id === userId) || null,
  };
  db.comments.push(comment);
  writeDb(db);
  return res.json(comment);
});

router.get("/getallcommentbyTask", (req, res) => {
  const taskId = Number(req.query.taskId);
  const db = readDb();
  const comments = db.comments
    .filter((c) => c.taskId === taskId)
    .map((c) => ({
      ...c,
      users: db.users.find((u) => u.user_id === c.userId) || null,
    }));
  return res.json(comments);
});

module.exports = router;
