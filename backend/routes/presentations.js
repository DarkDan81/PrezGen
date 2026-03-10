const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { config } = require('../config');
const { createAuthToken, deactivateAuthTokensByUser, getActiveAuthTokenByHash, listAuthTokensByUser } = require('../repositories/auth-token-repository');
const {
    createPresentation,
    deletePresentationById,
    getPresentationById,
    listPresentations,
    updatePresentationById,
} = require('../repositories/presentation-repository');
const {
    createSlide,
    deleteSlideById,
    getSlideById,
    getNextOrderForPresentation,
    listSlidesByPresentation,
    reorderSlides,
    updateSlideById,
} = require('../repositories/slide-repository');
const {
    createDataset,
    deleteDatasetById,
    getDatasetById,
    listDatasetsByPresentation,
    updateDatasetById,
} = require('../repositories/dataset-repository');
const {
    createBlock,
    deleteBlockById,
    getBlockById,
    getNextOrderForSlide,
    listBlocksBySlide,
    reorderBlocks,
    updateBlockById,
} = require('../repositories/block-repository');
const {
    createTheme,
    deleteThemeById,
    getThemeByIdFromDb,
    listThemesFromDb,
    updateThemeById,
} = require('../repositories/theme-repository');
const { countUsers, createUser, getUserById, getUserByLogin, listUsers, updateUserById } = require('../repositories/user-repository');
const { getLayoutPresetById, listLayoutPresets } = require('../repositories/layout-preset-repository');
const { requireAdmin, requireAuth } = require('../middleware/auth');
const {
    assertCanAccessBlock,
    assertCanAccessDataset,
    assertCanAccessPresentation,
    assertCanAccessRenderJob,
    assertCanAccessSlide,
    assertCanAccessTheme,
} = require('../services/access-service');
const { clearAuthCookie, generateRawToken, hashToken, issueAuthCookie } = require('../services/auth-service');
const { getThemeById, listThemes, normalizeThemeId } = require('../services/themes-service');
const { buildPreviewHtml, buildThemePreviewHtml } = require('../services/preview-service');
const { createRenderJob } = require('../repositories/render-job-repository');
const { queuePdfJob, queuePptxJob } = require('../services/render-service');
const { parseCsvToDatasetShape } = require('../services/csv-service');
const { sanitizeRichHtml } = require('../services/sanitize-service');
const { validateBlockConfig } = require('../validation/block-config');
const {
    validateLayoutBindingPayload,
    validateSlotAssignmentsAgainstLayout,
    normalizeThemeTokens,
    validateThemeTokens,
} = require('../validation/theme-layout');
const { validationError, notFound, unauthorized } = require('../utils/errors');
const { SCHEMA_VERSION, sendData } = require('../utils/response');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});

function isValidStatus(status) {
    return new Set(['draft', 'published', 'archived']).has(status);
}

function validateDatasetColumns(columns) {
    if (!Array.isArray(columns) || columns.length === 0) return false;
    const allowedTypes = new Set(['string', 'number', 'date', 'boolean']);
    return columns.every((col) => (
        col &&
        typeof col.key === 'string' &&
        typeof col.label === 'string' &&
        allowedTypes.has(col.type) &&
        (col.nullable === undefined || typeof col.nullable === 'boolean')
    ));
}

function isValidBlockType(type) {
    return new Set(['chart', 'table', 'kpi', 'text', 'image']).has(type);
}

function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeBlockConfig(type, config) {
    if (type !== 'text') return config;
    return {
        ...config,
        html: sanitizeRichHtml(config.html),
    };
}

function sanitizeFileName(name) {
    return String(name || 'file')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 120);
}

function sanitizeLogin(login) {
    return String(login || '').trim().toLowerCase();
}

function serializeUser(user) {
    return {
        id: user.id,
        login: user.login,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        quotas: user.quotas || {},
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

function serializeAuthTokenMeta(token) {
    return {
        id: token.id,
        label: token.label,
        isActive: token.isActive,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
        lastUsedAt: token.lastUsedAt,
    };
}

router.post('/auth/login', (req, res, next) => {
    try {
        const token = String(req.body?.token || '').trim();
        if (!token) {
            throw validationError([{ path: 'token', rule: 'required', message: 'token is required' }]);
        }
        const authToken = getActiveAuthTokenByHash(hashToken(token));
        if (!authToken) throw unauthorized('Invalid token');
        const user = getUserById(authToken.userId);
        if (!user || !user.isActive) throw unauthorized('Invalid token');
        issueAuthCookie(res, token);
        return sendData(req, res, { user: serializeUser(user) });
    } catch (error) {
        return next(error);
    }
});

router.post('/auth/logout', (req, res) => {
    clearAuthCookie(res);
    return sendData(req, res, { ok: true });
});

router.get('/auth/me', requireAuth, (req, res) => {
    return sendData(req, res, { user: serializeUser(req.user) });
});

router.get('/admin/users', requireAuth, requireAdmin, (req, res, next) => {
    try {
        const data = listUsers().map((user) => ({
            ...serializeUser(user),
            tokens: listAuthTokensByUser(user.id).map(serializeAuthTokenMeta),
        }));
        return sendData(req, res, data);
    } catch (error) {
        return next(error);
    }
});

router.post('/admin/users', requireAuth, requireAdmin, (req, res, next) => {
    try {
        const login = sanitizeLogin(req.body?.login);
        const name = String(req.body?.name || '').trim();
        const role = req.body?.role === 'admin' ? 'admin' : req.body?.role === undefined || req.body?.role === 'user' ? 'user' : null;
        const details = [];
        if (!login) details.push({ path: 'login', rule: 'required', message: 'login is required' });
        if (!name) details.push({ path: 'name', rule: 'required', message: 'name is required' });
        if (!role) details.push({ path: 'role', rule: 'enum', message: 'role must be admin or user' });
        if (req.body?.quotas !== undefined && (typeof req.body.quotas !== 'object' || req.body.quotas === null || Array.isArray(req.body.quotas))) {
            details.push({ path: 'quotas', rule: 'object', message: 'quotas must be an object' });
        }
        if (getUserByLogin(login)) details.push({ path: 'login', rule: 'unique', message: 'login already exists' });
        if (details.length) throw validationError(details);

        const now = new Date().toISOString();
        const created = createUser({
            id: `user-${randomUUID()}`,
            login,
            name,
            role,
            isActive: true,
            quotas: req.body?.quotas && typeof req.body.quotas === 'object' ? req.body.quotas : {},
            createdAt: now,
            updatedAt: now,
        });
        const rawToken = generateRawToken();
        createAuthToken({
            id: `token-${randomUUID()}`,
            userId: created.id,
            label: 'initial',
            tokenHash: hashToken(rawToken),
            isActive: true,
            createdAt: now,
            updatedAt: now,
        });

        return sendData(req, res, { user: serializeUser(created), token: rawToken }, 201);
    } catch (error) {
        return next(error);
    }
});

router.patch('/admin/users/:userId', requireAuth, requireAdmin, (req, res, next) => {
    try {
        const current = getUserById(req.params.userId);
        if (!current) throw notFound('User not found');
        const login = req.body?.login !== undefined ? sanitizeLogin(req.body.login) : undefined;
        const details = [];
        if (login && login !== current.login && getUserByLogin(login)) {
            details.push({ path: 'login', rule: 'unique', message: 'login already exists' });
        }
        if (req.body?.role !== undefined && req.body.role !== 'admin' && req.body.role !== 'user') {
            details.push({ path: 'role', rule: 'enum', message: 'role must be admin or user' });
        }
        if (req.body?.quotas !== undefined && (typeof req.body.quotas !== 'object' || req.body.quotas === null || Array.isArray(req.body.quotas))) {
            details.push({ path: 'quotas', rule: 'object', message: 'quotas must be an object' });
        }
        if (details.length) {
            throw validationError(details);
        }
        const updated = updateUserById(current.id, {
            login,
            name: req.body?.name !== undefined ? String(req.body.name || '').trim() : undefined,
            role: req.body?.role !== undefined ? req.body.role : undefined,
            isActive: req.body?.isActive !== undefined ? Boolean(req.body.isActive) : undefined,
            quotas: req.body?.quotas !== undefined ? req.body.quotas : undefined,
            updatedAt: new Date().toISOString(),
        });
        return sendData(req, res, { user: serializeUser(updated) });
    } catch (error) {
        return next(error);
    }
});

router.post('/admin/users/:userId/tokens/reset', requireAuth, requireAdmin, (req, res, next) => {
    try {
        const user = getUserById(req.params.userId);
        if (!user) throw notFound('User not found');
        const now = new Date().toISOString();
        deactivateAuthTokensByUser(user.id, now);
        const rawToken = generateRawToken();
        createAuthToken({
            id: `token-${randomUUID()}`,
            userId: user.id,
            label: String(req.body?.label || 'reset'),
            tokenHash: hashToken(rawToken),
            isActive: true,
            createdAt: now,
            updatedAt: now,
        });
        return sendData(req, res, { token: rawToken });
    } catch (error) {
        return next(error);
    }
});

router.use(requireAuth);

router.post('/presentations', (req, res, next) => {
    try {
        const { name, description, themeId } = req.body || {};
        const details = [];

        if (!name || typeof name !== 'string') {
            details.push({ path: 'name', rule: 'required', message: 'name is required' });
        }
        if (!themeId || typeof themeId !== 'string') {
            details.push({ path: 'themeId', rule: 'required', message: 'themeId is required' });
        }
        if (details.length) throw validationError(details);

        const now = new Date().toISOString();
        const presentation = createPresentation({
            id: randomUUID(),
            ownerUserId: req.user.id,
            name: name.trim(),
            description: typeof description === 'string' ? description : null,
            themeId: themeId.trim(),
            themeOverrides: null,
            status: 'draft',
            schemaVersion: SCHEMA_VERSION,
            createdAt: now,
            updatedAt: now,
        });

        return sendData(req, res, presentation, 201);
    } catch (error) {
        return next(error);
    }
});

router.get('/presentations', (req, res, next) => {
    try {
        const status = req.query.status ? String(req.query.status) : undefined;
        const q = req.query.q ? String(req.query.q) : undefined;
        const data = listPresentations({ status, q, ownerUserId: req.user.role === 'admin' ? undefined : req.user.id });
        return sendData(req, res, data);
    } catch (error) {
        return next(error);
    }
});

router.get('/presentations/:presentationId', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        const data = assertCanAccessPresentation(req.user, presentationId);
        return sendData(req, res, data);
    } catch (error) {
        return next(error);
    }
});

router.patch('/presentations/:presentationId', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        const current = assertCanAccessPresentation(req.user, presentationId);

        const { name, description, themeId, themeOverrides, status } = req.body || {};
        const details = [];

        if (name !== undefined && typeof name !== 'string') {
            details.push({ path: 'name', rule: 'string', message: 'name must be a string' });
        }
        if (description !== undefined && description !== null && typeof description !== 'string') {
            details.push({ path: 'description', rule: 'string', message: 'description must be a string or null' });
        }
        if (themeId !== undefined && typeof themeId !== 'string') {
            details.push({ path: 'themeId', rule: 'string', message: 'themeId must be a string' });
        }
        if (themeOverrides !== undefined && (typeof themeOverrides !== 'object' || Array.isArray(themeOverrides) || themeOverrides === null)) {
            details.push({ path: 'themeOverrides', rule: 'object', message: 'themeOverrides must be an object or null' });
        }
        if (status !== undefined && !isValidStatus(status)) {
            details.push({ path: 'status', rule: 'enum', message: 'status must be draft, published, or archived' });
        }
        if (details.length) throw validationError(details);

        const data = updatePresentationById(presentationId, {
            name: name !== undefined ? name.trim() : undefined,
            description,
            themeId: themeId !== undefined ? themeId.trim() : undefined,
            themeOverrides,
            status,
            updatedAt: new Date().toISOString(),
        });
        return sendData(req, res, data);
    } catch (error) {
        return next(error);
    }
});

router.delete('/presentations/:presentationId', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        assertCanAccessPresentation(req.user, presentationId);
        const ok = deletePresentationById(presentationId);
        if (!ok) throw notFound('Presentation not found');
        return res.status(204).send();
    } catch (error) {
        return next(error);
    }
});

router.post('/presentations/:presentationId/slides', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        assertCanAccessPresentation(req.user, presentationId);

        const { type, title, subtitle, notes } = req.body || {};
        const details = [];
        const allowedTypes = new Set(['title', 'content']);
        if (!type || !allowedTypes.has(type)) {
            details.push({ path: 'type', rule: 'enum', message: 'type must be title or content' });
        }
        if (details.length) throw validationError(details);

        const now = new Date().toISOString();
        const order = getNextOrderForPresentation(presentationId);
        const slide = createSlide({
            id: randomUUID(),
            presentationId,
            order,
            type,
            title: typeof title === 'string' ? title : null,
            subtitle: typeof subtitle === 'string' ? subtitle : null,
            notes: typeof notes === 'string' ? notes : null,
            createdAt: now,
            updatedAt: now,
        });

        return sendData(req, res, slide, 201);
    } catch (error) {
        return next(error);
    }
});

router.get('/presentations/:presentationId/slides', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        assertCanAccessPresentation(req.user, presentationId);
        return sendData(req, res, listSlidesByPresentation(presentationId));
    } catch (error) {
        return next(error);
    }
});

router.post('/presentations/:presentationId/slides/reorder', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        assertCanAccessPresentation(req.user, presentationId);

        const { slideIds } = req.body || {};
        if (!Array.isArray(slideIds) || slideIds.length === 0 || slideIds.some((id) => typeof id !== 'string')) {
            throw validationError([
                { path: 'slideIds', rule: 'array', message: 'slideIds must be a non-empty string array' },
            ]);
        }

        const ok = reorderSlides(presentationId, slideIds, new Date().toISOString());
        if (!ok) {
            throw validationError([
                { path: 'slideIds', rule: 'membership', message: 'slideIds must match all slides in the presentation' },
            ]);
        }

        return sendData(req, res, listSlidesByPresentation(presentationId));
    } catch (error) {
        return next(error);
    }
});

router.get('/slides/:slideId', (req, res, next) => {
    try {
        const { slideId } = req.params;
        const slide = assertCanAccessSlide(req.user, slideId);
        return sendData(req, res, slide);
    } catch (error) {
        return next(error);
    }
});

router.patch('/slides/:slideId', (req, res, next) => {
    try {
        const { slideId } = req.params;
        const current = assertCanAccessSlide(req.user, slideId);

        const { type, title, subtitle, notes } = req.body || {};
        const details = [];
        const allowedTypes = new Set(['title', 'content']);
        if (type !== undefined && !allowedTypes.has(type)) {
            details.push({ path: 'type', rule: 'enum', message: 'type must be title or content' });
        }
        if (title !== undefined && title !== null && typeof title !== 'string') {
            details.push({ path: 'title', rule: 'string', message: 'title must be a string or null' });
        }
        if (subtitle !== undefined && subtitle !== null && typeof subtitle !== 'string') {
            details.push({ path: 'subtitle', rule: 'string', message: 'subtitle must be a string or null' });
        }
        if (notes !== undefined && notes !== null && typeof notes !== 'string') {
            details.push({ path: 'notes', rule: 'string', message: 'notes must be a string or null' });
        }
        if (details.length) throw validationError(details);

        const updated = updateSlideById(slideId, {
            type,
            title,
            subtitle,
            notes,
            updatedAt: new Date().toISOString(),
        });
        return sendData(req, res, updated);
    } catch (error) {
        return next(error);
    }
});

router.patch('/slides/:slideId/layout', (req, res, next) => {
    try {
        const { slideId } = req.params;
        const slide = assertCanAccessSlide(req.user, slideId);
        if (slide.type === 'title') {
            throw validationError([
                { path: 'slideId', rule: 'slideType', message: 'Title slides do not support layout presets' },
            ]);
        }

        const { details } = validateLayoutBindingPayload(req.body || {});
        if (details.length) throw validationError(details);

        const { layoutPresetId, slotAssignments = [] } = req.body || {};
        const layoutPreset = getLayoutPresetById(layoutPresetId);
        const slideBlocks = listBlocksBySlide(slideId);
        const membership = validateSlotAssignmentsAgainstLayout(layoutPreset, slotAssignments, slideBlocks);
        if (membership.details.length) throw validationError(membership.details);

        const updated = updateSlideById(slideId, {
            layoutPresetId,
            slotAssignments,
            updatedAt: new Date().toISOString(),
        });
        return sendData(req, res, updated);
    } catch (error) {
        return next(error);
    }
});

router.delete('/slides/:slideId', (req, res, next) => {
    try {
        const { slideId } = req.params;
        assertCanAccessSlide(req.user, slideId);
        const ok = deleteSlideById(slideId);
        if (!ok) throw notFound('Slide not found');
        return res.status(204).send();
    } catch (error) {
        return next(error);
    }
});

router.post('/presentations/:presentationId/datasets', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        assertCanAccessPresentation(req.user, presentationId);

        const { name, sourceType, columns, rows, meta } = req.body || {};
        const details = [];

        if (!name || typeof name !== 'string') {
            details.push({ path: 'name', rule: 'required', message: 'name is required' });
        }
        if (sourceType !== 'manual_table') {
            details.push({ path: 'sourceType', rule: 'enum', message: 'sourceType must be manual_table in current slice' });
        }
        if (!validateDatasetColumns(columns)) {
            details.push({ path: 'columns', rule: 'schema', message: 'columns must match dataset column schema' });
        }
        if (!Array.isArray(rows)) {
            details.push({ path: 'rows', rule: 'array', message: 'rows must be an array' });
        }
        if (meta !== undefined && (typeof meta !== 'object' || Array.isArray(meta) || meta === null)) {
            details.push({ path: 'meta', rule: 'object', message: 'meta must be an object if provided' });
        }
        if (details.length) throw validationError(details);

        const now = new Date().toISOString();
        const dataset = createDataset({
            id: randomUUID(),
            presentationId,
            name: name.trim(),
            sourceType,
            columns,
            rows,
            meta: meta || { rowCount: rows.length },
            createdAt: now,
            updatedAt: now,
        });

        return sendData(req, res, dataset, 201);
    } catch (error) {
        return next(error);
    }
});

router.post('/presentations/:presentationId/datasets/upload-csv', upload.single('file'), (req, res, next) => {
    try {
        const { presentationId } = req.params;
        assertCanAccessPresentation(req.user, presentationId);

        const name = req.body?.name;
        const file = req.file;
        const details = [];
        if (!name || typeof name !== 'string') {
            details.push({ path: 'name', rule: 'required', message: 'name is required' });
        }
        if (!file || !file.buffer) {
            details.push({ path: 'file', rule: 'required', message: 'CSV file is required' });
        }
        if (details.length) throw validationError(details);

        const parsed = parseCsvToDatasetShape(file.buffer);
        if (!parsed.columns.length) {
            throw validationError([{ path: 'file', rule: 'content', message: 'CSV must contain header and at least one row' }]);
        }

        const now = new Date().toISOString();
        const dataset = createDataset({
            id: randomUUID(),
            presentationId,
            name: name.trim(),
            sourceType: 'upload_csv',
            columns: parsed.columns,
            rows: parsed.rows,
            meta: {
                rowCount: parsed.rows.length,
                fileName: file.originalname,
            },
            createdAt: now,
            updatedAt: now,
        });
        return sendData(req, res, dataset, 201);
    } catch (error) {
        return next(error);
    }
});

router.get('/presentations/:presentationId/datasets', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        assertCanAccessPresentation(req.user, presentationId);

        return sendData(req, res, listDatasetsByPresentation(presentationId));
    } catch (error) {
        return next(error);
    }
});

router.get('/datasets/:datasetId', (req, res, next) => {
    try {
        const { datasetId } = req.params;
        const dataset = assertCanAccessDataset(req.user, datasetId);
        return sendData(req, res, dataset);
    } catch (error) {
        return next(error);
    }
});

router.patch('/datasets/:datasetId', (req, res, next) => {
    try {
        const { datasetId } = req.params;
        const current = assertCanAccessDataset(req.user, datasetId);

        const { name, columns, rows, meta } = req.body || {};
        const details = [];
        if (name !== undefined && typeof name !== 'string') {
            details.push({ path: 'name', rule: 'string', message: 'name must be a string' });
        }
        if (columns !== undefined && !validateDatasetColumns(columns)) {
            details.push({ path: 'columns', rule: 'schema', message: 'columns must match dataset column schema' });
        }
        if (rows !== undefined && !Array.isArray(rows)) {
            details.push({ path: 'rows', rule: 'array', message: 'rows must be an array' });
        }
        if (meta !== undefined && (typeof meta !== 'object' || meta === null || Array.isArray(meta))) {
            details.push({ path: 'meta', rule: 'object', message: 'meta must be an object if provided' });
        }
        if (details.length) throw validationError(details);

        const updated = updateDatasetById(datasetId, {
            name: name !== undefined ? name.trim() : undefined,
            columns,
            rows,
            meta,
            updatedAt: new Date().toISOString(),
        });

        return sendData(req, res, updated);
    } catch (error) {
        return next(error);
    }
});

router.delete('/datasets/:datasetId', (req, res, next) => {
    try {
        const { datasetId } = req.params;
        assertCanAccessDataset(req.user, datasetId);
        const ok = deleteDatasetById(datasetId);
        if (!ok) throw notFound('Dataset not found');
        return res.status(204).send();
    } catch (error) {
        return next(error);
    }
});

router.post('/presentations/:presentationId/assets/upload-image', upload.single('file'), (req, res, next) => {
    try {
        const { presentationId } = req.params;
        assertCanAccessPresentation(req.user, presentationId);

        const file = req.file;
        const details = [];
        if (!file || !file.buffer) {
            details.push({ path: 'file', rule: 'required', message: 'Image file is required' });
        } else if (!String(file.mimetype || '').startsWith('image/')) {
            details.push({ path: 'file', rule: 'mimetype', message: 'Only image files are allowed' });
        }
        if (details.length) throw validationError(details);

        const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
        const base = path.basename(file.originalname || `image${ext}`, ext);
        const safeName = sanitizeFileName(base);
        const fileName = `${Date.now()}_${safeName}${ext}`;
        const assetsDir = path.join(__dirname, '../../data/presentations', presentationId, 'assets');
        fs.mkdirSync(assetsDir, { recursive: true });

        const fullPath = path.join(assetsDir, fileName);
        fs.writeFileSync(fullPath, file.buffer);

        return sendData(req, res, {
            fileName,
            url: `/content/presentations/${presentationId}/assets/${fileName}`,
        }, 201);
    } catch (error) {
        return next(error);
    }
});

router.get('/themes', (req, res, next) => {
    try {
        const data = listThemesFromDb(req.user.id);
        return sendData(req, res, data.length ? data : listThemes());
    } catch (error) {
        return next(error);
    }
});

router.get('/themes/:themeId', (req, res, next) => {
    try {
        const { themeId } = req.params;
        const theme = themeId.startsWith('theme-') ? (getThemeByIdFromDb(themeId) || getThemeById(themeId)) : getThemeById(themeId);
        if (!theme) throw notFound('Theme not found');
        if (!theme.isSystem && req.user.role !== 'admin' && theme.ownerUserId !== req.user.id) {
            throw notFound('Theme not found');
        }
        return sendData(req, res, theme);
    } catch (error) {
        return next(error);
    }
});

router.post('/themes', (req, res, next) => {
    try {
        const { name, tokens, baseThemeId } = req.body || {};
        const details = [];
        if (!name || typeof name !== 'string') {
            details.push({ path: 'name', rule: 'required', message: 'name is required' });
        }

        const tokenValidation = validateThemeTokens(tokens);
        details.push(...tokenValidation.details);
        if (details.length) throw validationError(details);
        const normalized = normalizeThemeTokens(tokens);

        const now = new Date().toISOString();
        const created = createTheme({
            id: `theme-${randomUUID()}`,
            ownerUserId: req.user.id,
            name: name.trim(),
            kind: 'custom',
            isSystem: false,
            baseThemeId: typeof baseThemeId === 'string' ? baseThemeId : null,
            baseCssPath: null,
            tokens: normalized.tokens,
            createdAt: now,
            updatedAt: now,
        });

        return sendData(req, res, { ...created, warnings: [...tokenValidation.warnings, ...normalized.warnings] }, 201);
    } catch (error) {
        return next(error);
    }
});

router.patch('/themes/:themeId', (req, res, next) => {
    try {
        const { themeId } = req.params;
        const existing = assertCanAccessTheme(req.user, themeId);
        if (existing.isSystem) {
            throw validationError([{ path: 'themeId', rule: 'immutable', message: 'System themes cannot be updated directly' }]);
        }

        const { name, tokens } = req.body || {};
        const details = [];
        if (name !== undefined && typeof name !== 'string') {
            details.push({ path: 'name', rule: 'string', message: 'name must be a string' });
        }

        let tokenValidation = { details: [], warnings: [] };
        if (tokens !== undefined) {
            tokenValidation = validateThemeTokens(tokens);
            details.push(...tokenValidation.details);
        }
        if (details.length) throw validationError(details);
        const normalized = tokens !== undefined ? normalizeThemeTokens(tokens, { baseTokens: existing.tokens || {} }) : null;

        const updated = updateThemeById(themeId, {
            name: name !== undefined ? name.trim() : undefined,
            tokens: normalized ? normalized.tokens : undefined,
            updatedAt: new Date().toISOString(),
        });

        return sendData(req, res, { ...updated, warnings: [...tokenValidation.warnings, ...(normalized?.warnings || [])] });
    } catch (error) {
        return next(error);
    }
});

router.delete('/themes/:themeId', (req, res, next) => {
    try {
        const { themeId } = req.params;
        const existing = assertCanAccessTheme(req.user, themeId);
        if (existing.isSystem) {
            throw validationError([{ path: 'themeId', rule: 'immutable', message: 'System themes cannot be deleted directly' }]);
        }
        const ok = deleteThemeById(themeId);
        if (!ok) throw notFound('Theme not found');
        return res.status(204).send();
    } catch (error) {
        return next(error);
    }
});

router.post('/themes/:themeId/duplicate', (req, res, next) => {
    try {
        const { themeId } = req.params;
        const source = themeId.startsWith('theme-') ? (getThemeByIdFromDb(themeId) || getThemeById(themeId)) : getThemeById(themeId);
        if (!source) throw notFound('Theme not found');
        if (!source.isSystem && req.user.role !== 'admin' && source.ownerUserId !== req.user.id) {
            throw notFound('Theme not found');
        }

        const now = new Date().toISOString();
        const duplicated = createTheme({
            id: `theme-${randomUUID()}`,
            ownerUserId: req.user.id,
            name: `${source.name} copy`,
            kind: 'custom',
            isSystem: false,
            baseThemeId: source.id,
            baseCssPath: null,
            tokens: source.tokens || {},
            createdAt: now,
            updatedAt: now,
        });
        return sendData(req, res, duplicated, 201);
    } catch (error) {
        return next(error);
    }
});

router.get('/themes/:themeId/export', (req, res, next) => {
    try {
        const { themeId } = req.params;
        const theme = assertCanAccessTheme(req.user, themeId);

        const exported = {
            schemaVersion: 2,
            theme: {
                id: theme.id,
                name: theme.name,
                kind: theme.kind,
                isSystem: theme.isSystem,
                baseThemeId: theme.baseThemeId || null,
                tokens: theme.tokens || {},
            },
        };
        return sendData(req, res, exported);
    } catch (error) {
        return next(error);
    }
});

router.post('/themes/import', (req, res, next) => {
    try {
        const payload = req.body || {};
        const details = [];
        const schemaVersion = payload.schemaVersion;
        const importedTheme = payload.theme;

        if (schemaVersion !== 1 && schemaVersion !== 2) {
            details.push({ path: 'schemaVersion', rule: 'version', message: 'schemaVersion must be 1 or 2' });
        }
        if (!importedTheme || typeof importedTheme !== 'object') {
            details.push({ path: 'theme', rule: 'object', message: 'theme object is required' });
        }
        if (details.length) throw validationError(details);

        const tokenValidation = validateThemeTokens(importedTheme.tokens);
        if (tokenValidation.details.length) throw validationError(tokenValidation.details);
        const normalized = normalizeThemeTokens(importedTheme.tokens);

        const now = new Date().toISOString();
        const created = createTheme({
            id: `theme-${randomUUID()}`,
            ownerUserId: req.user.id,
            name: typeof importedTheme.name === 'string' && importedTheme.name.trim()
                ? importedTheme.name.trim()
                : `Imported Theme ${now}`,
            kind: 'custom',
            isSystem: false,
            baseThemeId: typeof importedTheme.baseThemeId === 'string' ? importedTheme.baseThemeId : null,
            baseCssPath: null,
            tokens: normalized.tokens,
            createdAt: now,
            updatedAt: now,
        });

        return sendData(req, res, { ...created, warnings: [...tokenValidation.warnings, ...normalized.warnings] }, 201);
    } catch (error) {
        return next(error);
    }
});

router.post('/themes/preview', (req, res, next) => {
    try {
        const { themeId, baseThemeId, tokens } = req.body || {};
        const details = [];
        if (themeId !== undefined && typeof themeId !== 'string') {
            details.push({ path: 'themeId', rule: 'string', message: 'themeId must be a string' });
        }
        if (baseThemeId !== undefined && typeof baseThemeId !== 'string') {
            details.push({ path: 'baseThemeId', rule: 'string', message: 'baseThemeId must be a string' });
        }
        if (tokens !== undefined && !isPlainObject(tokens)) {
            details.push({ path: 'tokens', rule: 'object', message: 'tokens must be an object' });
        }

        const baseTheme = typeof baseThemeId === 'string' && baseThemeId
            ? (getThemeByIdFromDb(baseThemeId) || getThemeById(baseThemeId))
            : (typeof themeId === 'string' && themeId ? (getThemeByIdFromDb(themeId) || getThemeById(themeId)) : null);
        if (baseTheme && !baseTheme.isSystem && req.user.role !== 'admin' && baseTheme.ownerUserId !== req.user.id) {
            throw notFound('Theme not found');
        }
        if (tokens !== undefined) {
            const inputValidation = validateThemeTokens(tokens);
            details.push(...inputValidation.details);
        }
        if (details.length) throw validationError(details);
        const normalized = normalizeThemeTokens(tokens || (baseTheme?.tokens || {}), { baseTokens: baseTheme?.tokens || {} });
        const tokenValidation = validateThemeTokens(normalized.tokens);

        if (tokenValidation.details.length) throw validationError(tokenValidation.details);

        const resolvedBaseThemeId = (() => {
            if (typeof baseThemeId === 'string' && baseThemeId) return baseThemeId;
            if (baseTheme?.baseThemeId) return baseTheme.baseThemeId;
            if (baseTheme?.isSystem) return baseTheme.id;
            return 'theme-universal-warm';
        })();

        const html = buildThemePreviewHtml({
            themeSlug: normalizeThemeId(resolvedBaseThemeId),
            tokens: normalized.tokens,
        });

        return sendData(req, res, {
            html,
            warnings: [...tokenValidation.warnings, ...normalized.warnings],
            mode: 'pptx-safe-preview',
            sceneIds: ['title', 'content', 'table', 'chart', 'cards'],
        });
    } catch (error) {
        return next(error);
    }
});

router.get('/layout-presets', (req, res, next) => {
    try {
        return sendData(req, res, listLayoutPresets());
    } catch (error) {
        return next(error);
    }
});

router.get('/layout-presets/:layoutPresetId', (req, res, next) => {
    try {
        const { layoutPresetId } = req.params;
        const preset = getLayoutPresetById(layoutPresetId);
        if (!preset) throw notFound('Layout preset not found');
        return sendData(req, res, preset);
    } catch (error) {
        return next(error);
    }
});

router.post('/presentations/:presentationId/render/preview', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        assertCanAccessPresentation(req.user, presentationId);

        return sendData(req, res, {
            previewUrl: `/api/v1/preview/${presentationId}`,
        });
    } catch (error) {
        return next(error);
    }
});

router.post('/presentations/:presentationId/render/pdf', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        assertCanAccessPresentation(req.user, presentationId);

        const now = new Date().toISOString();
        const job = createRenderJob({
            id: randomUUID(),
            ownerUserId: req.user.id,
            presentationId,
            type: 'export_pdf',
            status: 'queued',
            result: null,
            error: null,
            createdAt: now,
            updatedAt: now,
        });
        queuePdfJob(job);
        return sendData(req, res, job, 202);
    } catch (error) {
        return next(error);
    }
});

router.post('/presentations/:presentationId/render/pptx', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        assertCanAccessPresentation(req.user, presentationId);
        const mode = req.body?.mode;
        if (mode !== undefined && mode !== 'hybrid_native' && mode !== 'hybrid_blocks' && mode !== 'raster') {
            throw validationError([{
                path: 'mode',
                rule: 'enum',
                message: 'mode must be one of hybrid_native, hybrid_blocks or raster',
            }]);
        }

        const now = new Date().toISOString();
        const job = createRenderJob({
            id: randomUUID(),
            ownerUserId: req.user.id,
            presentationId,
            type: 'export_pptx_future',
            status: 'queued',
            result: null,
            error: null,
            createdAt: now,
            updatedAt: now,
            options: {
                mode: mode || 'hybrid_native',
            },
        });
        queuePptxJob(job);
        return sendData(req, res, job, 202);
    } catch (error) {
        return next(error);
    }
});

router.get('/render-jobs/:jobId', (req, res, next) => {
    try {
        const { jobId } = req.params;
        const job = assertCanAccessRenderJob(req.user, jobId);
        return sendData(req, res, job);
    } catch (error) {
        return next(error);
    }
});

router.get('/render-jobs/:jobId/download', (req, res, next) => {
    try {
        const job = assertCanAccessRenderJob(req.user, req.params.jobId);
        if (!job.result?.fileName) throw notFound('Render artifact not found');
        const exportPath = path.join(__dirname, '../../dist/export', job.result.fileName);
        if (!fs.existsSync(exportPath)) throw notFound('Render artifact not found');
        return res.download(exportPath, job.result.fileName);
    } catch (error) {
        return next(error);
    }
});

router.get('/preview/:presentationId', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        assertCanAccessPresentation(req.user, presentationId);
        const html = buildPreviewHtml(presentationId);
        if (!html) throw notFound('Presentation not found');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(html);
    } catch (error) {
        return next(error);
    }
});

router.post('/slides/:slideId/blocks', (req, res, next) => {
    try {
        const { slideId } = req.params;
        const slide = assertCanAccessSlide(req.user, slideId);
        if (slide.type === 'title') {
            throw validationError([
                { path: 'slideId', rule: 'slideType', message: 'Cannot add blocks to title slides' },
            ]);
        }

        const { type, layout, config } = req.body || {};
        const details = [];
        if (!isValidBlockType(type)) {
            details.push({ path: 'type', rule: 'enum', message: 'type must be chart, table, kpi, text, or image' });
        }
        if (layout !== undefined && !isPlainObject(layout)) {
            details.push({ path: 'layout', rule: 'object', message: 'layout must be an object if provided' });
        }
        details.push(...validateBlockConfig(type, config));
        if (details.length) throw validationError(details);

        const sanitizedConfig = sanitizeBlockConfig(type, config);
        const now = new Date().toISOString();
        const block = createBlock({
            id: randomUUID(),
            presentationId: slide.presentationId,
            slideId,
            order: getNextOrderForSlide(slideId),
            type,
            layout: layout || null,
            config: sanitizedConfig,
            createdAt: now,
            updatedAt: now,
        });

        return sendData(req, res, block, 201);
    } catch (error) {
        return next(error);
    }
});

router.get('/slides/:slideId/blocks', (req, res, next) => {
    try {
        const { slideId } = req.params;
        assertCanAccessSlide(req.user, slideId);
        return sendData(req, res, listBlocksBySlide(slideId));
    } catch (error) {
        return next(error);
    }
});

router.post('/slides/:slideId/blocks/reorder', (req, res, next) => {
    try {
        const { slideId } = req.params;
        assertCanAccessSlide(req.user, slideId);

        const { blockIds } = req.body || {};
        if (!Array.isArray(blockIds) || blockIds.length === 0 || blockIds.some((id) => typeof id !== 'string')) {
            throw validationError([
                { path: 'blockIds', rule: 'array', message: 'blockIds must be a non-empty string array' },
            ]);
        }

        const ok = reorderBlocks(slideId, blockIds, new Date().toISOString());
        if (!ok) {
            throw validationError([
                { path: 'blockIds', rule: 'membership', message: 'blockIds must match all blocks in the slide' },
            ]);
        }
        return sendData(req, res, listBlocksBySlide(slideId));
    } catch (error) {
        return next(error);
    }
});

router.get('/blocks/:blockId', (req, res, next) => {
    try {
        const { blockId } = req.params;
        const block = assertCanAccessBlock(req.user, blockId);
        return sendData(req, res, block);
    } catch (error) {
        return next(error);
    }
});

router.patch('/blocks/:blockId', (req, res, next) => {
    try {
        const { blockId } = req.params;
        const current = assertCanAccessBlock(req.user, blockId);

        const { type, layout, config } = req.body || {};
        const details = [];
        if (type !== undefined && !isValidBlockType(type)) {
            details.push({ path: 'type', rule: 'enum', message: 'type must be chart, table, kpi, text, or image' });
        }
        if (layout !== undefined && !isPlainObject(layout) && layout !== null) {
            details.push({ path: 'layout', rule: 'object', message: 'layout must be an object or null' });
        }
        const effectiveType = type || current.type;
        if (config !== undefined) {
            details.push(...validateBlockConfig(effectiveType, config));
        }
        if (details.length) throw validationError(details);

        const sanitizedConfig = config !== undefined ? sanitizeBlockConfig(effectiveType, config) : undefined;
        const updated = updateBlockById(blockId, {
            type,
            layout,
            config: sanitizedConfig,
            updatedAt: new Date().toISOString(),
        });
        return sendData(req, res, updated);
    } catch (error) {
        return next(error);
    }
});

router.delete('/blocks/:blockId', (req, res, next) => {
    try {
        const { blockId } = req.params;
        assertCanAccessBlock(req.user, blockId);
        const ok = deleteBlockById(blockId);
        if (!ok) throw notFound('Block not found');
        return res.status(204).send();
    } catch (error) {
        return next(error);
    }
});

module.exports = { presentationsRouter: router };
