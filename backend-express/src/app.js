const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const requestContext = require("./middlewares/requestContext");
const authOptional = require("./middlewares/authOptional");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");
const createApiRouter = require("./routes");
const env = require("./config/env");

function buildCorsOptions() {
  const raw = String(env.CORS_ORIGINS || "*")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const allowAll = !raw.length || raw.includes("*");
  if (allowAll) return { origin: true, credentials: true };
  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (raw.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  };
}

function createApp(io) {
  const app = express();

  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan("dev"));
  app.use(requestContext);
  app.use(authOptional);

  app.use(createApiRouter(io));
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
