function validateQuery(requiredKeys = []) {
  return function queryValidator(req, res, next) {
    const missing = requiredKeys.filter((key) => {
      const value = req.query[key];
      return value === undefined || value === null || value === "";
    });
    if (missing.length) {
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: `Missing query params: ${missing.join(", ")}`,
      });
    }
    return next();
  };
}

module.exports = validateQuery;
