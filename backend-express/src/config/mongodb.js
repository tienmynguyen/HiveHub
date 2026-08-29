const mongoose = require("mongoose");
const env = require("./env");

let connected = false;

async function connectMongo() {
  if (!env.MONGODB_URI) return null;
  if (connected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB_NAME || undefined,
    serverSelectionTimeoutMS: 2000,
  });
  connected = true;
  return mongoose.connection;
}

module.exports = {
  connectMongo,
};
