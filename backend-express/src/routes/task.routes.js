const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { readDb, writeDb, ensureScrumSchema } = require("../data/db");
const env = require("../config/env");
const { canManageProject, getUserRoleInProject, ensureDefaultStoryForProject, createOwnerNotification } = require("../services/projectAccess");
const { recordTaskApprovalOnChain } = require("../services/blockchainAuditService");
const { isEnabled: isOnchainEnabled, submitTaskApprovalOnChain } = require("../services/onchainApprovalService");

const router = express.Router();

function enrichTasks(db, tasks) {
  return tasks.map((t) => {
    const project = db.projects.find((p) => String(p.project_id) === String(t.project_id));
    const userTaskLinks = db.userTasks.filter((ut) => Number(ut.taskId) === Number(t.task_id));
    const assigneeIds = userTaskLinks.map((ut) => Number(ut.userId));
    const assignees = db.users
      .filter((u) => assigneeIds.includes(Number(u.user_id)))
      .map((u) => ({ user_id: u.user_id, username: u.username, email: u.email, imagePath: u.imagePath }));

    return {
      ...t,
      project: project ? { projectName: project.projectName } : null,
      projectName: project ? project.projectName : "Dự án cá nhân",
      assignees,
    };
  });
}

router.post("/addtask", (req, res) => {
  const projectId = String(req.query.projectId);
  const ownerId = Number(req.query.ownerId || req.query.actorId || req.query.userId || req.body?.ownerId || req.body?.actorId || req.body?.userId || 0);
  const storyIdFromQuery = req.query.storyId ? Number(req.query.storyId) : null;
  const sprintIdFromQuery = req.query.sprintId ? Number(req.query.sprintId) : null;
  const body = req.body || {};
  const db = readDb();
  ensureScrumSchema(db);

  const memberRole = getUserRoleInProject(db, projectId, ownerId);
  if (!memberRole && ownerId !== 0) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Only project members can create task" });
  }

  const fallback = ensureDefaultStoryForProject(db, projectId);
  const storyId = Number(body.storyId || body.story_id || storyIdFromQuery || fallback.story.story_id);
  const story = db.stories.find((x) => Number(x.story_id) === storyId);

  const targetSprintId = Number(body.sprint_id || body.sprintId || sprintIdFromQuery || story?.sprint_id || fallback.sprint.sprint_id);

  const task = {
    task_id: db.tasks.length ? Math.max(...db.tasks.map((t) => t.task_id)) + 1 : 1,
    project_id: projectId,
    sprint_id: targetSprintId,
    epic_id: story?.epic_id ?? null,
    story_id: storyId,
    phaseId: body.phaseId || null,
    dependsOnTaskId: body.dependsOnTaskId ? Number(body.dependsOnTaskId) : null,
    pairUserId: body.pairUserId ? Number(body.pairUserId) : null,
    taskName: body.taskName || "Untitled Task",
    description: body.description || "",
    taskStatus: body.taskStatus || "TODO",
    priority: body.priority || "MEDIUM",
    timeStart: body.timeStart || new Date().toISOString(),
    timeEnd: body.timeEnd || new Date().toISOString(),
    deadline: body.deadline || new Date().toISOString(),
    is_approved: false,
    txHash: null,
  };
  db.tasks.push(task);
  writeDb(db);
  const enriched = enrichTasks(db, [task])[0];
  return res.json(enriched);
});

router.post("/addusertask", (req, res) => {
  const taskId = Number(req.query.taskId);
  const userId = Number(req.query.userId);
  const actorId = Number(req.query.actorId || req.body?.actorId || 0);
  const db = readDb();
  const task = db.tasks.find((t) => t.task_id === taskId);
  if (!task) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Task not found" });

  if (getUserRoleInProject(db, task.project_id, actorId) == null) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Only project members can add assignees" });
  }

  if (!db.userTasks.some((x) => Number(x.taskId) === taskId && Number(x.userId) === userId)) {
    db.userTasks.push({ taskId, userId });
    writeDb(db);
  }
  return res.json(enrichTasks(db, [task])[0]);
});

router.post("/removeusertask", (req, res) => {
  const taskId = Number(req.query.taskId);
  const userId = Number(req.query.userId);
  const actorId = Number(req.query.actorId || req.body?.actorId || 0);
  const db = readDb();
  const task = db.tasks.find((t) => t.task_id === taskId);
  if (!task) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Task not found" });

  if (getUserRoleInProject(db, task.project_id, actorId) == null) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Only project members can remove assignees" });
  }

  db.userTasks = db.userTasks.filter((x) => !(Number(x.taskId) === taskId && Number(x.userId) === userId));
  writeDb(db);
  return res.json(enrichTasks(db, [task])[0]);
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
  return res.json(enrichTasks(db, tasks));
});

router.get("/getsubtaskbystoryid", (req, res) => {
  const storyId = Number(req.query.storyId);
  const db = readDb();
  const tasks = db.tasks.filter((t) => Number(t.story_id) === storyId);
  return res.json(enrichTasks(db, tasks));
});

router.get("/getalltaskbyuser", (req, res) => {
  const userId = Number(req.query.userId);
  const db = readDb();
  const taskIds = db.userTasks.filter((x) => x.userId === userId).map((x) => x.taskId);
  const tasks = db.tasks.filter((t) => taskIds.includes(t.task_id));
  return res.json(enrichTasks(db, tasks));
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
  return res.json(enrichTasks(db, tasks));
});

function formatDurationMs(ms) {
  if (!ms || ms <= 0) return "0 phút";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} ngày ${hours % 24} giờ`;
  }
  if (hours > 0) {
    return `${hours} giờ ${minutes % 60} phút`;
  }
  if (minutes > 0) {
    return `${minutes} phút`;
  }
  return `${seconds} giây`;
}

function logTaskStatusChange(db, task, oldStatus, newStatus, userId) {
  if (!Array.isArray(db.taskLogs)) db.taskLogs = [];
  if (oldStatus === newStatus) return;

  let executionDurationText = null;
  let durationMs = 0;

  if (newStatus === "IN_PROGRESS") {
    task.inProgressStartedAt = new Date().toISOString();
  }

  if (oldStatus === "IN_PROGRESS" && (newStatus === "IN_REVIEW" || newStatus === "DONE" || newStatus === "APPROVED")) {
    if (task.inProgressStartedAt) {
      durationMs = Date.now() - new Date(task.inProgressStartedAt).getTime();
      task.executionDurationMs = (task.executionDurationMs || 0) + durationMs;
      task.executionDurationText = formatDurationMs(task.executionDurationMs);
      executionDurationText = formatDurationMs(durationMs);
    }
  }

  db.taskLogs.push({
    log_id: uuidv4(),
    task_id: task.task_id,
    project_id: task.project_id,
    taskName: task.taskName,
    user_id: Number(userId),
    oldStatus: oldStatus || "TODO",
    newStatus: newStatus,
    durationMs: durationMs,
    executionDurationText: executionDurationText,
    timestamp: new Date().toISOString(),
  });
}

router.get("/gettaskhistory", (req, res) => {
  const projectId = String(req.query.projectId);
  const db = readDb();
  if (!Array.isArray(db.taskLogs)) db.taskLogs = [];
  const logs = db.taskLogs
    .filter((l) => String(l.project_id) === projectId)
    .map((l) => {
      const u = db.users.find((user) => Number(user.user_id) === Number(l.user_id));
      return {
        ...l,
        username: u ? u.username : "Thành viên",
        email: u ? u.email : "",
      };
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return res.json(logs);
});

router.post("/updatetask", (req, res) => {
  const taskId = Number(req.query.taskId);
  const userId = Number(req.query.userId || req.body?.userId || 0);
  const body = req.body || {};
  const db = readDb();
  const task = db.tasks.find((t) => t.task_id === taskId);
  if (!task) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Task not found" });
  const manager = canManageProject(db, task.project_id, userId);
  const assigned = db.userTasks.some((x) => Number(x.taskId) === Number(taskId) && Number(x.userId) === Number(userId));
  if (!manager && !assigned) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Not allowed to update this subtask" });
  }

  const oldStatus = task.taskStatus;
  const newStatus = body.taskStatus || oldStatus;

  // Enforce Waterfall Prerequisite Task Constraint
  if (newStatus === "IN_PROGRESS" || newStatus === "IN_REVIEW" || newStatus === "DONE" || newStatus === "APPROVED") {
    const dependsOnId = body.dependsOnTaskId !== undefined ? body.dependsOnTaskId : task.dependsOnTaskId;
    if (dependsOnId) {
      const prereqTask = db.tasks.find((t) => Number(t.task_id) === Number(dependsOnId));
      if (prereqTask) {
        const prereqDone = prereqTask.taskStatus === "DONE" || prereqTask.taskStatus === "APPROVED" || prereqTask.is_approved;
        if (!prereqDone) {
          return res.status(400).json({
            code: "PREREQUISITE_NOT_COMPLETED",
            message: `🔒 Công việc "${task.taskName}" phụ thuộc vào task tiên quyết "${prereqTask.taskName}" (Mã #${prereqTask.task_id}) chưa hoàn thành!`
          });
        }
      }
    }
  }

  if (!manager) {
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

  logTaskStatusChange(db, task, oldStatus, newStatus, userId);

  writeDb(db);
  return res.json(enrichTasks(db, [task])[0]);
});

router.post("/approvetask", async (req, res) => {
  const taskId = Number(req.body.taskId);
  const approverId = Number(req.body.adminId || req.body.userId || 0);
  const db = readDb();
  ensureScrumSchema(db);
  const task = db.tasks.find((t) => t.task_id === taskId);
  if (!task) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Task not found" });
  if (!canManageProject(db, task.project_id, approverId)) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Only owner or management can approve subtask" });
  }

  let chainRecord = null;
  const approvalPayload = {
    taskId: task.task_id,
    projectId: task.project_id,
    approverUserId: approverId,
    approvedStatus: "APPROVED",
    note: String(req.body.note || ""),
  };
  try {
    if (isOnchainEnabled()) {
      chainRecord = await submitTaskApprovalOnChain(approvalPayload);
    } else {
      chainRecord = { mode: "off" };
    }
  } catch (err) {
    if (env.BLOCKCHAIN_REQUIRED) {
      return res.status(503).json({
        code: "BLOCKCHAIN_UNAVAILABLE",
        message: `Blockchain approval failed: ${err?.message || err}`,
      });
    }
    chainRecord = { mode: "fallback_error", error: err?.message || String(err) };
  }

  const auditRecord = recordTaskApprovalOnChain(db, approvalPayload);
  const effectiveTxHash = chainRecord?.txHash || auditRecord.txHash;
  const effectiveBlockHash = chainRecord?.blockHash || auditRecord.blockHash;

  task.taskStatus = "APPROVED";
  task.is_approved = true;
  task.approvedBy = approverId;
  task.approvedAt = new Date().toISOString();
  task.txHash = effectiveTxHash;
  task.blockHash = effectiveBlockHash;
  task.onChainMode = chainRecord?.mode || "local_audit";
  task.onChainSynced = Boolean(chainRecord?.txHash);
  writeDb(db);
  return res.json({
    taskStatus: task.taskStatus,
    txHash: effectiveTxHash,
    blockHash: effectiveBlockHash,
    onChainMode: task.onChainMode,
    onChainSynced: task.onChainSynced,
    message: task.onChainSynced
      ? "Approved and recorded on blockchain"
      : "Approved with local audit fallback",
  });
});

router.get("/task-approval/:taskId", (req, res) => {
  const taskId = Number(req.params.taskId || 0);
  const db = readDb();
  const task = db.tasks.find((t) => Number(t.task_id) === taskId);
  if (!task) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Task not found" });

  const txHash = task.txHash || null;
  const explorerTxUrl =
    txHash && env.BLOCKCHAIN_EXPLORER_TX_URL
      ? `${String(env.BLOCKCHAIN_EXPLORER_TX_URL).replace(/\/$/, "")}/${txHash}`
      : null;

  return res.json({
    taskId: task.task_id,
    taskStatus: task.taskStatus,
    isApproved: Boolean(task.is_approved),
    approvedBy: task.approvedBy || null,
    approvedAt: task.approvedAt || null,
    txHash,
    blockHash: task.blockHash || null,
    onChainMode: task.onChainMode || null,
    onChainSynced: Boolean(task.onChainSynced),
    explorerTxUrl,
  });
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

router.delete("/deletetask", (req, res) => {
  const taskId = Number(req.query.taskId);
  const userId = Number(req.query.userId || 0);
  const db = readDb();
  const task = db.tasks.find((t) => Number(t.task_id) === taskId);
  if (!task) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Task not found" });
  if (!canManageProject(db, task.project_id, userId)) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Only owner or management can delete subtask" });
  }

  db.tasks = db.tasks.filter((t) => Number(t.task_id) !== taskId);
  db.userTasks = db.userTasks.filter((x) => Number(x.taskId) !== taskId);
  db.comments = db.comments.filter((x) => Number(x.taskId) !== taskId);

  writeDb(db);
  return res.json({ ok: true });
});

module.exports = router;
