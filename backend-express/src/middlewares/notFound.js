function notFound(req, res) {
  return res.status(404).json({
    code: "RESOURCE_NOT_FOUND",
    message: "Endpoint not found",
    path: req.path,
  });
}

module.exports = notFound;
