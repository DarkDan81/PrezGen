const { getPresentationById } = require('../repositories/presentation-repository');
const { listSlidesByPresentation } = require('../repositories/slide-repository');
const { listBlocksBySlide } = require('../repositories/block-repository');
const { listDatasetsByPresentation } = require('../repositories/dataset-repository');
const { getLayoutPresetById } = require('../repositories/layout-preset-repository');
const { getThemeById, normalizeThemeId } = require('../services/themes-service');
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
    const base = {
        ...rendered,
        _blockId: block.id,
        _blockType: block.type,
    };
    if (block.layout && typeof block.layout.widthRatio === 'number') {
        return {
            ...base,
            flexWidth: block.layout.widthRatio,
        };
    }
    return base;
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
        if (block.type === 'kpi' && block.config?.mode === 'manual') {
            return withLayout(block, kpiAdapter(block, { rows: [] }));
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
    const selectedTheme = getThemeById(presentation.themeId);
    const baseThemeId = selectedTheme?.baseThemeId || presentation.themeId;
    const resolvedThemeSlug = normalizeThemeId(baseThemeId) || normalizeThemeId(presentation.themeId) || 'universal-warm';

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

        const sourceBlocks = listBlocksBySlide(slide.id);
        const blocks = sourceBlocks.map((block) => renderBlock(block, datasetsById));
        const layoutPreset = slide.layoutPresetId ? getLayoutPresetById(slide.layoutPresetId) : null;
        return {
            type: 'content',
            title: slide.title || '',
            subtitle: slide.subtitle || '',
            layoutPreset: layoutPreset
                ? {
                    id: layoutPreset.id,
                    name: layoutPreset.name,
                    schema: layoutPreset.schema,
                }
                : null,
            slotAssignments: Array.isArray(slide.slotAssignments) ? slide.slotAssignments : [],
            blocks,
        };
    });

    return {
        meta: {
            theme: resolvedThemeSlug,
            themeId: presentation.themeId,
            themeTokens: selectedTheme?.tokens || {},
            characters: {},
        },
        slides: renderSlides,
    };
}

module.exports = {
    buildRenderModelByPresentationId,
};
