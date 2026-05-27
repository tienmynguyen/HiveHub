const { chatCompletion, hasOpenAI } = require("./openaiClient");

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function detectIntentFallback(text) {
  const input = normalizeText(text);
  
  if (
    input.match(/\b(tao|create|lap|them|xay dung)\b.*\b(du an|project)\b.*\b(gom|moi sprint|blueprint|chi tiet)\b/i)
  ) {
    return "CREATE_PROJECT_BLUEPRINT";
  }
  if (
    input.match(/\b(tao|create|lap|them)\b.*\b(du an|project)\b/i) || 
    input.includes("tao project") || input.includes("tao du an") || input.includes("lap du an")
  ) {
    return "CREATE_PROJECT";
  }
  if (
    input.match(/\b(tao|create|them)\b.*\b(sprint)\b/i) ||
    input.includes("tao sprint")
  ) {
    return "CREATE_SPRINT";
  }
  if (
    input.match(/\b(tao|create|them)\b.*\b(story)\b/i) ||
    input.includes("tao story")
  ) {
    return "CREATE_STORY";
  }
  if (
    input.match(/\b(tao|create|them|giao)\b.*\b(task|subtask|cong viec)\b/i) ||
    input.includes("tao task") || input.includes("tao cong viec")
  ) {
    return "CREATE_TASK";
  }
  if (
    input.match(/\b(dat lich|len lich|nhac viec|dat bao thuc|dat thong bao|nhac toi|tao lich nhac|create reminder|set reminder|schedule reminder)\b/i)
  ) {
    return "CREATE_CALENDAR_NOTE";
  }
  if (
    input.match(/\b(doi|cap nhat|update)\b.*\b(trang thai sprint|sprint status)\b/i) ||
    input.includes("doi trang thai sprint")
  ) {
    return "UPDATE_SPRINT_STATUS";
  }
  if (input.match(/\b(bao cao|report|tien do|tong hop)\b/i)) return "REPORT";
  if (input.match(/\b(goi y|chia viec|planning|ke hoach)\b/i)) return "PLANNING";
  
  return "HELP";
}

function cleanupEntityName(value) {
  return String(value || "")
    .replace(/^(ten|name|la|là)\s*[:\-]?\s*/i, "")
    .replace(/\s+(cho|thuoc|trong|for)\s+(du an|dự án|project).*/i, "")
    .replace(/\s+(cho|thuoc|trong|for)\s+(story|sprint).*/i, "")
    .trim();
}

function cleanupReminderTitle(value) {
  return String(value || "")
    .replace(/^(nhac toi|nhắc tôi|dat lich|đặt lịch|set reminder|create reminder|remind me)\s*/i, "")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "")
    .replace(/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/g, "")
    .replace(/\b\d{1,2}:\d{2}\b/g, "")
    .replace(/\b\d{1,2}h(?:\d{1,2})?\b/g, "")
    .replace(/\b(vao|vào|luc|lúc|at)\b/gi, "")
    .replace(/\b(chieu|chiều|sang|sáng|dem|đêm|pm|am)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseVietnameseReminderDateTime(text) {
  const raw = String(text || "");
  const normalized = normalizeText(raw);
  const now = new Date();
  const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let date = null;
  const dmyMatch = normalized.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    let year = dmyMatch[3] ? Number(dmyMatch[3]) : now.getFullYear();
    if (year < 100) year += 2000;
    const candidate = new Date(year, month - 1, day);
    if (!Number.isNaN(candidate.getTime())) date = candidate;
  } else if (normalized.includes("ngay mai") || normalized.includes("mai")) {
    date = new Date(baseDate);
    date.setDate(date.getDate() + 1);
  } else if (normalized.includes("hom nay") || normalized.includes("hôm nay")) {
    date = new Date(baseDate);
  }

  const explicitTimeMatch =
    normalized.match(/\b(\d{1,2})[:h](\d{1,2})?\b/) ||
    normalized.match(/\b(?:luc|lúc|vao|vào)\s*(\d{1,2})(?:\s*gio|\s*h)?(?:\s*(\d{1,2})\s*phut)?\b/);
  const timeMatch = explicitTimeMatch;
  let hour = null;
  let minute = 0;
  if (timeMatch) {
    hour = Number(timeMatch[1]);
    minute = timeMatch[2] ? Number(timeMatch[2]) : 0;
  }

  const isAfternoon = /(chieu|chiều|pm)/i.test(raw);
  const isEvening = /(toi|tối|dem|đêm)/i.test(raw);
  const isMorning = /(sang|sáng|am)/i.test(raw);

  if (hour !== null) {
    if ((isAfternoon || isEvening) && hour < 12) hour += 12;
    if (isMorning && hour === 12) hour = 0;
    if (hour >= 24 || minute >= 60) return null;
  }

  if (!date || hour === null) return null;

  const reminderLocal = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute,
    0,
    0,
  );
  if (Number.isNaN(reminderLocal.getTime())) return null;

  return {
    noteDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T00:00:00.000Z`,
    reminderAt: reminderLocal.toISOString(),
  };
}

function parsePayloadFromCommandText(text) {
  const input = String(text || "");
  const lower = normalizeText(input);

  const projectIdMatch = input.match(/p-\d{6,}/i);
  const sprintIdMatch = input.match(/sprint\s*#?\s*(\d+)/i);
  const storyIdMatch = input.match(/story\s*#?\s*(\d+)/i);
  const statusMatch = input.match(/(todo|in[_\s-]?progress|done|completed)/i);
  const dateMatch = input.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  const timeMatch = input.match(/\b(\d{1,2}):(\d{2})\b/);

  let name = "";
  const quoted = input.match(/["“](.+?)["”]/);
  if (quoted?.[1]) {
    name = quoted[1].trim();
  } else if (
    lower.includes("tao project") ||
    lower.includes("create project") ||
    lower.includes("tao du an") ||
    lower.includes("tao du an")
  ) {
    name = input.split(/tạo project|create project|tạo dự án|tao du an/i)[1]?.trim() || "";
  } else if (lower.includes("tao story") || lower.includes("create story")) {
    name = input.split(/tạo story|create story/i)[1]?.trim() || "";
  } else if (lower.includes("tao sprint") || lower.includes("create sprint")) {
    name = input.split(/tạo sprint|create sprint|tao sprint/i)[1]?.trim() || "";
  } else if (lower.includes("tao task") || lower.includes("create task") || lower.includes("tao subtask")) {
    name = input.split(/tạo task|create task|tạo subtask|tạo công việc|tao cong viec/i)[1]?.trim() || "";
  }

  // Remove leading filler words like "tên", "ten", ":" etc.
  name = cleanupEntityName(name);

  const projectNameByPhrase =
    input.match(/(?:du an|dự án|project)\s*(?:ten|name)?\s*(?:la|là)?\s*[:\-]?\s*([^\n,.;]+)/i)?.[1] || "";
  const storyNameByPhrase =
    input.match(/(?:story)\s*(?:ten|name)?\s*(?:la|là)?\s*[:\-]?\s*([^\n,.;]+)/i)?.[1] || "";
  const taskNameByPhrase =
    input.match(/(?:task|subtask|cong viec|công việc)\s*(?:ten|name)?\s*(?:la|là)?\s*[:\-]?\s*([^\n,.;]+)/i)?.[1] || "";
  const sprintNameByPhrase =
    input.match(/(?:sprint)\s*(?:ten|name)?\s*(?:la|là)?\s*[:\-]?\s*([^\n,.;]+)/i)?.[1] || "";
  const projectNameByCreateVerb =
    input.match(
      /(?:tao|tạo|create|lap|lập|them|thêm)\s+(?:mot|một)?\s*(?:du an|dự án|project)\s*(?:ten|name)?\s*(?:la|là)?\s*[:\-]?\s*["“]?([^"”\n,.;]+)/i
    )?.[1] || "";
  const projectNameByTenPhrase =
    input.match(/(?:ten|tên)\s+([^\n,.;]+?)(?=\s+(?:muc dich|mục đích|gom|gồm|co|có)\b|[,.]|$)/i)?.[1] || "";
  const descriptionByPhrase =
    input.match(/(?:mo ta|mô tả|description)\s*(?:la|là)?\s*[:\-]?\s*([^\n]+)/i)?.[1] || "";
  const goalByPhrase =
    input.match(/(?:muc dich|mục đích)\s*(?:la|là)?\s*[:\-]?\s*([^\n,.;]+)/i)?.[1] || "";
  const projectDescription = String(descriptionByPhrase || goalByPhrase || "")
    .replace(/["”]+$/g, "")
    .trim();
  const reminderTitleByPhrase =
    input.match(/(?:nhac|nhắc|bao thuc|báo thức|remind(?: me)? to|title)\s*(?:toi|tôi)?\s*(?:la|là)?\s*[:\-]?\s*([^\n,.;]+)/i)?.[1] || "";
  const reminderContentByPhrase =
    input.match(/(?:noi dung|nội dung|ghi chu|ghi chú|content)\s*(?:la|là)?\s*[:\-]?\s*([^\n]+)/i)?.[1] || "";
  let reminderAt;
  if (dateMatch && timeMatch) {
    const hh = String(timeMatch[1]).padStart(2, "0");
    const mm = String(timeMatch[2]).padStart(2, "0");
    const dt = new Date(`${dateMatch[1]}T${hh}:${mm}:00`);
    if (!Number.isNaN(dt.getTime())) reminderAt = dt.toISOString();
  }
  const noteDate = dateMatch?.[1] ? `${dateMatch[1]}T00:00:00.000Z` : undefined;
  const naturalReminder = parseVietnameseReminderDateTime(input);
  const sprintCountMatch = lower.match(/(?:gom|co)\s*(\d+)\s*sprint/) || lower.match(/(\d+)\s*sprint/);
  const storiesPerSprintMatch =
    lower.match(/moi\s*sprint\s*(?:gom|co)\s*(\d+)\s*story/) ||
    lower.match(/(\d+)\s*story\s*(?:moi\s*sprint|per sprint)/);
  const tasksPerStoryMatch =
    lower.match(/moi\s*story\s*(?:gom|co)\s*(\d+)\s*(?:subtask|task)/) ||
    lower.match(/(\d+)\s*(?:subtask|task)\s*(?:moi\s*story|per story)/);
  const durationWeeksMatch = lower.match(/(\d+)\s*tuan/);
  const blueprintStartMatch = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  let blueprintStartDate;
  if (blueprintStartMatch) {
    const now = new Date();
    const dd = Number(blueprintStartMatch[1]);
    const mm = Number(blueprintStartMatch[2]);
    let yy = blueprintStartMatch[3] ? Number(blueprintStartMatch[3]) : now.getFullYear();
    if (yy < 100) yy += 2000;
    const dt = new Date(yy, mm - 1, dd);
    if (!Number.isNaN(dt.getTime())) {
      blueprintStartDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    }
  }

  return {
    projectId: projectIdMatch ? projectIdMatch[0].toUpperCase() : undefined,
    sprintId: sprintIdMatch ? Number(sprintIdMatch[1]) : undefined,
    storyId: storyIdMatch ? Number(storyIdMatch[1]) : undefined,
    storyName: cleanupEntityName(storyNameByPhrase) || name || undefined,
    taskName: cleanupEntityName(taskNameByPhrase) || name || undefined,
    projectName:
      cleanupEntityName(projectNameByTenPhrase) ||
      cleanupEntityName(projectNameByCreateVerb) ||
      cleanupEntityName(projectNameByPhrase) ||
      name ||
      undefined,
    sprintName: cleanupEntityName(sprintNameByPhrase) || undefined,
    projectDescription: projectDescription || undefined,
    noteTitle: cleanupReminderTitle(reminderTitleByPhrase) || cleanupReminderTitle(name) || cleanupReminderTitle(input) || undefined,
    noteContent: String(reminderContentByPhrase || "").trim() || input.trim() || undefined,
    noteDate: noteDate || naturalReminder?.noteDate,
    reminderAt: reminderAt || naturalReminder?.reminderAt,
    sprintCount: sprintCountMatch ? Number(sprintCountMatch[1]) : undefined,
    storiesPerSprint: storiesPerSprintMatch ? Number(storiesPerSprintMatch[1]) : undefined,
    tasksPerStory: tasksPerStoryMatch ? Number(tasksPerStoryMatch[1]) : undefined,
    sprintDurationWeeks: durationWeeksMatch ? Number(durationWeeksMatch[1]) : undefined,
    startDate: blueprintStartDate,
    sprintStatus: statusMatch
      ? String(statusMatch[1]).replace(/\s|-/g, "_").toUpperCase().replace("COMPLETED", "DONE")
      : undefined,
  };
}

function sanitizeIntent(value) {
  const allowed = [
    "CREATE_PROJECT",
    "CREATE_PROJECT_BLUEPRINT",
    "CREATE_SPRINT",
    "CREATE_STORY",
    "CREATE_TASK",
    "CREATE_CALENDAR_NOTE",
    "UPDATE_SPRINT_STATUS",
    "REPORT",
    "PLANNING",
    "HELP",
  ];
  return allowed.includes(String(value || "").toUpperCase()) ? String(value).toUpperCase() : "HELP";
}

function normalizeAiPayload(payload) {
  const p = payload && typeof payload === "object" ? payload : {};
  const projectId = p.projectId ? String(p.projectId).toUpperCase() : undefined;
  const sprintId = p.sprintId ? Number(p.sprintId) : undefined;
  const storyId = p.storyId ? Number(p.storyId) : undefined;
  const sprintStatus = p.sprintStatus
    ? String(p.sprintStatus).replace(/\s|-/g, "_").toUpperCase().replace("COMPLETED", "DONE")
    : undefined;
  const normalized = {
    ...p,
    projectId: projectId || undefined,
    sprintId: Number.isFinite(sprintId) ? sprintId : undefined,
    storyId: Number.isFinite(storyId) ? storyId : undefined,
    projectName: p.projectName ? String(p.projectName).trim() : undefined,
    projectDescription: p.projectDescription ? String(p.projectDescription).trim() : undefined,
    sprintName: p.sprintName ? String(p.sprintName).trim() : undefined,
    storyName: p.storyName ? String(p.storyName).trim() : undefined,
    taskName: p.taskName ? String(p.taskName).trim() : undefined,
    noteTitle: p.noteTitle ? String(p.noteTitle).trim() : undefined,
    noteContent: p.noteContent ? String(p.noteContent).trim() : undefined,
    noteDate: p.noteDate ? String(p.noteDate).trim() : undefined,
    reminderAt: p.reminderAt ? String(p.reminderAt).trim() : undefined,
    sprintCount: Number.isFinite(Number(p.sprintCount)) ? Number(p.sprintCount) : undefined,
    storiesPerSprint: Number.isFinite(Number(p.storiesPerSprint)) ? Number(p.storiesPerSprint) : undefined,
    tasksPerStory: Number.isFinite(Number(p.tasksPerStory)) ? Number(p.tasksPerStory) : undefined,
    sprintDurationWeeks: Number.isFinite(Number(p.sprintDurationWeeks)) ? Number(p.sprintDurationWeeks) : undefined,
    startDate: p.startDate ? String(p.startDate).trim() : undefined,
    sprintStatus,
    customBlueprint: p.customBlueprint || undefined,
  };
  // Important: remove undefined keys so AI payload does not overwrite fallback payload fields.
  return Object.fromEntries(Object.entries(normalized).filter(([, v]) => v !== undefined));
}

function tryParseJson(text) {
  if (!text) return null;
  const raw = String(text).trim();
  try {
    return JSON.parse(raw);
  } catch (_err) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch (_err2) {
        return null;
      }
    }
    return null;
  }
}

async function parseIntentWithAI(commandText, parserContext = {}) {
  if (!hasOpenAI()) return null;
  const capabilityGuide = parserContext.capabilityGuide || null;
  const contextPayload = {
    userId: parserContext.userId || null,
    memory: parserContext.memory || null,
    projectHints: Array.isArray(parserContext.projectHints) ? parserContext.projectHints.slice(0, 8) : [],
    userProfile: parserContext.userProfile || null,
    capabilityGuide,
  };
  const systemPrompt = [
    "You are an intent parser for HiveHub app.",
    "Return ONLY one JSON object. No markdown. No explanation.",
    'Schema: {"intent":"CREATE_PROJECT|CREATE_PROJECT_BLUEPRINT|CREATE_SPRINT|CREATE_STORY|CREATE_TASK|CREATE_CALENDAR_NOTE|UPDATE_SPRINT_STATUS|REPORT|PLANNING|HELP","payload":{"projectId?":"P-...","projectName?":"...","projectDescription?":"...","sprintName?":"...","storyName?":"...","taskName?":"...","sprintId?":1,"storyId?":1,"sprintStatus?":"TODO|IN_PROGRESS|DONE","noteTitle?":"...","noteContent?":"...","noteDate?":"ISO","reminderAt?":"ISO","sprintCount?":4,"storiesPerSprint?":2,"tasksPerStory?":2,"sprintDurationWeeks?":1,"startDate?":"YYYY-MM-DD","customBlueprint?":{"sprints":[{"sprintName":"...","sprintGoal":"...","stories":[{"storyName":"...","description":"...","assigneeName?":"...","tasks":[{"taskName":"...","description":"...","assigneeName?":"..."}]}]}]}},"confidence":0.0}',
    "Use confidence from 0 to 1.",
    "If command says current/this project, use memory.projectId if available.",
    "Prefer projectId from projectHints when project name in command loosely matches.",
    "Support Vietnamese and English commands.",
    "CRITICAL CRITERIA: If user requests a complete project, intermediate scale or mentions project duration, purpose, or a list of participant names/roles, you MUST set intent to 'CREATE_PROJECT_BLUEPRINT' and populate a highly tailored 'customBlueprint' detailing Sprints, Stories, and Tasks with dynamic 'assigneeName' mapped from user input (e.g. My, Trình, Abc, etc.)."
  ].join("\n");
  const userPrompt = `Context: ${JSON.stringify(contextPayload)}\nCommand: ${commandText}`;
  try {
    const content = await chatCompletion({ systemPrompt, userPrompt, temperature: 0.0 });
    const parsed = tryParseJson(content);
    if (!parsed) return null;
    return {
      intent: sanitizeIntent(parsed.intent),
      payload: normalizeAiPayload(parsed.payload),
      confidence: Number(parsed.confidence || 0),
      raw: parsed,
    };
  } catch (err) {
    console.error(
      "[AI_AGENT][INTENT_PARSE_FAILED]",
      JSON.stringify({
        message: err?.message || String(err),
        status: err?.status || null,
        source: err?.source || null,
        commandText: String(commandText || "").slice(0, 180),
      }),
    );
    return null;
  }
}

async function generateChatAnswer({ userMessage, userContext }) {
  const isChatbot = userContext?.mode === "chatbot";
  if (!hasOpenAI()) {
    if (isChatbot) {
      return "Mình là trợ lý thông thường. Bạn có thể hỏi mình bất kỳ câu hỏi nào để thảo luận hoặc nhận gợi ý phát triển phần mềm, quản lý dự án.";
    }
    return (
      "Mình có thể hỗ trợ bạn: tạo project/story/task, gợi ý chia việc, báo cáo tiến độ sprint/project, " +
      "và phân tích việc cần làm hôm nay. Hãy nói rõ lệnh theo dạng: 'tạo project ...', 'tạo story ...', 'báo cáo sprint ...'."
    );
  }

  const systemPrompt = isChatbot
    ? [
        "You are a helpful general chatbot assistant for HiveHub app.",
        "Answer user questions, provide detailed suggestions, brainstorm ideas, and help with software development or project management questions.",
        "Be friendly, conversational, and informative.",
        "Do NOT talk about executing system commands, performing DB operations, or database modifications since actions are disabled in this mode.",
        "Answer in friendly, concise Vietnamese.",
      ].join(" ")
    : [
        "You are HiveHub assistant.",
        "Think with capability-first reasoning, not shallow keyword matching.",
        "Use available function list and usage guide to decide what is feasible.",
        "Ground answers in user context, project context, role/policy constraints.",
        "If required info is missing, ask concise clarifying question.",
        "Answer in concise Vietnamese, practical, action-oriented.",
      ].join(" ");
  const userPrompt = `User context: ${JSON.stringify(userContext)}\nUser message: ${userMessage}`;
  try {
    return (
      (await chatCompletion({
        systemPrompt,
        userPrompt,
        temperature: 0.3,
      })) ||
      "Mình chưa thể tạo câu trả lời lúc này."
    );
  } catch (err) {
    console.error(
      "[AI_AGENT][CHAT_ANSWER_FAILED]",
      JSON.stringify({
        message: err?.message || String(err),
        status: err?.status || null,
        source: err?.source || null,
        userMessage: String(userMessage || "").slice(0, 180),
      }),
    );
    // Fallback when provider is rate-limited or temporarily unavailable.
    return (
      "Dịch vụ AI đang quá tải/tạm giới hạn quota. " +
      "Mình vẫn có thể tiếp tục bằng chế độ local parser: bạn hãy nêu mục tiêu ngắn gọn, " +
      "ví dụ 'tạo story A cho dự án B' hoặc 'báo cáo dự án P-xxxx'."
    );
  }
}

function buildActionDraft({ intent, payload }) {
  switch (intent) {
    case "CREATE_PROJECT":
      return {
        type: "CREATE_PROJECT",
        projectName: payload.projectName || payload.storyName || payload.taskName || "New Project",
        projectDescription: payload.projectDescription || "",
      };
    case "CREATE_PROJECT_BLUEPRINT":
      return {
        type: "CREATE_PROJECT_BLUEPRINT",
        projectName: payload.projectName || "New Project",
        projectDescription: payload.projectDescription || "",
        sprintCount: Number(payload.sprintCount || 0),
        storiesPerSprint: Number(payload.storiesPerSprint || 0),
        tasksPerStory: Number(payload.tasksPerStory || 0),
        sprintDurationWeeks: Number(payload.sprintDurationWeeks || 1),
        startDate: payload.startDate || null,
        customBlueprint: payload.customBlueprint || null,
      };
    case "CREATE_SPRINT":
      return {
        type: "CREATE_SPRINT",
        projectId: payload.projectId,
        sprintName: payload.sprintName || "New Sprint",
        sprintGoal: payload.sprintGoal || "",
        sprintStatus: payload.sprintStatus || "TODO",
      };
    case "CREATE_STORY":
      return {
        type: "CREATE_STORY",
        projectId: payload.projectId,
        sprintId: payload.sprintId || null,
        epicId: payload.epicId || null,
        storyName: payload.storyName || "New Story",
        storyStatus: payload.storyStatus || "TODO",
      };
    case "CREATE_TASK":
      return {
        type: "CREATE_TASK",
        projectId: payload.projectId,
        storyId: payload.storyId || null,
        taskName: payload.taskName || "New Task",
        description: payload.description || "",
        taskStatus: payload.taskStatus || "TODO",
      };
    case "CREATE_CALENDAR_NOTE":
      return {
        type: "CREATE_CALENDAR_NOTE",
        noteTitle: payload.noteTitle || "Nhac viec",
        noteContent: payload.noteContent || "",
        noteDate: payload.noteDate || new Date().toISOString(),
        reminderAt: payload.reminderAt,
      };
    case "UPDATE_SPRINT_STATUS":
      return {
        type: "UPDATE_SPRINT_STATUS",
        projectId: payload.projectId,
        sprintId: payload.sprintId,
        sprintStatus: payload.sprintStatus || "IN_PROGRESS",
      };
    case "REPORT":
      return {
        type: "REPORT",
        projectId: payload.projectId,
        projectName: payload.projectName,
      };
    default:
      return null;
  }
}

function validateActionDraft(action) {
  if (!action) return { valid: false, missing: ["action"] };
  const missing = [];
  if (action.type === "CREATE_PROJECT") {
    const normalizedName = String(action.projectName || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    const normalizedDescription = String(action.projectDescription || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    if (!normalizedName || normalizedName.length < 2 || normalizedName === "new project") {
      missing.push("projectName");
    }
    if (!normalizedDescription || normalizedDescription.length < 4) {
      missing.push("projectDescription");
    }
  }
  if (action.type === "CREATE_PROJECT_BLUEPRINT") {
    const normalizedName = String(action.projectName || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    if (!normalizedName || normalizedName === "new project") missing.push("projectName");
    if (!String(action.projectDescription || "").trim()) missing.push("projectDescription");
    if (!action.customBlueprint) {
      if (!Number.isFinite(action.sprintCount) || action.sprintCount < 1) missing.push("sprintCount");
      if (!Number.isFinite(action.storiesPerSprint) || action.storiesPerSprint < 1) missing.push("storiesPerSprint");
      if (!Number.isFinite(action.tasksPerStory) || action.tasksPerStory < 1) missing.push("tasksPerStory");
      if (!Number.isFinite(action.sprintDurationWeeks) || action.sprintDurationWeeks < 1) missing.push("sprintDurationWeeks");
      if (!String(action.startDate || "").trim()) missing.push("startDate");
    }
  }
  if (action.type === "CREATE_SPRINT") {
    const normalizedSprintName = String(action.sprintName || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    if (!action.projectId) missing.push("projectId");
    if (!normalizedSprintName || normalizedSprintName === "new sprint") missing.push("sprintName");
  }
  if (action.type === "CREATE_STORY") {
    if (!action.projectId) missing.push("projectId");
    if (!action.storyName) missing.push("storyName");
  }
  if (action.type === "CREATE_TASK") {
    if (!action.projectId) missing.push("projectId");
    if (!action.taskName) missing.push("taskName");
  }
  if (action.type === "UPDATE_SPRINT_STATUS") {
    if (!action.projectId) missing.push("projectId");
    if (!action.sprintId) missing.push("sprintId");
    if (!action.sprintStatus) missing.push("sprintStatus");
  }
  if (action.type === "CREATE_CALENDAR_NOTE") {
    if (!String(action.noteTitle || "").trim()) missing.push("noteTitle");
    if (!action.reminderAt) missing.push("reminderAt");
  }
  if (action.type === "REPORT") {
    if (!action.projectId) missing.push("projectId");
  }
  return { valid: missing.length === 0, missing };
}

function buildGuidedPrompt(intent, missingFields = []) {
  const missing = Array.isArray(missingFields) ? missingFields : [];
  const has = (field) => missing.includes(field);

  if (intent === "CREATE_PROJECT") {
    const parts = [];
    if (has("projectName")) parts.push("ten du an");
    if (has("projectDescription")) parts.push("mo ta/muc dich du an");
    return {
      title: "Tạo dự án mới",
      question: parts.length ? `Minh can them ${parts.join(" va ")}.` : "Bạn muốn đặt tên dự án là gì?",
      hint: "Ban co the tra loi: ten du an ...; mo ta ... hoac muc dich ...",
      examples: ['Tạo dự án tên "Website CRM"', 'Lập project Mobile Sprint 3'],
    };
  }
  if (intent === "CREATE_PROJECT_BLUEPRINT") {
    const parts = [];
    if (has("projectName")) parts.push("ten du an");
    if (has("projectDescription")) parts.push("muc dich/mo ta du an");
    if (has("sprintCount")) parts.push("so sprint");
    if (has("storiesPerSprint")) parts.push("so story moi sprint");
    if (has("tasksPerStory")) parts.push("so subtask moi story");
    if (has("sprintDurationWeeks")) parts.push("thoi luong moi sprint (tuan)");
    if (has("startDate")) parts.push("ngay bat dau (dd/mm hoac yyyy-mm-dd)");
    return {
      title: "Tao du an theo blueprint",
      question: `Minh can them: ${parts.join(", ")}.`,
      hint: "Vi du: gom 4 sprint, moi sprint 2 story, moi story 2 subtask, moi sprint 1 tuan tu 26/4.",
      examples: [
        "Tao du an ABC, muc dich xay dung app ABC, gom 4 sprint, moi sprint 2 story, moi story 2 subtask, tu 26/4",
      ],
    };
  }

  if (intent === "CREATE_SPRINT") {
    const parts = [];
    if (has("projectId")) parts.push("ma du an (P-xxxx)");
    if (has("sprintName")) parts.push("ten sprint");
    return {
      title: "Tao sprint",
      question: `De tao sprint, minh can them ${parts.join(" va ")}.`,
      hint: 'Vi du: "Tao sprint Sprint 2 cho P-32457576".',
      examples: ["Tao sprint Sprint 3 cho P-32457576"],
    };
  }

  if (intent === "CREATE_STORY") {
    const parts = [];
    if (has("projectId")) parts.push("mã dự án (dạng P-xxxx)");
    if (has("storyName")) parts.push("tên story");
    return {
      title: "Tạo story",
      question: `Để tạo story, mình cần thêm ${parts.join(" và ")}.`,
      hint: 'Ví dụ: "Tạo story Đăng nhập OTP cho P-32457576".',
      examples: ['Tạo story "Đăng nhập OTP" cho P-32457576', "Story mới: Payment callback cho P-32457576"],
    };
  }

  if (intent === "CREATE_TASK") {
    const parts = [];
    if (has("projectId")) parts.push("mã dự án (P-xxxx)");
    if (has("taskName")) parts.push("tên task");
    return {
      title: "Tạo task/subtask",
      question: `Mình cần thêm ${parts.join(" và ")} để thực hiện.`,
      hint: 'Ví dụ: "Tạo task Thiết kế UI Home cho P-32457576".',
      examples: ['Tạo task "Fix crash login" cho P-32457576', "Tạo công việc Viết test API cho P-32457576"],
    };
  }

  if (intent === "UPDATE_SPRINT_STATUS") {
    return {
      title: "Cập nhật trạng thái sprint",
      question: "Mình cần mã dự án, sprintId và trạng thái (TODO/IN_PROGRESS/DONE).",
      hint: 'Ví dụ: "Đổi sprint 2 của P-32457576 sang DONE".',
      examples: ["Cập nhật sprint 3 P-32457576 sang IN_PROGRESS"],
    };
  }
  if (intent === "CREATE_CALENDAR_NOTE") {
    const parts = [];
    if (has("noteTitle")) parts.push("ten lich/nhac viec");
    if (has("reminderAt")) parts.push("thoi diem nhac (YYYY-MM-DD HH:mm)");
    return {
      title: "Tao lich nhac viec",
      question: `De dat lich, minh can them ${parts.join(" va ")}.`,
      hint: 'Vi du: "Nhac toi hop voi team luc 2026-05-01 09:30".',
      examples: [
        "Dat lich nhac demo san pham 2026-05-02 14:00",
        "Set reminder nop bao cao vao 2026-05-05 08:30",
      ],
    };
  }
  if (intent === "REPORT") {
    const parts = [];
    if (has("projectId")) parts.push("tên hoặc mã dự án (P-xxxx)");
    return {
      title: "Báo cáo tiến độ dự án",
      question: parts.length ? `Mình cần biết ${parts.join(" và ")} để lập báo cáo.` : "Bạn muốn báo cáo cho dự án nào?",
      hint: "Ví dụ: 'báo cáo dự án HiveHub' hoặc 'báo cáo P-32457576'.",
      examples: ['Báo cáo dự án "HiveHub"', "Báo cáo P-32457576"],
    };
  }

  return {
    title: "Trợ lý AI",
    question: "Bạn mô tả mục tiêu bằng ngôn ngữ tự nhiên, mình sẽ dẫn từng bước.",
    hint: "Bạn không cần nhớ cú pháp cố định.",
    examples: ['Tôi muốn tạo dự án mới cho team marketing', 'Tạo task cho dự án hiện tại'],
  };
}

module.exports = {
  detectIntentFallback,
  generateChatAnswer,
  buildActionDraft,
  parsePayloadFromCommandText,
  validateActionDraft,
  parseIntentWithAI,
  buildGuidedPrompt,
};
