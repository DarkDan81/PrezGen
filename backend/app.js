const express = require('express');
const { requestMeta } = require('./middleware/request-meta');
const { presentationsRouter } = require('./routes/presentations');
const { ApiError } = require('./utils/errors');
const { sendError, sendData } = require('./utils/response');

function createApp() {
    const app = express();
    app.use(express.json({ limit: '2mb' }));
    app.use(requestMeta);

    app.get('/api/v1/health', (req, res) => sendData(req, res, { ok: true }));
    app.use('/api/v1', presentationsRouter);

    app.use((error, req, res, _next) => {
        if (error instanceof ApiError) {
            return sendError(req, res, error.status, error.code, error.message, error.details);
        }
        console.error(error);
        return sendError(req, res, 500, 'INTERNAL_ERROR', 'Internal server error');
    });

    return app;
}

module.exports = { createApp };

