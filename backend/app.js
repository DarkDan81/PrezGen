const express = require('express');
const path = require('path');
const fs = require('fs');
const { config } = require('./config');
const { authenticateRequest, requireAuth } = require('./middleware/auth');
const { getPresentationById } = require('./repositories/presentation-repository');
const { requestMeta } = require('./middleware/request-meta');
const { presentationsRouter } = require('./routes/presentations');
const { ApiError } = require('./utils/errors');
const { sendError, sendData } = require('./utils/response');

function createApp() {
    const app = express();
    const frontendIndexPath = path.join(config.frontendDistDir, 'index.html');
    const hasFrontendBuild = fs.existsSync(frontendIndexPath);
    const bodyLimit = '35mb';
    app.use(express.json({ limit: bodyLimit }));
    app.use(express.urlencoded({ limit: bodyLimit, extended: true }));
    app.use(requestMeta);
    app.use(authenticateRequest);
    app.use('/themes', express.static(path.join(__dirname, '../themes')));
    app.use('/content', requireAuth, (req, res, next) => {
        const match = /^\/presentations\/([^/]+)\//.exec(req.path || '');
        if (!match) return next();
        const presentation = getPresentationById(match[1]);
        if (!presentation || (req.user.role !== 'admin' && presentation.ownerUserId !== req.user.id)) {
            return res.status(404).send('Not found');
        }
        return next();
    }, express.static(config.dataDir));

    app.get('/api/v1/health', (req, res) => sendData(req, res, { ok: true }));
    app.use('/api/v1', presentationsRouter);
    if (hasFrontendBuild) {
        app.use(express.static(config.frontendDistDir, { index: false }));
        app.get(/^(?!\/api\/|\/content\/|\/themes\/).*/, (req, res, next) => {
            if (!req.accepts('html')) return next();
            return res.sendFile(frontendIndexPath);
        });
    }

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
