function notFound(req, res, next) {
  // Let socket.io/engine.io own its transport endpoints.
  if (req.path && req.path.startsWith("/socket.io")) {
    return next();
  }
  return res.status(404).json({
    code: "RESOURCE_NOT_FOUND",
    message: "Endpoint not found",
    path: req.path,
  });
}

module.exports = notFound;
