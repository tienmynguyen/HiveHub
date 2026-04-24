const { v4: uuidv4 } = require("uuid");
const { nextNumericId, ensureScrumSchema } = require("../data/db");
const { canExecuteAction, explainPolicy } = require("./agentPolicyService");

function executeAction(db, action, userId) {
  ensureScrumSchema(db);
  if (!canExecuteAction(db, action, userId)) {
    return {
      ok: false,
      error: "FORBIDDEN",
      message: explainPolicy(action),
    };
  }

  function hasProject(projectId) {
    return db.projects.some((p) => String(p.project_id) === String(projectId));
  }

  if (action.type === "CREATE_PROJECT") {
    const project = {
      project_id: `P-${Date.now().toString().slice(-8)}`,
      projectName: action.projectName,
      projectDescription: action.projectDescription || "",
      projectowner: Number(userId),
      timeStart: new Date().toISOString(),
      timeEnd: new Date().toISOString(),
    };
    db.projects.push(project);
    db.userProjects.push({
      userProjectId: uuidv4(),
      projectId: String(project.project_id),
      userId: Number(userId),
      roleId: 3,
    });
    return { ok: true, entity: project };
  }

  if (action.type === "CREATE_SPRINT") {
    if (!hasProject(action.projectId)) {
      return { ok: false, error: "RESOURCE_NOT_FOUND", message: "Project not found" };
    }
    const sprint = {
      sprint_id: nextNumericId(db.sprints, "sprint_id"),
      project_id: String(action.projectId),
      sprintName: action.sprintName,
      sprintGoal: action.sprintGoal || "",
      sprintStatus: action.sprintStatus || "TODO",
      isDefault: false,
      timeStart: action.timeStart || new Date().toISOString(),
      timeEnd: action.timeEnd || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    db.sprints.push(sprint);
    return { ok: true, entity: sprint };
  }

  if (action.type === "CREATE_STORY") {
    if (!hasProject(action.projectId)) {
      return { ok: false, error: "RESOURCE_NOT_FOUND", message: "Project not found" };
    }
    if (action.sprintId) {
      const sprint = db.sprints.find((x) => Number(x.sprint_id) === Number(action.sprintId));
      if (!sprint || String(sprint.project_id) !== String(action.projectId)) {
        return { ok: false, error: "RESOURCE_NOT_FOUND", message: "Sprint not found in project" };
      }
    }
    const story = {
      story_id: nextNumericId(db.stories, "story_id"),
      project_id: String(action.projectId),
      sprint_id: action.sprintId ? Number(action.sprintId) : null,
      epic_id: action.epicId ? Number(action.epicId) : null,
      storyName: action.storyName,
      description: action.description || "",
      storyStatus: action.storyStatus || "TODO",
      storyOrder: Number(action.storyOrder || db.stories.length + 1),
      assignee_user_id: action.assigneeUserId ? Number(action.assigneeUserId) : null,
      isDefault: false,
    };
    db.stories.push(story);
    return { ok: true, entity: story };
  }

  if (action.type === "CREATE_TASK") {
    if (!hasProject(action.projectId)) {
      return { ok: false, error: "RESOURCE_NOT_FOUND", message: "Project not found" };
    }
    const story = db.stories.find((x) => Number(x.story_id) === Number(action.storyId));
    if (action.storyId && !story) {
      return { ok: false, error: "RESOURCE_NOT_FOUND", message: "Story not found" };
    }
    if (story && String(story.project_id) !== String(action.projectId)) {
      return { ok: false, error: "RESOURCE_NOT_FOUND", message: "Story not found in project" };
    }
    const task = {
      task_id: db.tasks.length ? Math.max(...db.tasks.map((t) => t.task_id)) + 1 : 1,
      project_id: String(action.projectId),
      sprint_id: story?.sprint_id ?? null,
      epic_id: story?.epic_id ?? null,
      story_id: story?.story_id ?? null,
      taskName: action.taskName,
      description: action.description || "",
      taskStatus: action.taskStatus || "TODO",
      timeStart: action.timeStart || new Date().toISOString(),
      timeEnd: action.timeEnd || new Date().toISOString(),
      deadline: action.deadline || new Date().toISOString(),
      is_approved: false,
      txHash: null,
    };
    db.tasks.push(task);
    return { ok: true, entity: task };
  }

  if (action.type === "UPDATE_SPRINT_STATUS") {
    const sprint = db.sprints.find((x) => Number(x.sprint_id) === Number(action.sprintId));
    if (!sprint) {
      return { ok: false, error: "RESOURCE_NOT_FOUND", message: "Sprint not found" };
    }
    sprint.sprintStatus = action.sprintStatus;
    return { ok: true, entity: sprint };
  }

  return {
    ok: false,
    error: "UNSUPPORTED_ACTION",
    message: "Unsupported action type",
  };
}

module.exports = {
  executeAction,
};
