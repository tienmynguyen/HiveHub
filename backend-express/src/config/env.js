const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const env = {
  PORT: Number(process.env.PORT || 8889),
  JWT_SECRET: process.env.JWT_SECRET || "ChangeMeToA32CharSecretKeyForJwt",
  ACCESS_EXP_MS: Number(process.env.JWT_ACCESS_EXP_MS || 900000),
  REFRESH_EXP_MS: Number(process.env.JWT_REFRESH_EXP_MS || 604800000),
  OPENAI_API_KEY: (process.env.OPENAI_API_KEY || "").replace(/^["']|["']$/g, '').trim(),
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gemini-2.5-flash-lite",
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta",
  LLM_API_KEY: (process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "").replace(/^["']|["']$/g, '').trim(),
  LLM_MODEL: process.env.LLM_MODEL || process.env.OPENAI_MODEL || "gemini-2.5-flash-lite",
  LLM_BASE_URL: process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta",
  LLM_FALLBACK_API_KEY: (process.env.LLM_FALLBACK_API_KEY || "").replace(/^["']|["']$/g, '').trim(),
  LLM_FALLBACK_MODEL: process.env.LLM_FALLBACK_MODEL || "gpt-4o-mini",
  LLM_FALLBACK_BASE_URL: process.env.LLM_FALLBACK_BASE_URL || "https://api.openai.com/v1",
  DB_PATH: path.join(__dirname, "..", "db.json"),
  MONGODB_URI: process.env.MONGODB_URI || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || "hivehub",
  MONGODB_COLLECTION: process.env.MONGODB_COLLECTION || "app_state",
  MONGODB_DOCUMENT_ID: process.env.MONGODB_DOCUMENT_ID || "hivehub_main",
  CORS_ORIGINS: process.env.CORS_ORIGINS || "*",
  BLOCKCHAIN_ENABLED: String(process.env.BLOCKCHAIN_ENABLED || "false").toLowerCase() === "true",
  BLOCKCHAIN_REQUIRED: String(process.env.BLOCKCHAIN_REQUIRED || "false").toLowerCase() === "true",
  BLOCKCHAIN_RPC_URL: process.env.BLOCKCHAIN_RPC_URL || "",
  BLOCKCHAIN_CHAIN_ID: process.env.BLOCKCHAIN_CHAIN_ID ? Number(process.env.BLOCKCHAIN_CHAIN_ID) : undefined,
  BLOCKCHAIN_PRIVATE_KEY: process.env.BLOCKCHAIN_PRIVATE_KEY || "",
  BLOCKCHAIN_CONTRACT_ADDRESS: process.env.BLOCKCHAIN_CONTRACT_ADDRESS || "",
  BLOCKCHAIN_APPROVE_METHOD: process.env.BLOCKCHAIN_APPROVE_METHOD || "approveTask",
  BLOCKCHAIN_CONFIRMATIONS: Number(process.env.BLOCKCHAIN_CONFIRMATIONS || 1),
  BLOCKCHAIN_EXPLORER_TX_URL: process.env.BLOCKCHAIN_EXPLORER_TX_URL || "",
};

module.exports = env;
