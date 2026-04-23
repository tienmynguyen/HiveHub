const express = require("express");
const { readDb, writeDb } = require("../data/db");
const { issueTokens, authPayload, hashPassword, comparePassword } = require("../services/authService");

const router = express.Router();

router.post(["/auth/register", "/register"], async (req, res) => {
  const body = req.body || {};
  const email = body.email || body.emaildto;
  const password = body.password || body.passworddto;
  const userName = body.userName || body.username;
  if (!email || !password || !userName) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Missing email/password/userName" });
  }

  const db = readDb();
  if (db.users.some((u) => u.email === email)) {
    return res.status(409).json({ code: "EMAIL_EXISTS", message: "Email already exists" });
  }

  const user = {
    user_id: db.users.length ? Math.max(...db.users.map((u) => u.user_id)) + 1 : 1,
    email,
    username: userName,
    password: await hashPassword(password),
    imagePath: null,
    description: "",
    walletAddress: "",
  };
  db.users.push(user);
  const tokens = issueTokens(user, db);
  writeDb(db);
  return res.json(authPayload(user, tokens));
});

router.post(["/auth/login", "/login"], async (req, res) => {
  const body = req.body || {};
  const email = body.email || body.emaildto;
  const password = body.password || body.passworddto;
  if (!email || !password) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "Missing email/password" });
  }

  const db = readDb();
  const user = db.users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ code: "AUTH_INVALID_CREDENTIALS", message: "Invalid credentials" });

  const ok = await comparePassword(password, user.password);
  if (!ok) return res.status(401).json({ code: "AUTH_INVALID_CREDENTIALS", message: "Invalid credentials" });

  const tokens = issueTokens(user, db);
  writeDb(db);
  return res.json(authPayload(user, tokens));
});

router.post("/auth/refresh", (req, res) => {
  const { refreshToken } = req.body || {};
  const db = readDb();
  const token = db.refreshTokens.find((t) => t.token === refreshToken);
  if (!token || token.expiresAt < Date.now()) {
    return res.status(401).json({ code: "REFRESH_INVALID", message: "Refresh token invalid or expired" });
  }
  const user = db.users.find((u) => u.user_id === token.userId);
  if (!user) return res.status(401).json({ code: "AUTH_INVALID_CREDENTIALS", message: "Invalid token user" });

  db.refreshTokens = db.refreshTokens.filter((t) => t.token !== refreshToken);
  const tokens = issueTokens(user, db);
  writeDb(db);
  return res.json(authPayload(user, tokens));
});

router.post("/auth/logout", (req, res) => {
  const { refreshToken } = req.body || {};
  const db = readDb();
  db.refreshTokens = db.refreshTokens.filter((t) => t.token !== refreshToken);
  writeDb(db);
  return res.json({ ok: true });
});

module.exports = router;
