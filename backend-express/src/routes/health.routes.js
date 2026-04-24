const express = require("express");

const router = express.Router();

router.get("/hello", (_req, res) => {
  res.json({ message: "Express backend is running" });
});

router.get("/ping", (_req, res) => {
  res.status(200).send("Server is awake!");
});

module.exports = router;
