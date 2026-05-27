function buildProjectReport(db, { projectId, userId }) {
  const pid = String(projectId || "");
  const project = db.projects.find((p) => String(p.project_id) === pid) || null;
  const sprints = db.sprints.filter((s) => String(s.project_id) === pid);
  const stories = db.stories.filter((s) => String(s.project_id) === pid);
  const tasks = db.tasks.filter((t) => String(t.project_id) === pid);

  const sprintStats = sprints.map((sprint) => {
    const sprintStories = stories.filter((st) => Number(st.sprint_id) === Number(sprint.sprint_id));
    const sprintStoryIds = sprintStories.map((st) => Number(st.story_id));
    
    // A task belongs to a sprint if its sprint_id matches or if its parent story belongs to the sprint
    const sprintTasks = tasks.filter((t) => 
      Number(t.sprint_id) === Number(sprint.sprint_id) ||
      (t.story_id && sprintStoryIds.includes(Number(t.story_id)))
    );
    
    const doneTasks = sprintTasks.filter((t) => 
      ["DONE", "COMPLETED", "APPROVED"].includes(String(t.taskStatus).toUpperCase()) ||
      t.is_approved === true
    ).length;

    return {
      sprintId: sprint.sprint_id,
      sprintName: sprint.sprintName,
      sprintStatus: sprint.sprintStatus || "TODO",
      storyCount: sprintStories.length,
      taskCount: sprintTasks.length,
      doneTasks,
      progressPct: sprintTasks.length ? Math.round((doneTasks * 100) / sprintTasks.length) : 0,
    };
  });

  const assignedTaskIds = db.userTasks
    .filter((ut) => Number(ut.userId) === Number(userId))
    .map((ut) => Number(ut.taskId));
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter((t) => {
    if (!assignedTaskIds.includes(Number(t.task_id))) return false;
    const sourceDate = (t.deadline || t.timeStart || "").slice(0, 10);
    return sourceDate === todayIso;
  });

  const blocked = tasks.filter((t) => ["TODO", "IN_PROGRESS"].includes(String(t.taskStatus || "").toUpperCase()));
  return {
    project,
    summary: {
      sprintCount: sprints.length,
      storyCount: stories.length,
      taskCount: tasks.length,
      completedTaskCount: tasks.filter((t) => 
        ["DONE", "COMPLETED", "APPROVED"].includes(String(t.taskStatus || "").toUpperCase()) ||
        t.is_approved === true
      ).length,
    },
    sprintStats,
    todayFocus: todayTasks.map((t) => ({
      taskId: t.task_id,
      taskName: t.taskName,
      taskStatus: t.taskStatus,
      deadline: t.deadline,
    })),
    blockedItems: blocked.slice(0, 10).map((t) => ({
      taskId: t.task_id,
      taskName: t.taskName,
      taskStatus: t.taskStatus,
    })),
  };
}

function buildDailyStandup(db, { projectId, userId }) {
  const uId = Number(userId);

  // 1. Get all project IDs the user participates in
  const userProjectIds = db.userProjects
    .filter((up) => Number(up.userId) === uId)
    .map((up) => String(up.projectId));

  // If a projectId is provided and the user is in it, filter by that projectId
  const targetProjectIds = projectId && userProjectIds.includes(String(projectId))
    ? [String(projectId)]
    : userProjectIds;

  // 2. Fetch projects details
  const projects = db.projects.filter((p) => targetProjectIds.includes(String(p.project_id)));

  // 3. Fetch all tasks in these projects assigned to the user
  const assignedTaskIds = db.userTasks
    .filter((ut) => Number(ut.userId) === uId)
    .map((ut) => Number(ut.taskId));

  const allUserTasks = db.tasks.filter((t) => 
    targetProjectIds.includes(String(t.project_id)) && 
    assignedTaskIds.includes(Number(t.task_id))
  );

  // Split into:
  // - Completed tasks (for Yesterday/Past Work)
  const completedTasks = allUserTasks.filter((t) => 
    ["DONE", "COMPLETED", "APPROVED"].includes(String(t.taskStatus || "").toUpperCase()) ||
    t.is_approved === true
  );

  // - Active tasks (for Today's Work)
  const activeTasks = allUserTasks.filter((t) => 
    !["DONE", "COMPLETED", "APPROVED"].includes(String(t.taskStatus || "").toUpperCase()) &&
    t.is_approved !== true
  );

  // - Overdue tasks (as Blockers / Impediments)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const overdueTasks = activeTasks.filter((t) => {
    if (!t.deadline) return false;
    const dl = new Date(t.deadline);
    return dl < todayStart;
  });

  // General project blockers in active sprints
  const activeSprints = db.sprints.filter((s) => 
    targetProjectIds.includes(String(s.project_id)) &&
    s.sprintStatus === "IN_PROGRESS"
  );
  const activeSprintIds = activeSprints.map((s) => Number(s.sprint_id));

  const projectBlockers = db.tasks.filter((t) => 
    targetProjectIds.includes(String(t.project_id)) &&
    activeSprintIds.includes(Number(t.sprint_id)) &&
    !["DONE", "COMPLETED", "APPROVED"].includes(String(t.taskStatus || "").toUpperCase()) &&
    t.is_approved !== true
  );

  return {
    user: db.users.find((u) => u.user_id === uId) || null,
    projects: projects.map((p) => ({
      projectId: p.project_id,
      projectName: p.projectName,
    })),
    yesterday: completedTasks.slice(0, 5).map((t) => {
      const p = db.projects.find((pr) => String(pr.project_id) === String(t.project_id));
      return {
        taskId: t.task_id,
        taskName: t.taskName,
        projectName: p ? p.projectName : "Dự án",
        status: t.taskStatus,
      };
    }),
    today: activeTasks.slice(0, 5).map((t) => {
      const p = db.projects.find((pr) => String(pr.project_id) === String(t.project_id));
      return {
        taskId: t.task_id,
        taskName: t.taskName,
        projectName: p ? p.projectName : "Dự án",
        status: t.taskStatus,
        deadline: t.deadline,
      };
    }),
    blockers: [
      ...overdueTasks.map((t) => {
        const p = db.projects.find((pr) => String(pr.project_id) === String(t.project_id));
        return {
          taskId: t.task_id,
          taskName: t.taskName,
          projectName: p ? p.projectName : "Dự án",
          reason: "Quá hạn deadline!",
          deadline: t.deadline,
        };
      }),
      ...projectBlockers.slice(0, 3).map((t) => {
        const p = db.projects.find((pr) => String(pr.project_id) === String(t.project_id));
        return {
          taskId: t.task_id,
          taskName: t.taskName,
          projectName: p ? p.projectName : "Dự án",
          reason: "Tác vụ chưa hoàn thành trong Sprint đang chạy",
        };
      }),
    ].slice(0, 5),
  };
}

module.exports = {
  buildProjectReport,
  buildDailyStandup,
};
