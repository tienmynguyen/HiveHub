const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const env = {
  PORT: Number(process.env.PORT || 8889),
  JWT_SECRET: process.env.JWT_SECRET || "ChangeMeToA32CharSecretKeyForJwt",
  ACCESS_EXP_MS: Number(process.env.JWT_ACCESS_EXP_MS || 900000),
  REFRESH_EXP_MS: Number(process.env.JWT_REFRESH_EXP_MS || 604800000),
  DB_PATH: path.join(__dirname, "..", "db.json"),
};

module.exports = env;
