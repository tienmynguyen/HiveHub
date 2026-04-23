const { v4: uuidv4 } = require("uuid");

function requestContext(req, _res, next) {
  req.context = {
    requestId: uuidv4(),
    startedAt: Date.now(),
  };
  next();
}

module.exports = requestContext;
