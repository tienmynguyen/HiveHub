const express = require("express");
const { readDb, writeDb } = require("../data/db");

function createChatRoutes(io) {
  const router = express.Router();

  router.get("/chat/getallmessage", (req, res) => {
    const projectId = String(req.query.projectId);
    const db = readDb();
    const messages = db.messages.filter((m) => String(m.project_id) === projectId);
    return res.json(messages);
  });

  router.post(["/chat/addmessage", "/addmessage"], (req, res) => {
    const body = req.body || {};
    const db = readDb();
    const saved = {
      message_id: db.messages.length ? Math.max(...db.messages.map((m) => m.message_id || 0)) + 1 : 1,
      user_id: Number(body.user_id || 0),
      message: body.message || "",
      date: body.date || new Date().toISOString(),
      project_id: String(body.project_id || ""),
      users: body.users || db.users.find((u) => u.user_id === Number(body.user_id)) || null,
    };
    db.messages.push(saved);
    writeDb(db);
    io.of("/ws").emit("receiveMessage", saved);
    return res.json(saved);
  });

  return router;
}

module.exports = createChatRoutes;
