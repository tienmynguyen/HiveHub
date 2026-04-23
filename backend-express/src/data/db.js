const fs = require("fs");
const env = require("../config/env");

function readDb() {
  const raw = fs.readFileSync(env.DB_PATH, "utf8");
  return JSON.parse(raw);
}

function writeDb(next) {
  fs.writeFileSync(env.DB_PATH, JSON.stringify(next, null, 2));
}

function ensureScrumSchema(db) {
  if (!Array.isArray(db.sprints)) db.sprints = [];
  if (!Array.isArray(db.epics)) db.epics = [];
  if (!Array.isArray(db.stories)) db.stories = [];
  if (!Array.isArray(db.storyComments)) db.storyComments = [];
  if (!Array.isArray(db.notifications)) db.notifications = [];
}

function nextNumericId(list, key) {
  if (!Array.isArray(list) || list.length === 0) return 1;
  return Math.max(...list.map((item) => Number(item[key] || 0))) + 1;
}

module.exports = {
  readDb,
  writeDb,
  ensureScrumSchema,
  nextNumericId,
};
