function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  return res.status(status).json({
    code: status === 500 ? "INTERNAL_SERVER_ERROR" : "ERROR",
    message: err.message || "Internal error",
    path: req.path,
    requestId: req.context?.requestId || null,
  });
}

module.exports = errorHandler;
