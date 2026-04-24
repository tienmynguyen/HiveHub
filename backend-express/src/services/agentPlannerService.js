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
    input.includes("tao project") ||
    input.includes("create project") ||
    input.includes("tao du an") ||
    input.includes("tao du an") ||
    input.includes("lap du an") ||
    input.includes("them du an")
  ) {
    return "CREATE_PROJECT";
  }
  if (
    input.includes("tao sprint") ||
    input.includes("tao sprint") ||
    input.includes("create sprint") ||
    input.includes("them sprint")
  ) {
    return "CREATE_SPRINT";
  }
  if (
    input.includes("tao story") ||
    input.includes("create story") ||
    input.includes("tao story")
  ) {
    return "CREATE_STORY";
  }
  if (
    input.includes("tao task") ||
    input.includes("tao subtask") ||
    input.includes("create task") ||
    input.includes("tao task") ||
    input.includes("tao cong viec") ||
    input.includes("tao cong viec") ||
    input.includes("them task") ||
    input.includes("giao viec")
  ) {
    return "CREATE_TASK";
  }
  if (
    input.includes("doi trang thai sprint") ||
    input.includes("doi trang thai sprint") ||
    input.includes("update sprint status")
  ) {
    return "UPDATE_SPRINT_STATUS";
  }
  if (input.includes("bao cao") || input.includes("report") || input.includes("tien do") || input.includes("tong hop")) return "REPORT";
  if (input.includes("goi y") || input.includes("chia viec") || input.includes("planning") || input.includes("ke hoach")) return "PLANNING";
  return "HELP";
}

function cleanupEntityName(value) {
  return String(value || "")
    .replace(/^(ten|name|la|là)\s*[:\-]?\s*/i, "")
    .replace(/\s+(cho|thuoc|trong|for)\s+(du an|dự án|project).*/i, "")
    .replace(/\s+(cho|thuoc|trong|for)\s+(story|sprint).*/i, "")
    .trim();
}

function parsePayloadFromCommandText(text) {
  const input = String(text || "");
  const lower = normalizeText(input);

  const projectIdMatch = input.match(/p-\d{6,}/i);
  const sprintIdMatch = input.match(/sprint\s*#?\s*(\d+)/i);
  const storyIdMatch = input.match(/story\s*#?\s*(\d+)/i);
  const statusMatch = input.match(/(todo|in[_\s-]?progress|done|completed)/i);

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
  const descriptionByPhrase =
    input.match(/(?:mo ta|mô tả|description)\s*(?:la|là)?\s*[:\-]?\s*([^\n]+)/i)?.[1] || "";
  const projectDescription = String(descriptionByPhrase || "")
    .replace(/["”]+$/g, "")
    .trim();

  return {
    projectId: projectIdMatch ? projectIdMatch[0].toUpperCase() : undefined,
    sprintId: sprintIdMatch ? Number(sprintIdMatch[1]) : undefined,
    storyId: storyIdMatch ? Number(storyIdMatch[1]) : undefined,
    storyName: cleanupEntityName(storyNameByPhrase) || name || undefined,
    taskName: cleanupEntityName(taskNameByPhrase) || name || undefined,
    projectName: cleanupEntityName(projectNameByCreateVerb) || cleanupEntityName(projectNameByPhrase) || name || undefined,
    sprintName: cleanupEntityName(sprintNameByPhrase) || undefined,
    projectDescription: projectDescription || undefined,
    sprintStatus: statusMatch
      ? String(statusMatch[1]).replace(/\s|-/g, "_").toUpperCase().replace("COMPLETED", "DONE")
      : undefined,
  };
}

function sanitizeIntent(value) {
  const allowed = ["CREATE_PROJECT", "CREATE_SPRINT", "CREATE_STORY", "CREATE_TASK", "UPDATE_SPRINT_STATUS", "REPORT", "PLANNING", "HELP"];
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
    sprintStatus,
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
    'Schema: {"intent":"CREATE_PROJECT|CREATE_SPRINT|CREATE_STORY|CREATE_TASK|UPDATE_SPRINT_STATUS|REPORT|PLANNING|HELP","payload":{"projectId?":"P-...","projectName?":"...","sprintName?":"...","storyName?":"...","taskName?":"...","sprintId?":1,"storyId?":1,"sprintStatus?":"TODO|IN_PROGRESS|DONE"},"confidence":0.0}',
    "Use confidence from 0 to 1.",
    "If command says current/this project, use memory.projectId if available.",
    "Prefer projectId from projectHints when project name in command loosely matches.",
    "Support Vietnamese and English commands.",
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
  if (!hasOpenAI()) {
    return (
      "Mình có thể hỗ trợ bạn: tạo project/story/task, gợi ý chia việc, báo cáo tiến độ sprint/project, " +
      "và phân tích việc cần làm hôm nay. Hãy nói rõ lệnh theo dạng: 'tạo project ...', 'tạo story ...', 'báo cáo sprint ...'."
    );
  }

  const systemPrompt = [
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
    case "UPDATE_SPRINT_STATUS":
      return {
        type: "UPDATE_SPRINT_STATUS",
        projectId: payload.projectId,
        sprintId: payload.sprintId,
        sprintStatus: payload.sprintStatus || "IN_PROGRESS",
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
