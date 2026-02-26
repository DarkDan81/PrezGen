const { buildSlides } = require('../../engine/slide-builder');
const { getPresentationById } = require('../repositories/presentation-repository');
const { listSlidesByPresentation } = require('../repositories/slide-repository');
const { listBlocksBySlide } = require('../repositories/block-repository');
const { listDatasetsByPresentation } = require('../repositories/dataset-repository');
const { normalizeThemeId } = require('./themes-service');

function parseNum(value) {
    const raw = `${value ?? ''}`.trim().replace(/\s/g, '').replace(',', '.');
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
}

function toLineBarShape(dataset, config, kind) {
    const rows = dataset.rows || [];
    const xField = config.xField;
    const valueField = config.valueField;
    const seriesField = config.seriesField;
    const xLabels = Array.from(new Set(rows.map((r) => String(r[xField] ?? '')))).filter(Boolean);
    const categoryKey = seriesField || 'Series';
    const seriesValues = seriesField
        ? Array.from(new Set(rows.map((r) => String(r[seriesField] ?? '')))).filter(Boolean)
        : ['Value'];

    const chartRows = seriesValues.map((seriesName) => {
        const row = { [categoryKey]: seriesName };
        xLabels.forEach((label) => {
            const source = rows.find((r) => {
                const xOk = String(r[xField] ?? '') === label;
                const sOk = seriesField ? String(r[seriesField] ?? '') === seriesName : true;
                return xOk && sOk;
            });
            row[label] = source ? source[valueField] : '';
        });
        return row;
    });

    return {
        chart: {
            kind: kind || 'line',
            show_labels: config.showLabels !== false,
            show_others: config.showOthers !== false,
            shorten: config.shorten === true,
        },
        headers: ['Group', categoryKey, ...xLabels],
        data: chartRows,
    };
}

function toHorizontalShape(dataset, config) {
    const rows = dataset.rows || [];
    const xField = config.xField;
    const valueField = config.valueField;
    const labels = rows.map((r) => String(r[xField] ?? '')).filter(Boolean);
    const row = { 'Показатель': 'Value' };
    labels.forEach((label, i) => {
        row[label] = rows[i] ? rows[i][valueField] : '';
    });
    return {
        chart: {
            kind: 'horizontalBar',
            show_labels: config.showLabels !== false,
            show_others: config.showOthers !== false,
            shorten: config.shorten === true,
            limit: config.limit,
        },
        headers: ['Group', 'Показатель', ...labels],
        data: [row],
    };
}

function toTableShape(dataset, config) {
    const sourceRows = dataset.rows || [];
    const columns = Array.isArray(config.columns) && config.columns.length
        ? config.columns
        : (dataset.columns || []).map((c) => c.key);
    let rows = [...sourceRows];
    if (config.sort && config.sort.by) {
        const direction = config.sort.direction === 'asc' ? 1 : -1;
        rows.sort((a, b) => {
            const av = a[config.sort.by];
            const bv = b[config.sort.by];
            if (av === bv) return 0;
            return av > bv ? direction : -direction;
        });
    }
    if (config.limit) rows = rows.slice(0, config.limit);

    const normalizedRows = rows.map((r) => {
        const out = {};
        columns.forEach((c) => {
            out[c] = r[c];
        });
        return out;
    });
    return {
        table: {
            shorten: config.shorten === true,
            parameter_label: config.parameterLabel,
        },
        headers: columns,
        data: normalizedRows,
    };
}

function toKpiShape(dataset, config) {
    if (config.mode === 'manual') {
        return { kpi_cards: Array.isArray(config.items) ? config.items : [] };
    }
    const rows = dataset.rows || [];
    const limit = config.limit || rows.length;
    const cards = rows.slice(0, limit).map((r) => ({
        label: r[config.labelField],
        value: r[config.valueField],
        unit: config.unitField ? r[config.unitField] : '',
        growth: config.growthField ? r[config.growthField] : '',
    }));
    return { kpi_cards: cards };
}

function buildBlockView(block, datasetsById) {
    const base = {};
    if (block.layout && typeof block.layout.widthRatio === 'number') {
        base.flexWidth = block.layout.widthRatio;
    }

    if (block.type === 'text') {
        return { ...base, text: block.config.html || '' };
    }
    if (block.type === 'image') {
        return { ...base, image: block.config.url || block.config.src || '' };
    }

    const datasetId = block.config.datasetId;
    const dataset = datasetId ? datasetsById.get(datasetId) : null;
    if (!dataset) {
        return { ...base, text: `<p>Dataset not found: ${datasetId || 'n/a'}</p>` };
    }

    if (block.type === 'table') {
        return { ...base, ...toTableShape(dataset, block.config) };
    }
    if (block.type === 'kpi') {
        return { ...base, ...toKpiShape(dataset, block.config) };
    }
    if (block.type === 'chart') {
        if (block.config.kind === 'horizontalBar') {
            return { ...base, ...toHorizontalShape(dataset, block.config) };
        }
        return { ...base, ...toLineBarShape(dataset, block.config, block.config.kind) };
    }

    return { ...base, text: `<p>Unsupported block type: ${block.type}</p>` };
}

function buildPresentationData(presentationId) {
    const presentation = getPresentationById(presentationId);
    if (!presentation) return null;

    const slides = listSlidesByPresentation(presentationId);
    const datasets = listDatasetsByPresentation(presentationId);
    const datasetsById = new Map(datasets.map((d) => [d.id, d]));

    const viewSlides = slides.map((slide) => {
        const isTitle = slide.type === 'title';
        if (isTitle) {
            return {
                type: 'title',
                title: slide.title || '',
                subtitle: slide.subtitle || '',
            };
        }
        const blocks = listBlocksBySlide(slide.id).map((block) => buildBlockView(block, datasetsById));
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
        slides: viewSlides,
    };
}

function buildPreviewHtml(presentationId) {
    const data = buildPresentationData(presentationId);
    if (!data) return null;
    return buildSlides(data);
}

module.exports = {
    buildPreviewHtml,
    buildPresentationData,
};

