const express = require("express");
const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const userProjectRoutes = require("./userProject.routes");
const scrumRoutes = require("./scrum.routes");
const taskRoutes = require("./task.routes");
const noteRoutes = require("./note.routes");
const createChatRoutes = require("./chat.routes");
const agentRoutes = require("./agent.routes");

function createApiRouter(io) {
  const router = express.Router();

  router.use(healthRoutes);
  router.use(authRoutes);
  router.use(userProjectRoutes);
  router.use(scrumRoutes);
  router.use(taskRoutes);
  router.use(noteRoutes);
  router.use(createChatRoutes(io));
  router.use(agentRoutes);

  return router;
}

module.exports = createApiRouter;
