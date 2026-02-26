const express = require('express');
const { randomUUID } = require('crypto');
const {
    createPresentation,
    getPresentationById,
    listPresentations,
    updatePresentationById,
} = require('../repositories/presentation-repository');
const {
    createSlide,
    getNextOrderForPresentation,
    listSlidesByPresentation,
    reorderSlides,
} = require('../repositories/slide-repository');
const {
    createDataset,
    getDatasetById,
    listDatasetsByPresentation,
} = require('../repositories/dataset-repository');
const { validationError, notFound } = require('../utils/errors');
const { SCHEMA_VERSION, sendData } = require('../utils/response');

const router = express.Router();

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
        const data = listPresentations({ status, q });
        return sendData(req, res, data);
    } catch (error) {
        return next(error);
    }
});

router.get('/presentations/:presentationId', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        const data = getPresentationById(presentationId);
        if (!data) throw notFound('Presentation not found');
        return sendData(req, res, data);
    } catch (error) {
        return next(error);
    }
});

router.patch('/presentations/:presentationId', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        const current = getPresentationById(presentationId);
        if (!current) throw notFound('Presentation not found');

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

router.post('/presentations/:presentationId/slides', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        const presentation = getPresentationById(presentationId);
        if (!presentation) throw notFound('Presentation not found');

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

router.post('/presentations/:presentationId/slides/reorder', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        const presentation = getPresentationById(presentationId);
        if (!presentation) throw notFound('Presentation not found');

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

router.post('/presentations/:presentationId/datasets', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        const presentation = getPresentationById(presentationId);
        if (!presentation) throw notFound('Presentation not found');

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

router.get('/presentations/:presentationId/datasets', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        const presentation = getPresentationById(presentationId);
        if (!presentation) throw notFound('Presentation not found');

        return sendData(req, res, listDatasetsByPresentation(presentationId));
    } catch (error) {
        return next(error);
    }
});

router.get('/datasets/:datasetId', (req, res, next) => {
    try {
        const { datasetId } = req.params;
        const dataset = getDatasetById(datasetId);
        if (!dataset) throw notFound('Dataset not found');
        return sendData(req, res, dataset);
    } catch (error) {
        return next(error);
    }
});

module.exports = { presentationsRouter: router };

