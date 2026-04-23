const jwt = require("jsonwebtoken");
const env = require("../config/env");

function authOptional(req, _res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return next();
  }
  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.auth = decoded;
  } catch (_err) {
    req.auth = null;
  }
  return next();
}

module.exports = authOptional;
