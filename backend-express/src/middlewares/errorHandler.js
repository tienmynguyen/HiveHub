function errorHandler(err, req, res, next) {
  // Avoid writing response twice (common with socket.io long-polling lifecycle).
  if (res.headersSent) {
    return next(err);
  }
  if (req.path && req.path.startsWith("/socket.io")) {
    return next(err);
  }
  const status = err.status || 500;
  return res.status(status).json({
    code: status === 500 ? "INTERNAL_SERVER_ERROR" : "ERROR",
    message: err.message || "Internal error",
    path: req.path,
    requestId: req.context?.requestId || null,
  });
}

module.exports = errorHandler;
