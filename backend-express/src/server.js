const http = require("http");
const { Server } = require("socket.io");
const env = require("./config/env");
const createApp = require("./app");

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*" },
});
const app = createApp(io);
server.on("request", app);

// Socket namespace compatible with FE: io(`${URLAPI}/ws`)
io.of("/ws").on("connection", (socket) => {
  socket.on("sendMessage", (payload) => {
    io.of("/ws").emit("receiveMessage", payload);
  });
});

server.listen(env.PORT, () => {
  console.log(`Express backend running on http://localhost:${env.PORT}`);
});

