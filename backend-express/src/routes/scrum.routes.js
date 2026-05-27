const express = require("express");
const { readDb, writeDb, ensureScrumSchema, nextNumericId } = require("../data/db");
const { canManageProject, createOwnerNotification } = require("../services/projectAccess");

const router = express.Router();

router.get("/notifications", (req, res) => {
  const projectId = String(req.query.projectId || "");
  const userId = Number(req.query.userId || 0);
  const db = readDb();
  ensureScrumSchema(db);
  let items = db.notifications.filter((n) => Number(n.ownerUserId) === userId);
  if (projectId) items = items.filter((n) => String(n.projectId) === projectId);
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json(items);
});

router.post("/notifications/read", (req, res) => {
  const notificationId = Number(req.query.notificationId || 0);
  const userId = Number(req.query.userId || 0);
  const db = readDb();
  ensureScrumSchema(db);
  const item = db.notifications.find((n) => Number(n.notification_id) === notificationId);
  if (!item) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Notification not found" });
  if (Number(item.ownerUserId) !== userId) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Not allowed" });
  }
  item.read = true;
  writeDb(db);
  return res.json(item);
});

router.post("/addsprint", (req, res) => {
  const projectId = String(req.query.projectId);
  const ownerId = Number(req.query.ownerId || req.body?.ownerId || 0);
  const body = req.body || {};
  const db = readDb();
  ensureScrumSchema(db);
  if (!canManageProject(db, projectId, ownerId)) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Only owner or management can create sprint" });
  }
  const sprint = {
    sprint_id: nextNumericId(db.sprints, "sprint_id"),
    project_id: projectId,
    sprintName: body.sprintName || `Sprint ${db.sprints.length + 1}`,
    sprintGoal: body.sprintGoal || "",
    sprintStatus: body.sprintStatus || "TODO",
    timeStart: body.timeStart || new Date().toISOString(),
    timeEnd: body.timeEnd || new Date().toISOString(),
    isDefault: false,
  };
  db.sprints.push(sprint);
  writeDb(db);
  return res.json(sprint);
});

router.get("/getsprintbyprojectid", (req, res) => {
  const projectId = String(req.query.projectId);
  const db = readDb();
  ensureScrumSchema(db);
  return res.json(db.sprints.filter((x) => String(x.project_id) === projectId));
});

router.post("/updatesprint", (req, res) => {
  const sprintId = Number(req.query.sprintId);
  const userId = Number(req.query.userId || req.body?.userId || 0);
  const body = req.body || {};
  const db = readDb();
  ensureScrumSchema(db);
  const sprint = db.sprints.find((x) => Number(x.sprint_id) === sprintId);
  if (!sprint) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Sprint not found" });
  if (!canManageProject(db, sprint.project_id, userId)) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Only owner or management can update sprint" });
  }
  if (body.sprintName !== undefined) sprint.sprintName = body.sprintName;
  if (body.sprintGoal !== undefined) sprint.sprintGoal = body.sprintGoal;
  if (body.sprintStatus !== undefined) sprint.sprintStatus = body.sprintStatus;
  if (body.timeStart !== undefined) sprint.timeStart = body.timeStart;
  if (body.timeEnd !== undefined) sprint.timeEnd = body.timeEnd;
  writeDb(db);
  return res.json(sprint);
});

router.delete("/deletesprint", (req, res) => {
  const sprintId = Number(req.query.sprintId);
  const userId = Number(req.query.userId || 0);
  const db = readDb();
  ensureScrumSchema(db);
  const sprint = db.sprints.find((x) => Number(x.sprint_id) === sprintId);
  if (!sprint) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Sprint not found" });
  if (!canManageProject(db, sprint.project_id, userId)) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Only owner or management can delete sprint" });
  }

  const storyIds = db.stories.filter((x) => Number(x.sprint_id) === sprintId).map((x) => Number(x.story_id));
  const taskIds = db.tasks
    .filter((x) => Number(x.sprint_id) === sprintId || storyIds.includes(Number(x.story_id)))
    .map((x) => Number(x.task_id));

  db.sprints = db.sprints.filter((x) => Number(x.sprint_id) !== sprintId);
  db.stories = db.stories.filter((x) => Number(x.sprint_id) !== sprintId);
  db.tasks = db.tasks.filter((x) => !taskIds.includes(Number(x.task_id)));
  db.userTasks = db.userTasks.filter((x) => !taskIds.includes(Number(x.taskId)));
  db.comments = db.comments.filter((x) => !taskIds.includes(Number(x.taskId)));
  db.storyComments = db.storyComments.filter((x) => !storyIds.includes(Number(x.storyId)));

  writeDb(db);
  return res.json({ ok: true });
});

router.post("/addepic", (req, res) => {
  const projectId = String(req.query.projectId);
  const body = req.body || {};
  const db = readDb();
  ensureScrumSchema(db);
  const epic = {
    epic_id: nextNumericId(db.epics, "epic_id"),
    project_id: projectId,
    epicName: body.epicName || `Epic ${db.epics.length + 1}`,
    description: body.description || "",
  };
  db.epics.push(epic);
  writeDb(db);
  return res.json(epic);
});

router.get("/getepicbyprojectid", (req, res) => {
  const projectId = String(req.query.projectId);
  const db = readDb();
  ensureScrumSchema(db);
  return res.json(db.epics.filter((x) => String(x.project_id) === projectId));
});

router.post("/addstory", (req, res) => {
  const projectId = String(req.query.projectId);
  const ownerId = Number(req.query.ownerId || req.body?.ownerId || 0);
  const sprintId = req.query.sprintId ? Number(req.query.sprintId) : null;
  const epicId = req.query.epicId ? Number(req.query.epicId) : null;
  const body = req.body || {};
  const db = readDb();
  ensureScrumSchema(db);
  if (!canManageProject(db, projectId, ownerId)) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Only owner or management can create story" });
  }

  const story = {
    story_id: nextNumericId(db.stories, "story_id"),
    project_id: projectId,
    sprint_id: sprintId,
    epic_id: epicId,
    storyName: body.storyName || `Story ${db.stories.length + 1}`,
    description: body.description || "",
    storyStatus: body.storyStatus || "TODO",
    storyOrder: Number(body.storyOrder || db.stories.length + 1),
    assignee_user_id: body.assigneeUserId ? Number(body.assigneeUserId) : null,
    isDefault: false,
  };
  db.stories.push(story);
  writeDb(db);
  return res.json(story);
});

router.get("/getstorybyprojectid", (req, res) => {
  const projectId = String(req.query.projectId);
  const sprintId = req.query.sprintId ? Number(req.query.sprintId) : null;
  const epicId = req.query.epicId ? Number(req.query.epicId) : null;
  const db = readDb();
  ensureScrumSchema(db);
  let stories = db.stories.filter((x) => String(x.project_id) === projectId);
  if (sprintId) stories = stories.filter((x) => Number(x.sprint_id) === sprintId);
  if (epicId) stories = stories.filter((x) => Number(x.epic_id) === epicId);
  const withMeta = stories.map((story) => {
    let assignee = null;
    if (story.assignee_user_id) {
      assignee = db.users.find((u) => Number(u.user_id) === Number(story.assignee_user_id)) || null;
    }
    const storySubTasks = db.tasks.filter((t) => Number(t.story_id) === Number(story.story_id));
    const completedCount = storySubTasks.filter(
      (t) => t.taskStatus === "COMPLETED" || t.taskStatus === "DONE" || t.taskStatus === "APPROVED"
    ).length;
    return {
      ...story,
      assignee,
      subTaskCount: storySubTasks.length,
      completedSubTaskCount: completedCount,
    };
  });
  return res.json(withMeta);
});

router.get("/getstorybyid", (req, res) => {
  const storyId = Number(req.query.storyId);
  const db = readDb();
  ensureScrumSchema(db);
  const story = db.stories.find((x) => Number(x.story_id) === storyId);
  if (!story) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Story not found" });
  const assignee = story.assignee_user_id
    ? db.users.find((u) => Number(u.user_id) === Number(story.assignee_user_id)) || null
    : null;
  const subTasks = db.tasks.filter((t) => Number(t.story_id) === storyId);
  const completedCount = subTasks.filter(
    (t) => t.taskStatus === "COMPLETED" || t.taskStatus === "DONE" || t.taskStatus === "APPROVED"
  ).length;
  return res.json({
    ...story,
    assignee,
    subTaskCount: subTasks.length,
    completedSubTaskCount: completedCount,
  });
});

router.post("/updatestory", (req, res) => {
  const storyId = Number(req.query.storyId);
  const userId = Number(req.query.userId || req.body?.userId || 0);
  const body = req.body || {};
  const db = readDb();
  ensureScrumSchema(db);
  const story = db.stories.find((x) => Number(x.story_id) === storyId);
  if (!story) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Story not found" });
  const manager = canManageProject(db, story.project_id, userId);
  const assignee = Number(story.assignee_user_id || 0) === Number(userId);
  if (!manager && !assignee) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Not allowed to update this story" });
  }

  if (!manager) {
    if (body.storyStatus !== undefined) story.storyStatus = body.storyStatus;
    createOwnerNotification(
      db,
      story.project_id,
      userId,
      "STORY_STATUS_CHANGED",
      `Story "${story.storyName}" changed to ${story.storyStatus}`
    );
  } else {
    if (body.storyName !== undefined) story.storyName = body.storyName;
    if (body.description !== undefined) story.description = body.description;
    if (body.storyStatus !== undefined) story.storyStatus = body.storyStatus;
    if (body.assigneeUserId !== undefined) story.assignee_user_id = body.assigneeUserId ? Number(body.assigneeUserId) : null;
  }
  writeDb(db);
  return res.json(story);
});

router.get("/getallcommentbystory", (req, res) => {
  const storyId = Number(req.query.storyId);
  const db = readDb();
  ensureScrumSchema(db);
  const comments = db.storyComments
    .filter((c) => Number(c.storyId) === storyId)
    .map((c) => ({
      ...c,
      users: db.users.find((u) => Number(u.user_id) === Number(c.userId)) || null,
    }));
  return res.json(comments);
});

router.post("/poststorycomment", (req, res) => {
  const storyId = Number(req.query.storyId);
  const userId = Number(req.query.userId);
  const body = req.body || {};
  const db = readDb();
  ensureScrumSchema(db);
  const comment = {
    comment_id: db.storyComments.length ? Math.max(...db.storyComments.map((c) => Number(c.comment_id || 0))) + 1 : 1,
    storyId,
    userId,
    commmentContent: body.commmentContent || "",
    date: body.date || new Date().toISOString(),
  };
  db.storyComments.push(comment);
  writeDb(db);
  return res.json({
    ...comment,
    users: db.users.find((u) => Number(u.user_id) === userId) || null,
  });
});

router.delete("/deletestory", (req, res) => {
  const storyId = Number(req.query.storyId);
  const userId = Number(req.query.userId || 0);
  const db = readDb();
  ensureScrumSchema(db);
  const story = db.stories.find((x) => Number(x.story_id) === storyId);
  if (!story) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Story not found" });
  if (!canManageProject(db, story.project_id, userId)) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Only owner or management can delete story" });
  }

  const taskIds = db.tasks.filter((x) => Number(x.story_id) === storyId).map((x) => Number(x.task_id));

  db.stories = db.stories.filter((x) => Number(x.story_id) !== storyId);
  db.tasks = db.tasks.filter((x) => Number(x.story_id) !== storyId);
  db.userTasks = db.userTasks.filter((x) => !taskIds.includes(Number(x.taskId)));
  db.comments = db.comments.filter((x) => !taskIds.includes(Number(x.taskId)));
  db.storyComments = db.storyComments.filter((x) => Number(x.storyId) !== storyId);

  writeDb(db);
  return res.json({ ok: true });
});

module.exports = router;
