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

  function buildDomainContext(projectName, projectDescription) {
    const text = `${String(projectName || "")} ${String(projectDescription || "")}`.toLowerCase();
    if (text.includes("thuong mai") || text.includes("ban hang") || text.includes("shop") || text.includes("e-commerce")) {
      return {
        label: "thuong mai dien tu",
        storySeeds: [
          "Quan ly danh muc san pham",
          "Gio hang va dat hang",
          "Thanh toan va xac nhan don",
          "Theo doi van chuyen va lich su mua hang",
          "Danh gia san pham va cham soc khach hang",
        ],
        taskSeeds: [
          "Phan tich yeu cau nghiep vu",
          "Thiet ke UI/UX cho luong chinh",
          "Xay dung API va business logic",
          "Tich hop frontend voi backend",
          "Viet test va nghiem thu chuc nang",
        ],
      };
    }
    if (text.includes("chat") || text.includes("mess") || text.includes("social") || text.includes("mang xa hoi")) {
      return {
        label: "giao tiep va cong dong",
        storySeeds: [
          "Dang ky dang nhap va quan ly tai khoan",
          "Gui nhan tin nhan theo thoi gian thuc",
          "Tao nhom va quan ly thanh vien",
          "Thong bao va nhac den tuong tac",
          "Bao mat va kiem duyet noi dung",
        ],
        taskSeeds: [
          "Thiet ke schema du lieu",
          "Xay dung service xu ly su kien",
          "Toi uu hieu nang truy van",
          "Dong bo trang thai client server",
          "Viet test cho cac case quan trong",
        ],
      };
    }
    return {
      label: String(projectName || "du an"),
      storySeeds: [
        "Khoi tao va dinh nghia pham vi du an",
        "Xay dung luong nghiep vu cot loi",
        "Trien khai giao dien va trai nghiem nguoi dung",
        "Tich hop he thong va dong bo du lieu",
        "Bao mat, van hanh va toi uu",
      ],
      taskSeeds: [
        "Lam ro yeu cau va tieu chi chap nhan",
        "Thiet ke giai phap ky thuat",
        "Trien khai chuc nang chi tiet",
        "Kiem thu va sua loi",
        "Tai lieu hoa va ban giao",
      ],
    };
  }

  function pickSeed(items, index) {
    if (!Array.isArray(items) || !items.length) return "Cong viec";
    return items[index % items.length];
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
  if (action.type === "CREATE_PROJECT_BLUEPRINT") {
    if (action.customBlueprint && Array.isArray(action.customBlueprint.sprints)) {
      const startDate = action.startDate ? new Date(`${action.startDate}T00:00:00`) : new Date();
      const sprintsList = action.customBlueprint.sprints;
      const sprintCount = sprintsList.length;
      const sprintDurationWeeks = Math.max(1, Number(action.sprintDurationWeeks || 1));

      const project = {
        project_id: `P-${Date.now().toString().slice(-8)}`,
        projectName: action.projectName,
        projectDescription: action.projectDescription || "",
        projectowner: Number(userId),
        timeStart: startDate.toISOString(),
        timeEnd: new Date(startDate.getTime() + sprintCount * sprintDurationWeeks * 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      db.projects.push(project);
      db.userProjects.push({
        userProjectId: uuidv4(),
        projectId: String(project.project_id),
        userId: Number(userId),
        roleId: 3,
      });

      const createdSprints = [];
      const createdStories = [];
      const createdTasks = [];

      const resolveAssignee = (name) => {
        if (!name) return null;
        const normName = String(name).toLowerCase().trim();
        const matched = db.users.find(
          (u) =>
            String(u.username || "").toLowerCase().includes(normName) ||
            String(u.email || "").toLowerCase().includes(normName)
        );
        if (!matched) return null;

        // Only assign work to users who are ALREADY members of the project.
        // For a new project, at this stage only the creator (userId) is in db.userProjects.
        const isAlreadyMember = db.userProjects.some(
          (up) => up.projectId === String(project.project_id) && Number(up.userId) === Number(matched.user_id)
        );
        return isAlreadyMember ? Number(matched.user_id) : null;
      };

      for (let i = 0; i < sprintCount; i += 1) {
        const customSprint = sprintsList[i];
        const sprintStart = new Date(startDate.getTime() + i * sprintDurationWeeks * 7 * 24 * 60 * 60 * 1000);
        const sprintEnd = new Date(sprintStart.getTime() + sprintDurationWeeks * 7 * 24 * 60 * 60 * 1000);

        const sprint = {
          sprint_id: nextNumericId(db.sprints, "sprint_id"),
          project_id: String(project.project_id),
          sprintName: customSprint.sprintName || `Sprint ${i + 1}`,
          sprintGoal: customSprint.sprintGoal || "",
          sprintStatus: "TODO",
          isDefault: false,
          timeStart: sprintStart.toISOString(),
          timeEnd: sprintEnd.toISOString(),
        };
        db.sprints.push(sprint);
        createdSprints.push(sprint);

        if (Array.isArray(customSprint.stories)) {
          for (let j = 0; j < customSprint.stories.length; j += 1) {
            const customStory = customSprint.stories[j];
            const assigneeUserId = resolveAssignee(customStory.assigneeName);

            const story = {
              story_id: nextNumericId(db.stories, "story_id"),
              project_id: String(project.project_id),
              sprint_id: Number(sprint.sprint_id),
              epic_id: null,
              storyName: customStory.storyName || `Story ${j + 1}`,
              description: customStory.description || "",
              storyStatus: "TODO",
              storyOrder: Number(db.stories.length + 1),
              assignee_user_id: assigneeUserId,
              isDefault: false,
            };
            db.stories.push(story);
            createdStories.push(story);

            if (Array.isArray(customStory.tasks)) {
              for (let k = 0; k < customStory.tasks.length; k += 1) {
                const customTask = customStory.tasks[k];
                const taskAssigneeId = resolveAssignee(customTask.assigneeName) || assigneeUserId;

                const task = {
                  task_id: db.tasks.length ? Math.max(...db.tasks.map((t) => t.task_id)) + 1 : 1,
                  project_id: String(project.project_id),
                  sprint_id: Number(sprint.sprint_id),
                  epic_id: null,
                  story_id: Number(story.story_id),
                  taskName: customTask.taskName || `Task ${k + 1}`,
                  description: customTask.description || "",
                  taskStatus: "TODO",
                  timeStart: sprintStart.toISOString(),
                  timeEnd: sprintEnd.toISOString(),
                  deadline: sprintEnd.toISOString(),
                  is_approved: false,
                  txHash: null,
                };
                db.tasks.push(task);
                createdTasks.push(task);

                if (taskAssigneeId) {
                  db.userTasks.push({
                    id: uuidv4(),
                    taskId: task.task_id,
                    userId: taskAssigneeId,
                  });
                }
              }
            }
          }
        }
      }

      return {
        ok: true,
        entity: {
          project_id: project.project_id,
          projectName: project.projectName,
          projectDescription: project.projectDescription,
          created: {
            sprints: createdSprints.length,
            stories: createdStories.length,
            tasks: createdTasks.length,
          },
        },
      };
    }

    const sprintCount = Math.max(1, Number(action.sprintCount || 1));
    const storiesPerSprint = Math.max(1, Number(action.storiesPerSprint || 1));
    const tasksPerStory = Math.max(1, Number(action.tasksPerStory || 1));
    const sprintDurationWeeks = Math.max(1, Number(action.sprintDurationWeeks || 1));
    const startDate = action.startDate ? new Date(`${action.startDate}T00:00:00`) : new Date();
    const project = {
      project_id: `P-${Date.now().toString().slice(-8)}`,
      projectName: action.projectName,
      projectDescription: action.projectDescription || "",
      projectowner: Number(userId),
      timeStart: startDate.toISOString(),
      timeEnd: new Date(startDate.getTime() + sprintCount * sprintDurationWeeks * 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    db.projects.push(project);
    db.userProjects.push({
      userProjectId: uuidv4(),
      projectId: String(project.project_id),
      userId: Number(userId),
      roleId: 3,
    });

    const domain = buildDomainContext(action.projectName, action.projectDescription);
    const createdSprints = [];
    const createdStories = [];
    const createdTasks = [];
    for (let i = 0; i < sprintCount; i += 1) {
      const sprintStart = new Date(startDate.getTime() + i * sprintDurationWeeks * 7 * 24 * 60 * 60 * 1000);
      const sprintEnd = new Date(sprintStart.getTime() + sprintDurationWeeks * 7 * 24 * 60 * 60 * 1000);
      const sprint = {
        sprint_id: nextNumericId(db.sprints, "sprint_id"),
        project_id: String(project.project_id),
        sprintName: `Sprint ${i + 1} - ${pickSeed(domain.storySeeds, i)}`,
        sprintGoal: `Tap trung phat trien ${pickSeed(domain.storySeeds, i).toLowerCase()} cho ${project.projectName}`,
        sprintStatus: "TODO",
        isDefault: false,
        timeStart: sprintStart.toISOString(),
        timeEnd: sprintEnd.toISOString(),
      };
      db.sprints.push(sprint);
      createdSprints.push(sprint);

      for (let j = 0; j < storiesPerSprint; j += 1) {
        const storyTopic = pickSeed(domain.storySeeds, i + j);
        const story = {
          story_id: nextNumericId(db.stories, "story_id"),
          project_id: String(project.project_id),
          sprint_id: Number(sprint.sprint_id),
          epic_id: null,
          storyName: `${storyTopic} cho ${domain.label}`,
          description: `Story tu dong theo blueprint, thuoc Sprint ${i + 1} cua ${project.projectName}`,
          storyStatus: "TODO",
          storyOrder: Number(db.stories.length + 1),
          assignee_user_id: null,
          isDefault: false,
        };
        db.stories.push(story);
        createdStories.push(story);

        for (let k = 0; k < tasksPerStory; k += 1) {
          const taskTopic = pickSeed(domain.taskSeeds, i + j + k);
          const task = {
            task_id: db.tasks.length ? Math.max(...db.tasks.map((t) => t.task_id)) + 1 : 1,
            project_id: String(project.project_id),
            sprint_id: Number(sprint.sprint_id),
            epic_id: null,
            story_id: Number(story.story_id),
            taskName: `${taskTopic} - ${storyTopic.toLowerCase()}`,
            description: `Subtask ${k + 1} de hoan thanh story: ${story.storyName}`,
            taskStatus: "TODO",
            timeStart: sprintStart.toISOString(),
            timeEnd: sprintEnd.toISOString(),
            deadline: sprintEnd.toISOString(),
            is_approved: false,
            txHash: null,
          };
          db.tasks.push(task);
          createdTasks.push(task);
        }
      }
    }

    return {
      ok: true,
      entity: {
        project_id: project.project_id,
        projectName: project.projectName,
        projectDescription: project.projectDescription,
        created: {
          sprints: createdSprints.length,
          stories: createdStories.length,
          tasks: createdTasks.length,
        },
      },
    };
  }
  if (action.type === "CREATE_CALENDAR_NOTE") {
    const noteDate = action.noteDate || action.reminderAt || new Date().toISOString();
    const reminderAt = action.reminderAt || null;
    const note = {
      note_id: db.notes.length ? Math.max(...db.notes.map((n) => n.note_id)) + 1 : 1,
      userId: Number(userId),
      title: action.noteTitle || "Nhac viec",
      content: action.noteContent || "",
      noteDate,
      reminderAt,
      date: new Date().toISOString(),
      pinned: false,
    };
    db.notes.push(note);
    return { ok: true, entity: note };
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

  if (action.type === "REPORT") {
    const { buildProjectReport } = require("./agentReportService");
    const reportData = buildProjectReport(db, { projectId: action.projectId, userId });
    return { ok: true, entity: reportData };
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
