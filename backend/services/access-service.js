const { getPresentationById } = require('../repositories/presentation-repository');
const { getThemeByIdFromDb } = require('../repositories/theme-repository');
const { getRenderJobById } = require('../repositories/render-job-repository');
const { getSlideById } = require('../repositories/slide-repository');
const { getBlockById } = require('../repositories/block-repository');
const { getDatasetById } = require('../repositories/dataset-repository');
const { forbidden, notFound } = require('../utils/errors');

function assertCanAccessPresentation(user, presentationId) {
    const presentation = getPresentationById(presentationId);
    if (!presentation) throw notFound('Presentation not found');
    if (user.role !== 'admin' && presentation.ownerUserId !== user.id) {
        throw notFound('Presentation not found');
    }
    return presentation;
}

function assertCanAccessSlide(user, slideId) {
    const slide = getSlideById(slideId);
    if (!slide) throw notFound('Slide not found');
    assertCanAccessPresentation(user, slide.presentationId);
    return slide;
}

function assertCanAccessBlock(user, blockId) {
    const block = getBlockById(blockId);
    if (!block) throw notFound('Block not found');
    assertCanAccessPresentation(user, block.presentationId);
    return block;
}

function assertCanAccessDataset(user, datasetId) {
    const dataset = getDatasetById(datasetId);
    if (!dataset) throw notFound('Dataset not found');
    assertCanAccessPresentation(user, dataset.presentationId);
    return dataset;
}

function assertCanAccessTheme(user, themeId) {
    const theme = getThemeByIdFromDb(themeId);
    if (!theme) throw notFound('Theme not found');
    if (!theme.isSystem && user.role !== 'admin' && theme.ownerUserId !== user.id) {
        throw notFound('Theme not found');
    }
    return theme;
}

function assertCanAccessRenderJob(user, jobId) {
    const job = getRenderJobById(jobId);
    if (!job) throw notFound('Render job not found');
    if (user.role !== 'admin' && job.ownerUserId !== user.id) {
        throw notFound('Render job not found');
    }
    return job;
}

function assertAdminOrSelf(user, targetUserId) {
    if (user.role === 'admin' || user.id === targetUserId) return;
    throw forbidden('Access denied');
}

module.exports = {
    assertAdminOrSelf,
    assertCanAccessBlock,
    assertCanAccessDataset,
    assertCanAccessPresentation,
    assertCanAccessRenderJob,
    assertCanAccessSlide,
    assertCanAccessTheme,
};
