const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const requestContext = require("./middlewares/requestContext");
const authOptional = require("./middlewares/authOptional");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");
const createApiRouter = require("./routes");

function createApp(io) {
  const app = express();

  app.use(cors());
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
