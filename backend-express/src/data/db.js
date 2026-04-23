const fs = require("fs");
const env = require("../config/env");
const { connectMongo } = require("../config/mongodb");

let inMemoryDb = null;
let mongoCollection = null;
let flushQueue = Promise.resolve();

function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadFromFile() {
  const raw = fs.readFileSync(env.DB_PATH, "utf8");
  return JSON.parse(raw);
}

async function initDataStore() {
  const fallbackDb = loadFromFile();
  inMemoryDb = cloneDeep(fallbackDb);

  if (!env.MONGODB_URI) {
    console.log("DataStore: using local db.json (MONGODB_URI is empty)");
    return;
  }

  const conn = await connectMongo();
  mongoCollection = conn.collection(env.MONGODB_COLLECTION);

  const existing = await mongoCollection.findOne({ _id: env.MONGODB_DOCUMENT_ID });
  if (existing?.data) {
    inMemoryDb = cloneDeep(existing.data);
    console.log("DataStore: loaded data snapshot from MongoDB Atlas");
    return;
  }

  await mongoCollection.updateOne(
    { _id: env.MONGODB_DOCUMENT_ID },
    {
      $set: {
        data: cloneDeep(fallbackDb),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  console.log("DataStore: initialized MongoDB snapshot from local db.json");
}

function readDb() {
  if (!inMemoryDb) {
    inMemoryDb = loadFromFile();
  }
  return cloneDeep(inMemoryDb);
}

function writeDb(next) {
  inMemoryDb = cloneDeep(next);
  fs.writeFileSync(env.DB_PATH, JSON.stringify(inMemoryDb, null, 2));

  if (!mongoCollection) return;

  const snapshot = cloneDeep(inMemoryDb);
  flushQueue = flushQueue
    .then(() =>
      mongoCollection.updateOne(
        { _id: env.MONGODB_DOCUMENT_ID },
        { $set: { data: snapshot, updatedAt: new Date() } },
        { upsert: true }
      )
    )
    .catch((err) => {
      console.error("DataStore: failed to persist snapshot to MongoDB", err?.message || err);
    });
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
  initDataStore,
  readDb,
  writeDb,
  ensureScrumSchema,
  nextNumericId,
};
