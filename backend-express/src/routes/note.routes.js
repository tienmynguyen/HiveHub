const express = require("express");
const { readDb, writeDb } = require("../data/db");

const router = express.Router();

router.get("/getallnotebyuser", (req, res) => {
  const userId = Number(req.query.userId);
  const db = readDb();
  return res.json(db.notes.filter((n) => n.userId === userId));
});

router.post("/addnote", (req, res) => {
  const userId = Number(req.query.userId || req.body?.userId || 0);
  const body = req.body || {};
  const db = readDb();
  const note = {
    note_id: db.notes.length ? Math.max(...db.notes.map((n) => n.note_id)) + 1 : 1,
    userId,
    title: body.title || "Ghi chú mới",
    content: body.content || "",
    noteDate: body.noteDate || body.date || new Date().toISOString().slice(0, 10),
    noteTime: body.noteTime || "09:00",
    reminderAt: body.reminderAt || null,
    date: body.date || body.noteDate || new Date().toISOString(),
    pinned: Boolean(body.pinned),
  };
  db.notes.push(note);
  writeDb(db);
  return res.json(note);
});

router.post("/updatenote", (req, res) => {
  const noteId = Number(req.query.noteId || req.body?.noteId);
  const body = req.body || {};
  const db = readDb();
  const note = db.notes.find((n) => Number(n.note_id) === Number(noteId));
  if (!note) return res.status(404).json({ code: "RESOURCE_NOT_FOUND", message: "Note not found" });
  if (body.title !== undefined) note.title = body.title;
  if (body.content !== undefined) note.content = body.content;
  if (body.noteDate !== undefined) note.noteDate = body.noteDate;
  if (body.noteTime !== undefined) note.noteTime = body.noteTime;
  if (body.date !== undefined) note.date = body.date;
  if (body.pinned !== undefined) note.pinned = Boolean(body.pinned);
  writeDb(db);
  return res.json(note);
});

router.delete("/deletenote", (req, res) => {
  const noteId = Number(req.query.noteId || req.body?.noteId);
  const db = readDb();
  db.notes = db.notes.filter((n) => Number(n.note_id) !== Number(noteId));
  writeDb(db);
  return res.json({ ok: true });
});

module.exports = router;
