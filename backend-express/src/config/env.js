const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const env = {
  PORT: Number(process.env.PORT || 8889),
  JWT_SECRET: process.env.JWT_SECRET || "ChangeMeToA32CharSecretKeyForJwt",
  ACCESS_EXP_MS: Number(process.env.JWT_ACCESS_EXP_MS || 900000),
  REFRESH_EXP_MS: Number(process.env.JWT_REFRESH_EXP_MS || 604800000),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gemini-2.5-flash-lite",
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta",
  LLM_API_KEY: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "",
  LLM_MODEL: process.env.LLM_MODEL || process.env.OPENAI_MODEL || "gemini-2.5-flash-lite",
  LLM_BASE_URL: process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta",
  LLM_FALLBACK_API_KEY: process.env.LLM_FALLBACK_API_KEY || "",
  LLM_FALLBACK_MODEL: process.env.LLM_FALLBACK_MODEL || "gpt-4o-mini",
  LLM_FALLBACK_BASE_URL: process.env.LLM_FALLBACK_BASE_URL || "https://api.openai.com/v1",
  DB_PATH: path.join(__dirname, "..", "db.json"),
  MONGODB_URI: process.env.MONGODB_URI || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || "hivehub",
  MONGODB_COLLECTION: process.env.MONGODB_COLLECTION || "app_state",
  MONGODB_DOCUMENT_ID: process.env.MONGODB_DOCUMENT_ID || "hivehub_main",
  CORS_ORIGINS: process.env.CORS_ORIGINS || "*",
};

module.exports = env;
