const { v4: uuidv4 } = require("uuid");

const PREVIEW_TTL_MS = 5 * 60 * 1000;
const store = new Map();
const executedIdempotency = new Map();

function createPreviewToken(payload) {
  const token = uuidv4();
  const expiresAt = Date.now() + PREVIEW_TTL_MS;
  store.set(token, { ...payload, expiresAt });
  return { token, expiresAt };
}

function consumePreviewToken(token) {
  const item = store.get(token);
  if (!item) return null;
  if (item.expiresAt < Date.now()) {
    store.delete(token);
    return null;
  }
  store.delete(token);
  return item;
}

function markIdempotencyExecuted(idempotencyKey, payload) {
  if (!idempotencyKey) return;
  executedIdempotency.set(idempotencyKey, payload);
}

function getIdempotencyResult(idempotencyKey) {
  if (!idempotencyKey) return null;
  return executedIdempotency.get(idempotencyKey) || null;
}

module.exports = {
  createPreviewToken,
  consumePreviewToken,
  markIdempotencyExecuted,
  getIdempotencyResult,
};
