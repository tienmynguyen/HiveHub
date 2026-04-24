const http = require("http");
const { Server } = require("socket.io");
const env = require("./config/env");
const createApp = require("./app");
const { initDataStore } = require("./data/db");

function buildSocketCors() {
  const raw = String(env.CORS_ORIGINS || "*")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (!raw.length || raw.includes("*")) {
    return { origin: true, credentials: true };
  }
  return { origin: raw, credentials: true };
}

const server = http.createServer();
const io = new Server(server, {
  cors: buildSocketCors(),
});
const app = createApp(io);
server.on("request", (req, res) => {
  // Let socket.io own its transport endpoint to avoid double-handling.
  if (req.url && req.url.startsWith("/socket.io")) {
    return;
  }
  return app(req, res);
});

// Socket namespace compatible with FE: io(`${URLAPI}/ws`)
io.of("/ws").on("connection", (socket) => {
  socket.on("sendMessage", (payload) => {
    io.of("/ws").emit("receiveMessage", payload);
  });
});

async function bootstrap() {
  await initDataStore();
  server.listen(env.PORT, () => {
    console.log(`Express backend running on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start backend:", err?.message || err);
  process.exit(1);
});

