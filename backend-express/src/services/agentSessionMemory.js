const memoryStore = new Map();

function ensureUserMemory(userId) {
  const key = Number(userId || 0);
  if (!memoryStore.has(key)) {
    memoryStore.set(key, {
      projectId: null,
      sprintId: null,
      storyId: null,
      pendingClarification: null,
      updatedAt: Date.now(),
    });
  }
  return memoryStore.get(key);
}

function getUserMemory(userId) {
  return { ...ensureUserMemory(userId) };
}

function mergePayloadWithMemory(payload, memory) {
  const p = payload && typeof payload === "object" ? payload : {};
  const m = memory || {};
  return {
    ...p,
    projectId: p.projectId || m.projectId || undefined,
    sprintId: p.sprintId || m.sprintId || undefined,
    storyId: p.storyId || m.storyId || undefined,
  };
}

function updateMemoryFromPayload(userId, payload) {
  const mem = ensureUserMemory(userId);
  if (payload?.projectId) mem.projectId = String(payload.projectId).toUpperCase();
  if (payload?.sprintId) mem.sprintId = Number(payload.sprintId);
  if (payload?.storyId) mem.storyId = Number(payload.storyId);
  mem.updatedAt = Date.now();
  return { ...mem };
}

function setPendingClarification(userId, pending) {
  const mem = ensureUserMemory(userId);
  if (!pending) {
    mem.pendingClarification = null;
  } else {
    mem.pendingClarification = {
      intent: pending.intent || null,
      missingFields: Array.isArray(pending.missingFields) ? pending.missingFields : [],
      payloadSnapshot: pending.payloadSnapshot && typeof pending.payloadSnapshot === "object" ? pending.payloadSnapshot : {},
      turnCount: Number(pending.turnCount || 1),
      createdAt: pending.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
  }
  mem.updatedAt = Date.now();
  return { ...mem };
}

function clearPendingClarification(userId) {
  const mem = ensureUserMemory(userId);
  mem.pendingClarification = null;
  mem.updatedAt = Date.now();
  return { ...mem };
}

function updateMemoryFromExecution(userId, action, entity) {
  const mem = ensureUserMemory(userId);
  if (action?.projectId) mem.projectId = String(action.projectId).toUpperCase();
  if (action?.sprintId) mem.sprintId = Number(action.sprintId);
  if (action?.storyId) mem.storyId = Number(action.storyId);

  if (entity?.project_id) mem.projectId = String(entity.project_id).toUpperCase();
  if (entity?.sprint_id) mem.sprintId = Number(entity.sprint_id);
  if (entity?.story_id) mem.storyId = Number(entity.story_id);
  if (entity?.project_id && !entity?.story_id && !entity?.sprint_id) {
    mem.projectId = String(entity.project_id).toUpperCase();
  }
  mem.pendingClarification = null;
  mem.updatedAt = Date.now();
  return { ...mem };
}

module.exports = {
  getUserMemory,
  mergePayloadWithMemory,
  updateMemoryFromPayload,
  setPendingClarification,
  clearPendingClarification,
  updateMemoryFromExecution,
};
