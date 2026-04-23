const express = require("express");
const { readDb, writeDb } = require("../data/db");

const router = express.Router();

router.get("/getallnotebyuser", (req, res) => {
  const userId = Number(req.query.userId);
  const db = readDb();
  return res.json(db.notes.filter((n) => n.userId === userId));
});

router.post("/addnote", (req, res) => {
  const userId = Number(req.query.userId);
  const body = req.body || {};
  const db = readDb();
  const note = {
    note_id: db.notes.length ? Math.max(...db.notes.map((n) => n.note_id)) + 1 : 1,
    userId,
    title: body.title || "",
    content: body.content || "",
    date: body.date || new Date().toISOString(),
    pinned: Boolean(body.pinned),
  };
  db.notes.push(note);
  writeDb(db);
  return res.json(note);
});

router.delete("/deletenote", (req, res) => {
  const noteId = Number(req.query.noteId);
  const db = readDb();
  db.notes = db.notes.filter((n) => n.note_id !== noteId);
  writeDb(db);
  return res.json({ ok: true });
});

module.exports = router;
