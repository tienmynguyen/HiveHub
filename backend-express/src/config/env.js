const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const env = {
  PORT: Number(process.env.PORT || 8889),
  JWT_SECRET: process.env.JWT_SECRET || "ChangeMeToA32CharSecretKeyForJwt",
  ACCESS_EXP_MS: Number(process.env.JWT_ACCESS_EXP_MS || 900000),
  REFRESH_EXP_MS: Number(process.env.JWT_REFRESH_EXP_MS || 604800000),
  DB_PATH: path.join(__dirname, "..", "db.json"),
  MONGODB_URI: process.env.MONGODB_URI || "",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || "hivehub",
  MONGODB_COLLECTION: process.env.MONGODB_COLLECTION || "app_state",
  MONGODB_DOCUMENT_ID: process.env.MONGODB_DOCUMENT_ID || "hivehub_main",
};

module.exports = env;
