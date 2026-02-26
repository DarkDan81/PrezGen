const { randomUUID } = require('crypto');

function requestMeta(req, _res, next) {
    req.requestId = randomUUID();
    next();
}

module.exports = { requestMeta };

