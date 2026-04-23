const express = require("express");

const router = express.Router();

router.get("/hello", (_req, res) => {
  res.json({ message: "Express backend is running" });
});

module.exports = router;
