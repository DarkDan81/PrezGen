const { getPresentationById } = require('../repositories/presentation-repository');
const { listSlidesByPresentation } = require('../repositories/slide-repository');
const { listBlocksBySlide } = require('../repositories/block-repository');
const { listDatasetsByPresentation } = require('../repositories/dataset-repository');
const { normalizeThemeId } = require('../services/themes-service');
const { chartAdapter } = require('./adapters/chart-adapter');
const { tableAdapter } = require('./adapters/table-adapter');
const { kpiAdapter } = require('./adapters/kpi-adapter');
const { textAdapter } = require('./adapters/text-adapter');
const { imageAdapter } = require('./adapters/image-adapter');

function buildErrorText(message, base = {}) {
    return {
        ...base,
        text: `<p>${message}</p>`,
    };
}

function withLayout(block, rendered) {
    if (block.layout && typeof block.layout.widthRatio === 'number') {
        return {
            ...rendered,
            flexWidth: block.layout.widthRatio,
        };
    }
    return rendered;
}

function renderBlock(block, datasetsById) {
    const datasetId = block.config?.datasetId;
    const base = {};

    try {
        if (block.type === 'text') {
            return withLayout(block, textAdapter(block));
        }
        if (block.type === 'image') {
            return withLayout(block, imageAdapter(block));
        }

        const dataset = datasetId ? datasetsById.get(datasetId) : null;
        if (!dataset) {
            return buildErrorText(`Dataset not found: ${datasetId || 'n/a'}`, base);
        }

        if (block.type === 'chart') {
            return withLayout(block, chartAdapter(block, dataset));
        }
        if (block.type === 'table') {
            return withLayout(block, tableAdapter(block, dataset));
        }
        if (block.type === 'kpi') {
            return withLayout(block, kpiAdapter(block, dataset));
        }
        return buildErrorText(`Unsupported block type: ${block.type}`, base);
    } catch (error) {
        return buildErrorText(`Block render error: ${error.message}`, base);
    }
}

function buildRenderModelByPresentationId(presentationId) {
    const presentation = getPresentationById(presentationId);
    if (!presentation) return null;

    const slides = listSlidesByPresentation(presentationId);
    const datasets = listDatasetsByPresentation(presentationId);
    const datasetsById = new Map(datasets.map((dataset) => [dataset.id, dataset]));

    const renderSlides = slides.map((slide) => {
        if (slide.type === 'title') {
            return {
                type: 'title',
                title: slide.title || '',
                subtitle: slide.subtitle || '',
            };
        }

        const blocks = listBlocksBySlide(slide.id).map((block) => renderBlock(block, datasetsById));
        return {
            type: 'content',
            title: slide.title || '',
            subtitle: slide.subtitle || '',
            blocks,
        };
    });

    return {
        meta: {
            theme: normalizeThemeId(presentation.themeId) || 'eurofoods',
            characters: {},
        },
        slides: renderSlides,
    };
}

module.exports = {
    buildRenderModelByPresentationId,
};

