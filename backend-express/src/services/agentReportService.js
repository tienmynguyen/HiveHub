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

module.exports = {
  buildProjectReport,
};
