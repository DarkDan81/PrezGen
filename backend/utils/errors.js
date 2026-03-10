class ApiError extends Error {
    constructor(status, code, message, details = []) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

function validationError(details) {
    return new ApiError(400, 'VALIDATION_ERROR', 'Payload validation failed', details);
}

function unauthorized(message = 'Unauthorized') {
    return new ApiError(401, 'UNAUTHORIZED', message);
}

function forbidden(message = 'Forbidden') {
    return new ApiError(403, 'FORBIDDEN', message);
}

function notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
}

module.exports = {
    ApiError,
    forbidden,
    validationError,
    notFound,
    unauthorized,
};

