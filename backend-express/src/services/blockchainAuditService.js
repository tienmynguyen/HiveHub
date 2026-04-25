const crypto = require("crypto");

function sha256(input) {
  return crypto.createHash("sha256").update(String(input || "")).digest("hex");
}

function ensureBlockchainSchema(db) {
  if (!Array.isArray(db.blockchainApprovals)) db.blockchainApprovals = [];
}

/**
 * Simulate immutable blockchain write for task approval.
 * Stores hash chain + pseudo txHash for auditability.
 */
function recordTaskApprovalOnChain(db, payload) {
  ensureBlockchainSchema(db);
  const previous = db.blockchainApprovals.length > 0 ? db.blockchainApprovals[db.blockchainApprovals.length - 1] : null;
  const timestamp = new Date().toISOString();
  const blockIndex = db.blockchainApprovals.length + 1;
  const approvalData = {
    taskId: Number(payload.taskId),
    projectId: String(payload.projectId || ""),
    approverUserId: Number(payload.approverUserId || 0),
    approvedStatus: String(payload.approvedStatus || "APPROVED"),
    note: String(payload.note || ""),
    timestamp,
  };
  const blockData = {
    blockIndex,
    previousHash: previous?.blockHash || "GENESIS",
    ...approvalData,
  };
  const blockHash = sha256(JSON.stringify(blockData));
  const txHash = `0x${sha256(`${blockHash}:${Date.now()}`).slice(0, 64)}`;
  const record = { ...blockData, blockHash, txHash };
  db.blockchainApprovals.push(record);
  return record;
}

module.exports = {
  recordTaskApprovalOnChain,
  ensureBlockchainSchema,
};

