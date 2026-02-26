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
    deleteSlideById,
    getSlideById,
    getNextOrderForPresentation,
    listSlidesByPresentation,
    reorderSlides,
    updateSlideById,
} = require('../repositories/slide-repository');
const {
    createDataset,
    getDatasetById,
    listDatasetsByPresentation,
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
const { getThemeById, listThemes } = require('../services/themes-service');
const { buildPreviewHtml } = require('../services/preview-service');
const { createRenderJob, getRenderJobById } = require('../repositories/render-job-repository');
const { queuePdfJob } = require('../services/render-service');
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

function isValidBlockType(type) {
    return new Set(['chart', 'table', 'kpi', 'text', 'image']).has(type);
}

function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
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

router.get('/presentations/:presentationId/slides', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        const presentation = getPresentationById(presentationId);
        if (!presentation) throw notFound('Presentation not found');
        return sendData(req, res, listSlidesByPresentation(presentationId));
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

router.get('/slides/:slideId', (req, res, next) => {
    try {
        const { slideId } = req.params;
        const slide = getSlideById(slideId);
        if (!slide) throw notFound('Slide not found');
        return sendData(req, res, slide);
    } catch (error) {
        return next(error);
    }
});

router.patch('/slides/:slideId', (req, res, next) => {
    try {
        const { slideId } = req.params;
        const current = getSlideById(slideId);
        if (!current) throw notFound('Slide not found');

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

router.delete('/slides/:slideId', (req, res, next) => {
    try {
        const { slideId } = req.params;
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

router.get('/themes', (req, res, next) => {
    try {
        return sendData(req, res, listThemes());
    } catch (error) {
        return next(error);
    }
});

router.get('/themes/:themeId', (req, res, next) => {
    try {
        const { themeId } = req.params;
        const theme = getThemeById(themeId);
        if (!theme) throw notFound('Theme not found');
        return sendData(req, res, theme);
    } catch (error) {
        return next(error);
    }
});

router.post('/presentations/:presentationId/render/preview', (req, res, next) => {
    try {
        const { presentationId } = req.params;
        const presentation = getPresentationById(presentationId);
        if (!presentation) throw notFound('Presentation not found');

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
        const presentation = getPresentationById(presentationId);
        if (!presentation) throw notFound('Presentation not found');

        const now = new Date().toISOString();
        const job = createRenderJob({
            id: randomUUID(),
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

router.get('/render-jobs/:jobId', (req, res, next) => {
    try {
        const { jobId } = req.params;
        const job = getRenderJobById(jobId);
        if (!job) throw notFound('Render job not found');
        return sendData(req, res, job);
    } catch (error) {
        return next(error);
    }
});

router.get('/preview/:presentationId', (req, res, next) => {
    try {
        const { presentationId } = req.params;
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
        const slide = getSlideById(slideId);
        if (!slide) throw notFound('Slide not found');

        const { type, layout, config } = req.body || {};
        const details = [];
        if (!isValidBlockType(type)) {
            details.push({ path: 'type', rule: 'enum', message: 'type must be chart, table, kpi, text, or image' });
        }
        if (layout !== undefined && !isPlainObject(layout)) {
            details.push({ path: 'layout', rule: 'object', message: 'layout must be an object if provided' });
        }
        if (!isPlainObject(config)) {
            details.push({ path: 'config', rule: 'object', message: 'config must be an object' });
        }
        if (details.length) throw validationError(details);

        const now = new Date().toISOString();
        const block = createBlock({
            id: randomUUID(),
            presentationId: slide.presentationId,
            slideId,
            order: getNextOrderForSlide(slideId),
            type,
            layout: layout || null,
            config,
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
        const slide = getSlideById(slideId);
        if (!slide) throw notFound('Slide not found');
        return sendData(req, res, listBlocksBySlide(slideId));
    } catch (error) {
        return next(error);
    }
});

router.post('/slides/:slideId/blocks/reorder', (req, res, next) => {
    try {
        const { slideId } = req.params;
        const slide = getSlideById(slideId);
        if (!slide) throw notFound('Slide not found');

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
        const block = getBlockById(blockId);
        if (!block) throw notFound('Block not found');
        return sendData(req, res, block);
    } catch (error) {
        return next(error);
    }
});

router.patch('/blocks/:blockId', (req, res, next) => {
    try {
        const { blockId } = req.params;
        const current = getBlockById(blockId);
        if (!current) throw notFound('Block not found');

        const { type, layout, config } = req.body || {};
        const details = [];
        if (type !== undefined && !isValidBlockType(type)) {
            details.push({ path: 'type', rule: 'enum', message: 'type must be chart, table, kpi, text, or image' });
        }
        if (layout !== undefined && !isPlainObject(layout) && layout !== null) {
            details.push({ path: 'layout', rule: 'object', message: 'layout must be an object or null' });
        }
        if (config !== undefined && !isPlainObject(config)) {
            details.push({ path: 'config', rule: 'object', message: 'config must be an object' });
        }
        if (details.length) throw validationError(details);

        const updated = updateBlockById(blockId, {
            type,
            layout,
            config,
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
        const ok = deleteBlockById(blockId);
        if (!ok) throw notFound('Block not found');
        return res.status(204).send();
    } catch (error) {
        return next(error);
    }
});

module.exports = { presentationsRouter: router };
