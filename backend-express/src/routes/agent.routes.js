const express = require("express");
const { readDb, writeDb } = require("../data/db");
const {
  detectIntentFallback,
  generateChatAnswer,
  buildActionDraft,
  parsePayloadFromCommandText,
  validateActionDraft,
  parseIntentWithAI,
  buildGuidedPrompt,
} = require("../services/agentPlannerService");
const { canExecuteAction, explainPolicy } = require("../services/agentPolicyService");
const { createPreviewToken, consumePreviewToken, getIdempotencyResult, markIdempotencyExecuted } = require("../services/agentConfirmationStore");
const { executeAction } = require("../services/agentExecutionService");
const { buildProjectReport } = require("../services/agentReportService");
const { hasOpenAI } = require("../services/openaiClient");
const {
  getUserMemory,
  mergePayloadWithMemory,
  updateMemoryFromPayload,
  setPendingClarification,
  clearPendingClarification,
  clearUserMemory,
  updateMemoryFromExecution,
} = require("../services/agentSessionMemory");
const { resolveContextFromDatabase } = require("../services/agentEntityResolver");
const { buildGuideForPrompt, getAgentFunctionList, getAgentUsageGuide } = require("../services/agentCapabilityGuide");

const router = express.Router();

const ACTION_INTENTS = new Set([
  "CREATE_PROJECT",
  "CREATE_PROJECT_BLUEPRINT",
  "CREATE_SPRINT",
  "CREATE_STORY",
  "CREATE_TASK",
  "CREATE_CALENDAR_NOTE",
  "UPDATE_SPRINT_STATUS",
]);

function shouldUseClarification(intent, validation) {
  return ACTION_INTENTS.has(String(intent || "")) && validation && !validation.valid;
}

function isCancelClarificationText(message) {
  const normalized = String(message || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return ["huy", "thoi", "bo qua", "cancel", "stop", "dung lai"].some((x) => normalized === x || normalized.includes(x));
}

function buildClarificationReply({ intent, missingFields }) {
  const guide = buildGuidedPrompt(intent, missingFields);
  const readableMissing = (missingFields || []).join(", ");
  return `${guide.question}\n\nThieu: ${readableMissing || "khong ro"}.\nGoi y: ${guide.hint}`;
}

function pickProjectFromCandidates(message, candidates) {
  const list = Array.isArray(candidates) ? candidates : [];
  if (!list.length) return null;
  const text = String(message || "").trim();
  const byIndex = text.match(/^\s*(\d{1,2})\s*$/);
  if (byIndex) {
    const idx = Number(byIndex[1]) - 1;
    if (idx >= 0 && idx < list.length) return list[idx];
  }
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const matched = list.find((x) => {
    const name = String(x.projectName || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return name.includes(normalized) || normalized.includes(name);
  });
  return matched || null;
}

function buildCandidateProjectQuestion(candidates = []) {
  const options = candidates.slice(0, 5).map((c, idx) => `${idx + 1}. ${c.projectName} (${c.projectId})`);
  if (!options.length) return null;
  return `Minh tim thay nhieu du an phu hop. Ban chon 1 du an bang so thu tu hoac ten:\n${options.join("\n")}`;
}

function inferNameFromShortReply(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return "";
  const quoted = text.match(/["“](.+?)["”]/);
  if (quoted?.[1]) return quoted[1].trim();
  const direct = text.match(
    /^(?:ten|tên|name|project name|ten du an|tên dự án|ten project|tên project|sprint name|ten sprint|tên sprint|story name|ten story|tên story|task name|ten task|tên task|lich nhac|lịch nhắc|nhac viec|nhắc việc|reminder title)\s*(?:la|là)?\s*[:\-]?\s*(.+)$/i
  );
  if (direct?.[1]) return String(direct[1]).trim();
  return text
    .replace(/^(ten|tên|name|project name|ten du an|tên dự án|ten project|tên project|sprint name|ten sprint|tên sprint|lich nhac|lịch nhắc|nhac viec|nhắc việc|reminder title)\s*(la|là)?\s*[:\-]?\s*/i, "")
    .replace(/^["“]|["”]$/g, "")
    .trim();
}

function isPlaceholderName(value) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return !normalized || normalized === "new project" || normalized === "new sprint" || normalized === "new story" || normalized === "new task";
}

function debugProjectName(stage, payload = {}) {
  try {
    console.log(
      "[AI_AGENT][PROJECT_NAME_DEBUG]",
      JSON.stringify({
        stage,
        intent: payload.intent || null,
        message: payload.message ? String(payload.message).slice(0, 200) : null,
        commandText: payload.commandText ? String(payload.commandText).slice(0, 200) : null,
        fallbackPayload: payload.fallbackPayload || null,
        aiPayload: payload.aiPayload || null,
        pendingSnapshot: payload.pendingSnapshot || null,
        parsedPayloadRaw: payload.parsedPayloadRaw || null,
        parsedPayload: payload.parsedPayload || null,
        mergedPayload: payload.mergedPayload || null,
        action: payload.action || null,
      }),
    );
  } catch (_err) {
    // ignore debug logging error
  }
}

function buildParserContext(db, userId, memory) {
  const uid = Number(userId || 0);
  const user = db.users.find((u) => Number(u.user_id) === uid) || null;
  const projectIds = db.userProjects
    .filter((up) => Number(up.userId) === uid)
    .map((up) => String(up.projectId));
  const projectHints = db.projects
    .filter((p) => projectIds.includes(String(p.project_id)))
    .slice(0, 10)
    .map((p) => ({ projectId: p.project_id, projectName: p.projectName }));
  return {
    userId: uid,
    memory: memory || null,
    userProfile: user ? { userId: user.user_id, username: user.username, email: user.email } : null,
    projectHints,
    capabilityGuide: buildGuideForPrompt(),
  };
}

function mergePayloadWithResolved(basePayload, resolvedContext) {
  const base = basePayload && typeof basePayload === "object" ? basePayload : {};
  const resolved = resolvedContext && typeof resolvedContext === "object" ? resolvedContext : {};
  return {
    ...base,
    projectId: resolved.projectId ?? base.projectId,
    projectName: resolved.projectName ?? base.projectName,
    sprintId: resolved.sprintId ?? base.sprintId,
    sprintName: resolved.sprintName ?? base.sprintName,
    storyId: resolved.storyId ?? base.storyId,
    storyName: resolved.storyName ?? base.storyName,
    // keep non-resolver semantic fields from parser/user input
    projectDescription: base.projectDescription,
    sprintGoal: base.sprintGoal,
    taskName: base.taskName,
    description: base.description,
    taskStatus: base.taskStatus,
    sprintStatus: base.sprintStatus,
    // meta from resolver
    projectCandidates: Array.isArray(resolved.projectCandidates) ? resolved.projectCandidates : base.projectCandidates || [],
    projectResolutionStatus: resolved.projectResolutionStatus ?? base.projectResolutionStatus,
    resolverConfidence: resolved.resolverConfidence ?? base.resolverConfidence,
  };
}

router.post("/agent/clear-memory", (req, res) => {
  const userId = Number(req.body.userId || 0);
  if (userId) {
    clearUserMemory(userId);
  }
  return res.json({ ok: true });
});

router.post("/agent/chat", async (req, res) => {
  try {
    const body = req.body || {};
    const userId = Number(body.userId || 0);
    const message = String(body.message || "").trim();
    const mode = String(body.mode || "agent").toLowerCase();
    if (!message) {
      return res.status(400).json({ code: "VALIDATION_ERROR", message: "Missing message" });
    }
    const db = readDb();
    const memory = getUserMemory(userId);

    if (mode === "chatbot") {
      const parserContext = buildParserContext(db, userId, memory);
      const answer = await generateChatAnswer({
        userMessage: message,
        userContext: {
          userId,
          mode: "chatbot",
          hasOpenAI: hasOpenAI(),
          resolvedContext: {},
          parserContext,
          capabilityGuide: "General Chatbot Mode: Bạn có thể tự do đặt các câu hỏi, gợi ý, hướng dẫn, v.v. Các thao tác trực tiếp trên hệ thống như thêm/sửa/xóa đã được vô hiệu hóa ở chế độ này.",
        },
      });
      return res.json({
        answer,
        intent: "HELP",
        parserMode: "chatbot-mode",
        parserConfidence: 1.0,
        actionSuggestion: null,
        actionReady: false,
        missingFields: [],
        parsedPayload: {},
        resolvedContext: {},
        sessionMemory: memory,
        guide: buildGuidedPrompt("HELP", []),
        functionList: getAgentFunctionList(),
        usageGuide: getAgentUsageGuide(),
        clarification: { active: false },
      });
    }

    if (isCancelClarificationText(message) && memory?.pendingClarification) {
      const afterClear = clearPendingClarification(userId);
      return res.json({
        answer: "Da huy luong bo sung thong tin dang cho. Ban co the gui yeu cau moi.",
        intent: "HELP",
        parserMode: "clarification-cancelled",
        parserConfidence: 1,
        actionSuggestion: null,
        actionReady: false,
        missingFields: [],
        parsedPayload: {},
        resolvedContext: {},
        sessionMemory: afterClear,
        guide: buildGuidedPrompt("HELP", []),
        functionList: getAgentFunctionList(),
        usageGuide: getAgentUsageGuide(),
        clarification: { active: false, cancelled: true },
      });
    }
    const parserContext = buildParserContext(db, userId, memory);
    const aiParsed = await parseIntentWithAI(message, parserContext);
    const fallbackIntent = detectIntentFallback(message);
    const fallbackPayload = parsePayloadFromCommandText(message);
    const parsedIntent = aiParsed?.confidence >= 0.5 ? aiParsed.intent : fallbackIntent;
    let pendingIntent = memory?.pendingClarification?.intent || null;
    let activeMemory = memory;
    if (
      pendingIntent &&
      ACTION_INTENTS.has(String(parsedIntent || "")) &&
      String(parsedIntent) !== String(pendingIntent)
    ) {
      // User sent a new actionable command while clarification was pending:
      // reset old pending flow and treat current message as a new intent.
      activeMemory = clearPendingClarification(userId);
      pendingIntent = null;
    }
    const intent = pendingIntent || parsedIntent;
    const parsedPayloadRaw = {
      ...((activeMemory?.pendingClarification?.payloadSnapshot && typeof activeMemory.pendingClarification.payloadSnapshot === "object")
        ? activeMemory.pendingClarification.payloadSnapshot
        : {}),
      ...(fallbackPayload || {}),
      ...((aiParsed && aiParsed.payload) || {}),
    };
    if (intent === "CREATE_PROJECT") {
      debugProjectName("chat_after_parse_raw", {
        intent,
        message,
        fallbackPayload,
        aiPayload: aiParsed?.payload || null,
        pendingSnapshot: activeMemory?.pendingClarification?.payloadSnapshot || null,
        parsedPayloadRaw,
      });
    }
    if (activeMemory?.pendingClarification) {
      const pendingMissing = Array.isArray(activeMemory.pendingClarification.missingFields)
        ? activeMemory.pendingClarification.missingFields
        : [];
      const inferred = inferNameFromShortReply(message);
      if (inferred && inferred.length >= 2) {
        if (pendingMissing.includes("projectName") && isPlaceholderName(parsedPayloadRaw.projectName)) {
          parsedPayloadRaw.projectName = inferred;
        }
        if (pendingMissing.includes("sprintName") && isPlaceholderName(parsedPayloadRaw.sprintName)) {
          parsedPayloadRaw.sprintName = inferred;
        }
        if (pendingMissing.includes("storyName") && isPlaceholderName(parsedPayloadRaw.storyName)) {
          parsedPayloadRaw.storyName = inferred;
        }
        if (pendingMissing.includes("taskName") && isPlaceholderName(parsedPayloadRaw.taskName)) {
          parsedPayloadRaw.taskName = inferred;
        }
        if (pendingMissing.includes("noteTitle") && !String(parsedPayloadRaw.noteTitle || "").trim()) {
          parsedPayloadRaw.noteTitle = inferred;
        }
      }
    }
    if (!parsedPayloadRaw.projectId && Array.isArray(activeMemory?.pendingClarification?.payloadSnapshot?.projectCandidates)) {
      const selected = pickProjectFromCandidates(message, activeMemory.pendingClarification.payloadSnapshot.projectCandidates);
      if (selected?.projectId) {
        parsedPayloadRaw.projectId = String(selected.projectId);
        parsedPayloadRaw.projectName = selected.projectName || parsedPayloadRaw.projectName;
      }
    }
    const parsedPayloadWithMemory = mergePayloadWithMemory(parsedPayloadRaw, activeMemory);
    const resolvedContext = resolveContextFromDatabase({
      db,
      userId,
      commandText: message,
      payload: parsedPayloadWithMemory,
    });
    const parsedPayload = mergePayloadWithResolved(parsedPayloadWithMemory, resolvedContext);
    if (intent === "CREATE_PROJECT") {
      debugProjectName("chat_after_resolve_context", {
        intent,
        message,
        parsedPayloadRaw,
        parsedPayload,
      });
    }
    let memoryAfterParse = updateMemoryFromPayload(userId, parsedPayload);
    const actionSuggestion = buildActionDraft({ intent, payload: parsedPayload });
    if (intent === "CREATE_PROJECT") {
      debugProjectName("chat_after_build_action", {
        intent,
        message,
        parsedPayload,
        action: actionSuggestion,
      });
    }
    const validation = validateActionDraft(actionSuggestion);

    if (validation.valid) {
      memoryAfterParse = clearPendingClarification(userId);
    } else if (shouldUseClarification(intent, validation)) {
      const prevTurn = Number(activeMemory?.pendingClarification?.turnCount || 0);
      memoryAfterParse = setPendingClarification(userId, {
        intent,
        missingFields: validation.missing,
        payloadSnapshot: parsedPayload,
        turnCount: prevTurn + 1,
        createdAt: activeMemory?.pendingClarification?.createdAt || Date.now(),
      });
    }

    if (shouldUseClarification(intent, validation)) {
      let clarificationAnswer = buildClarificationReply({
        intent,
        missingFields: validation.missing,
      });
      if (
        validation.missing.includes("projectId") &&
        Array.isArray(parsedPayload?.projectCandidates) &&
        parsedPayload.projectCandidates.length > 1
      ) {
        clarificationAnswer = buildCandidateProjectQuestion(parsedPayload.projectCandidates) || clarificationAnswer;
      }
      return res.json({
        answer: clarificationAnswer,
        intent,
        parserMode: activeMemory?.pendingClarification ? "clarification-followup" : "clarification-started",
        parserConfidence: aiParsed?.confidence || 0,
        actionSuggestion,
        actionReady: false,
        missingFields: validation.missing,
        parsedPayload,
        resolvedContext,
        sessionMemory: memoryAfterParse,
        guide: buildGuidedPrompt(intent, validation.missing),
        functionList: getAgentFunctionList(),
        usageGuide: getAgentUsageGuide(),
        clarification: {
          active: true,
          intent,
          missingFields: validation.missing,
          turnCount: memoryAfterParse?.pendingClarification?.turnCount || 1,
        },
      });
    }

    const answer = await generateChatAnswer({
      userMessage: message,
      userContext: {
        userId,
        hasOpenAI: hasOpenAI(),
        resolvedContext,
        parserContext,
        capabilityGuide: buildGuideForPrompt(),
      },
    });

    return res.json({
      answer,
      intent,
      parserMode: aiParsed?.confidence >= 0.5 ? "ai-first" : "rule-fallback",
      parserConfidence: aiParsed?.confidence || 0,
      actionSuggestion,
      actionReady: validation.valid,
      missingFields: validation.missing,
      parsedPayload,
      resolvedContext,
      sessionMemory: memoryAfterParse,
      guide: buildGuidedPrompt(intent, validation.missing),
      functionList: getAgentFunctionList(),
      usageGuide: getAgentUsageGuide(),
      clarification: { active: false },
    });
  } catch (err) {
    console.error(
      "[AI_AGENT][CHAT_ROUTE_FAILED]",
      JSON.stringify({
        message: err?.message || String(err),
        status: err?.status || null,
        stack: err?.stack ? String(err.stack).slice(0, 600) : null,
      }),
    );
    return res.status(500).json({
      code: "AI_CHAT_FAILED",
      message: "AI agent gặp lỗi nội bộ. Vui lòng thử lại.",
    });
  }
});

router.post("/agent/plan", (req, res) => {
  const body = req.body || {};
  const projectName = String(body.projectName || "New Project");
  const teamSize = Number(body.teamSize || 5);
  const sprintCount = Number(body.sprintCount || 3);
  const output = {
    projectName,
    recommendedSprints: Array.from({ length: sprintCount }).map((_, idx) => ({
      sprintName: `Sprint ${idx + 1}`,
      goal: idx === 0 ? "Foundation and setup" : idx === sprintCount - 1 ? "Hardening and release" : "Feature delivery",
    })),
    suggestedStories: [
      "Authentication and session",
      "Project board and planning",
      "Story/subtask lifecycle",
      "Notifications and reports",
    ],
    workloadSplitHint: `Với team ${teamSize} người, nên chia 60% feature, 25% stabilization, 15% testing.`,
  };
  return res.json(output);
});

router.post("/agent/report", (req, res) => {
  const body = req.body || {};
  const projectId = String(body.projectId || "");
  const userId = Number(body.userId || 0);
  if (!projectId) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Missing projectId" });
  }
  const db = readDb();
  return res.json(buildProjectReport(db, { projectId, userId }));
});

router.post("/agent/commands/preview", async (req, res) => {
  const body = req.body || {};
  const userId = Number(body.userId || 0);
  if (!userId) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Missing userId" });
  }

  const db = readDb();
  const memory = getUserMemory(userId);
  const parserContext = buildParserContext(db, userId, memory);
  const aiParsed = await parseIntentWithAI(body.commandText || "", parserContext);
  const fallbackIntent = detectIntentFallback(body.commandText || "");
  const intent = body.intent || (aiParsed?.confidence >= 0.5 ? aiParsed.intent : fallbackIntent);
  const mergedPayload = {
    ...(parsePayloadFromCommandText(body.commandText || "") || {}),
    ...((aiParsed && aiParsed.payload) || {}),
    ...(body.payload || {}),
  };
  if (intent === "CREATE_PROJECT") {
    debugProjectName("preview_after_merge_payload", {
      intent,
      commandText: body.commandText || "",
      fallbackPayload: parsePayloadFromCommandText(body.commandText || ""),
      aiPayload: aiParsed?.payload || null,
      mergedPayload,
    });
  }
  if (intent === "CREATE_PROJECT" && isPlaceholderName(mergedPayload.projectName)) {
    const inferred = inferNameFromShortReply(body.commandText || "");
    if (inferred && inferred.length >= 2) {
      mergedPayload.projectName = inferred;
    }
  }
  if (intent === "CREATE_SPRINT" && isPlaceholderName(mergedPayload.sprintName)) {
    const inferred = inferNameFromShortReply(body.commandText || "");
    if (inferred && inferred.length >= 2) {
      mergedPayload.sprintName = inferred;
    }
  }
  const mergedWithMemory = mergePayloadWithMemory(mergedPayload, memory);
  const resolvedContext = resolveContextFromDatabase({
    db,
    userId,
    commandText: body.commandText || "",
    payload: mergedWithMemory,
  });
  const mergedWithResolved = mergePayloadWithResolved(mergedWithMemory, resolvedContext);
  if (intent === "CREATE_PROJECT") {
    debugProjectName("preview_after_resolve_context", {
      intent,
      commandText: body.commandText || "",
      mergedPayload,
      parsedPayload: mergedWithResolved,
    });
  }
  const memoryAfterMerge = updateMemoryFromPayload(userId, mergedWithResolved);
  const action = buildActionDraft({ intent, payload: mergedWithResolved });
  if (intent === "CREATE_PROJECT") {
    debugProjectName("preview_after_build_action", {
      intent,
      commandText: body.commandText || "",
      parsedPayload: mergedWithResolved,
      action,
    });
  }
  if (!action) {
    return res.status(400).json({ code: "UNSUPPORTED_ACTION", message: "Cannot build action from intent" });
  }
  const validation = validateActionDraft(action);
  if (!validation.valid) {
    return res.status(400).json({
      code: "MISSING_FIELDS",
      message: "Action missing required fields",
      missingFields: validation.missing,
      action,
    });
  }

  const allowed = canExecuteAction(db, action, userId);
  const policyReason = explainPolicy(action);

  const { token, expiresAt } = createPreviewToken({
    userId,
    action,
    idempotencyKey: body.idempotencyKey || null,
  });

  return res.json({
    intent,
    action,
    requiresConfirmation: true,
    allowed,
    policyReason,
    confirmationToken: token,
    expiresAt,
    previewSummary: `${action.type} will be executed after confirmation.`,
    resolvedContext,
    sessionMemory: memoryAfterMerge,
    guide: buildGuidedPrompt(intent, validation.missing),
    functionList: getAgentFunctionList(),
    usageGuide: getAgentUsageGuide(),
  });
});

router.post("/agent/commands/execute", (req, res) => {
  const body = req.body || {};
  const userId = Number(body.userId || 0);
  const confirmationToken = String(body.confirmationToken || "");
  const idempotencyKey = body.idempotencyKey || null;

  if (!userId || !confirmationToken) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Missing userId/confirmationToken" });
  }

  const existing = getIdempotencyResult(idempotencyKey);
  if (existing) {
    return res.json(existing);
  }

  const preview = consumePreviewToken(confirmationToken);
  if (!preview) {
    return res.status(400).json({ code: "CONFIRMATION_EXPIRED", message: "Confirmation token invalid or expired" });
  }
  if (Number(preview.userId) !== userId) {
    return res.status(403).json({ code: "FORBIDDEN", message: "Token does not belong to this user" });
  }

  const db = readDb();
  const execution = executeAction(db, preview.action, userId);
  if (!execution.ok) {
    return res.status(execution.error === "FORBIDDEN" ? 403 : 400).json({
      code: execution.error,
      message: execution.message,
    });
  }
  writeDb(db);
  const result = {
    ok: true,
    executedAction: preview.action.type,
    entity: execution.entity,
    sessionMemory: updateMemoryFromExecution(userId, preview.action, execution.entity),
  };
  markIdempotencyExecuted(idempotencyKey, result);
  return res.json(result);
});

module.exports = router;
