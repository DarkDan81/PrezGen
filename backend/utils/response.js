const SCHEMA_VERSION = '1.0';

function sendData(req, res, data, status = 200) {
    return res.status(status).json({
        data,
        meta: {
            requestId: req.requestId,
            schemaVersion: SCHEMA_VERSION,
        },
    });
}

function sendError(req, res, status, code, message, details = []) {
    return res.status(status).json({
        error: {
            code,
            message,
            details,
        },
        meta: {
            requestId: req.requestId,
            schemaVersion: SCHEMA_VERSION,
        },
    });
}

module.exports = {
    SCHEMA_VERSION,
    sendData,
    sendError,
};

