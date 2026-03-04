const express = require('express');
const path = require('path');
const { requestMeta } = require('./middleware/request-meta');
const { presentationsRouter } = require('./routes/presentations');
const { ApiError } = require('./utils/errors');
const { sendError, sendData } = require('./utils/response');

function createApp() {
    const app = express();
    const bodyLimit = '35mb';
    app.use(express.json({ limit: bodyLimit }));
    app.use(express.urlencoded({ limit: bodyLimit, extended: true }));
    app.use(requestMeta);
    app.use('/themes', express.static(path.join(__dirname, '../themes')));
    app.use('/dist', express.static(path.join(__dirname, '../dist')));
    app.use('/content', express.static(path.join(__dirname, '../data')));

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
