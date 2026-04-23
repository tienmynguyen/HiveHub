const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const env = require("../config/env");

function issueTokens(user, db) {
  db.refreshTokens = db.refreshTokens.filter((t) => t.userId !== user.user_id);

  const accessToken = jwt.sign(
    { userId: user.user_id, email: user.email },
    env.JWT_SECRET,
    { expiresIn: Math.floor(env.ACCESS_EXP_MS / 1000) }
  );
  const refreshToken = uuidv4() + uuidv4().replace(/-/g, "");
  db.refreshTokens.push({
    token: refreshToken,
    userId: user.user_id,
    expiresAt: Date.now() + env.REFRESH_EXP_MS,
  });
  return { accessToken, refreshToken };
}

function authPayload(user, tokens) {
  return {
    userId: user.user_id,
    user_id: user.user_id,
    email: user.email,
    username: user.username,
    userName: user.username,
    imagePath: user.imagePath || null,
    description: user.description || "",
    walletAddress: user.walletAddress || "",
    accountNonExpired: true,
    ...tokens,
  };
}

async function hashPassword(value) {
  return bcrypt.hash(value, 10);
}

async function comparePassword(rawValue, hashedValue) {
  return bcrypt.compare(rawValue, hashedValue);
}

module.exports = {
  issueTokens,
  authPayload,
  hashPassword,
  comparePassword,
};
