const fs = require('fs');
const path = require('path');
const chartRenderer = require('./blocks/chart');
const tableRenderer = require('./blocks/table');
const kpiRenderer = require('./blocks/kpi');
const textImageRenderer = require('./blocks/text-image');

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function renderCharacter(slide, charactersMap) {
    const charKey = slide.character_img || slide.character;
    if (!charKey || !charactersMap[charKey]) return '';

    const fileName = charactersMap[charKey];
    const charPath = `/content/assets/${fileName}`;
    const pos = slide.character_pos || slide.pos;
    const posClass = pos ? `char-${pos}` : '';

    return `<img src="${charPath}" class="slide-character ${posClass}" alt="">`;
}

function renderBlocks(slide) {
    return (slide.blocks || []).map((block) => {
        if (!block || typeof block !== 'object') return '';
        if (block.chart) return chartRenderer(block);
        if (block.table) return tableRenderer(block);
        if (block.kpi_cards) return kpiRenderer(block);
        if (block.text || block.image) return textImageRenderer(block);
        return '';
    }).join('');
}

function renderBlockHtml(block) {
    if (!block || typeof block !== 'object') return '';
    if (block.chart) return chartRenderer(block);
    if (block.table) return tableRenderer(block);
    if (block.kpi_cards) return kpiRenderer(block);
    if (block.text || block.image) return textImageRenderer(block);
    return '';
}

function resolveLayoutPreset(slide) {
    const schema = slide.layoutPreset?.schema;
    if (!schema || typeof schema !== 'object') return null;
    const grid = schema.grid;
    const slots = Array.isArray(schema.slots) ? schema.slots : [];
    if (!grid || !Array.isArray(slots) || slots.length === 0) return null;
    return { grid, slots };
}

function normalizeSlotAssignments(assignments) {
    if (!Array.isArray(assignments)) return [];
    return assignments
        .filter((item) => item && typeof item.slotId === 'string' && typeof item.blockId === 'string')
        .map((item) => ({ slotId: item.slotId, blockId: item.blockId }));
}

function sanitizeClassToken(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function renderBlocksWithLayout(slide) {
    const preset = resolveLayoutPreset(slide);
    if (!preset) {
        return {
            bodyClass: 'slide-body',
            bodyStyle: '',
            html: renderBlocks(slide),
        };
    }

    const blocks = Array.isArray(slide.blocks) ? slide.blocks : [];
    const blocksById = new Map(blocks.map((block) => [String(block._blockId || ''), block]));
    const explicitAssignments = normalizeSlotAssignments(slide.slotAssignments);

    const takenBlocks = new Set(explicitAssignments.map((item) => item.blockId));
    const unassignedBlocks = blocks.filter((block) => !takenBlocks.has(String(block._blockId || '')));

    const slotToBlock = new Map();
    explicitAssignments.forEach((assignment) => {
        if (slotToBlock.has(assignment.slotId)) return;
        const found = blocksById.get(assignment.blockId);
        if (found) slotToBlock.set(assignment.slotId, found);
    });

    preset.slots.forEach((slot) => {
        if (slotToBlock.has(slot.id)) return;
        const next = unassignedBlocks.shift();
        if (next) slotToBlock.set(slot.id, next);
    });

    const columns = typeof preset.grid.columns === 'string' ? preset.grid.columns : '1fr';
    const rows = typeof preset.grid.rows === 'string' ? preset.grid.rows : 'auto';
    const areas = Array.isArray(preset.grid.areas) ? preset.grid.areas : [];
    const gap = Number.isFinite(preset.grid.gap) ? Number(preset.grid.gap) : 20;
    const areasCss = areas.length
        ? `grid-template-areas:${areas.map((row) => `'${String(row).replace(/'/g, "\\'")}'`).join(' ')};`
        : '';
    const bodyStyle = `display:grid;grid-template-columns:${escapeAttr(columns)};grid-template-rows:${escapeAttr(rows)};${areasCss}gap:${gap}px;`;

    const layoutClassToken = sanitizeClassToken(slide.layoutPreset?.id || '');
    const slotsHtml = preset.slots.map((slot) => {
        const block = slotToBlock.get(slot.id);
        const blockHtml = block ? renderBlockHtml(block) : '<div class="block-wrapper slot-empty"></div>';
        const areaStyle = slot.area ? `style="grid-area:${escapeAttr(slot.area)};"` : '';
        const slotClassToken = sanitizeClassToken(slot.id);
        const slotClass = slotClassToken ? `layout-slot slot-${slotClassToken}` : 'layout-slot';
        return `<div class="${slotClass}" ${areaStyle}>${blockHtml}</div>`;
    }).join('');
    const layoutClass = layoutClassToken ? `layout-preset-${layoutClassToken}` : '';

    return {
        bodyClass: `slide-body layout-grid ${layoutClass}`.trim(),
        bodyStyle: `style="${bodyStyle}"`,
        html: slotsHtml,
    };
}

function loadThemeCss(themeName) {
    try {
        const themePath = path.join(__dirname, '..', 'themes', themeName, 'styles.css');
        return fs.readFileSync(themePath, 'utf8');
    } catch (_e) {
        return '';
    }
}

function loadStructureCss() {
    try {
        const structurePath = path.join(__dirname, 'structure.css');
        return fs.readFileSync(structurePath, 'utf8');
    } catch (_e) {
        return '';
    }
}

function buildSlides(data) {
    const themeName = data.meta.theme;
    const logoPath = data.meta.logoPath || '';
    const charactersMap = data.meta.characters || {};
    const themeCss = loadThemeCss(themeName);
    const structureCss = loadStructureCss();

    const slidesHtml = data.slides.map((slide, index) => {
        const isTitle = slide.type === 'title';
        const characterHtml = renderCharacter(slide, charactersMap);
        const layoutRender = renderBlocksWithLayout(slide);

        const slideContent = isTitle
            ? `
                <div class="decor-blob"></div>
                <div class="decor-line-left"></div>
                ${logoPath ? `<img src="${logoPath}" class="title-logo" alt="logo">` : ''}
                <div class="title-content">
                    <h1>${escapeHtml(slide.title || '')}</h1>
                    <p>${escapeHtml(slide.subtitle || '')}</p>
                </div>
                ${characterHtml}`
            : `
                ${logoPath ? `<img src="${logoPath}" class="corner-logo" alt="logo">` : ''}
                <div class="decor-blob"></div>
                <div class="decor-line-left"></div>
                <div class="slide-decor-line"></div>
                <div class="slide-header">
                    <h2>${escapeHtml(slide.title || '')}</h2>
                    ${slide.subtitle ? `<div class="slide-subtitle">${escapeHtml(slide.subtitle)}</div>` : ''}
                </div>
                <div class="${layoutRender.bodyClass}" ${layoutRender.bodyStyle}>${layoutRender.html}</div>
                ${characterHtml}`;

        return `<div class="slide-frame">
            <section class="slide ${isTitle ? 'title-slide' : ''}" id="slide-${index}">
                ${slideContent}
            </section>
        </div>`;
    }).join('');

    return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="/themes/${themeName}/styles.css">
        ${themeCss ? `<style>${themeCss}</style>` : ''}
        ${structureCss ? `<style>${structureCss}</style>` : ''}
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"></script>
    </head>
    <body class="viewer-mode">
        <div id="presentation-viewport">${slidesHtml}</div>

        <script>
            Chart.register(ChartDataLabels);

            function rescale() {
                const scale = window.innerWidth / 1920;
                document.querySelectorAll('.slide').forEach((slide) => {
                    slide.style.transformOrigin = 'top left';
                    slide.style.transform = 'scale(' + scale + ')';
                    const frame = slide.parentElement;
                    frame.style.height = (1080 * scale) + 'px';
                    frame.style.width = (1920 * scale) + 'px';
                    frame.style.overflow = 'hidden';
                });
            }

            function buildChartOptions(config) {
                const isHorizontal = config.horizontal === true;
                const labelsCount = config.data?.labels?.length || 0;
                const denseLabels = labelsCount > 8;
                const rootStyles = getComputedStyle(document.documentElement);
                const axisColor = rootStyles.getPropertyValue('--pg-chart-axis').trim() || '#f4f8ff';
                const labelColor = rootStyles.getPropertyValue('--pg-chart-label').trim() || '#ffffff';
                return {
                    indexAxis: isHorizontal ? 'y' : 'x',
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    layout: { padding: { top: 28, bottom: 28, left: 16, right: 24 } },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: {
                                color: axisColor,
                                font: { size: denseLabels ? 18 : 22, weight: 'bold' },
                                maxRotation: isHorizontal ? 0 : 35,
                                minRotation: isHorizontal ? 0 : 35,
                            },
                        },
                        y: {
                            ticks: {
                                color: axisColor,
                                font: { size: denseLabels ? 16 : 20, weight: 'bold' },
                            },
                        },
                    },
                    plugins: {
                        legend: {
                            display: (config.data?.datasets || []).length > 1,
                            position: 'bottom',
                            labels: { color: axisColor, font: { size: 18, weight: 'bold' } },
                        },
                        datalabels: {
                            display: config.showLabels !== false,
                            anchor: (ctx) => (ctx.dataset.data[ctx.dataIndex] >= 0 ? 'end' : 'start'),
                            align: (ctx) => {
                                if (isHorizontal) return 'right';
                                return ctx.dataset.data[ctx.dataIndex] >= 0 ? 'top' : 'bottom';
                            },
                            offset: 8,
                            color: labelColor,
                            font: { size: denseLabels ? 16 : 20, weight: '700' },
                            formatter: (v) => {
                                if (v === null || v === undefined) return '';
                                if (config.shorten && Math.abs(v) >= 1000000) {
                                    return (v / 1000000).toFixed(1) + 'M';
                                }
                                return Math.round(v).toLocaleString('en-US');
                            },
                        },
                    },
                };
            }

            function initCharts() {
                const rootStyles = getComputedStyle(document.documentElement);
                const palette = [
                    rootStyles.getPropertyValue('--pg-chart-1').trim(),
                    rootStyles.getPropertyValue('--pg-chart-2').trim(),
                    rootStyles.getPropertyValue('--pg-chart-3').trim(),
                    rootStyles.getPropertyValue('--pg-chart-4').trim(),
                ].filter(Boolean);
                function applyThemePalette(config) {
                    if (!palette.length) return;
                    const datasets = Array.isArray(config?.data?.datasets) ? config.data.datasets : [];
                    datasets.forEach((dataset, datasetIndex) => {
                        const baseColor = palette[datasetIndex % palette.length];
                        const altColor = palette[(datasetIndex + 1) % palette.length];

                        if (Array.isArray(dataset.backgroundColor)) {
                            dataset.backgroundColor = dataset.backgroundColor.map((_value, pointIndex) =>
                                palette[(datasetIndex + pointIndex) % palette.length]
                            );
                        } else {
                            dataset.backgroundColor = baseColor;
                        }

                        if (Array.isArray(dataset.borderColor)) {
                            dataset.borderColor = dataset.borderColor.map((_value, pointIndex) =>
                                palette[(datasetIndex + pointIndex) % palette.length]
                            );
                        } else {
                            dataset.borderColor = dataset.borderColor ? baseColor : (dataset.backgroundColor || altColor);
                        }
                    });
                }

                document.querySelectorAll('canvas').forEach((canvas) => {
                    try {
                        const ctx = canvas.getContext('2d');
                        const config = JSON.parse(canvas.dataset.config);
                        applyThemePalette(config);
                        new Chart(ctx, {
                            type: canvas.dataset.type,
                            data: config.data,
                            options: buildChartOptions(config),
                        });
                    } catch (error) {
                        console.error('Chart init error', error);
                    }
                });
            }

            window.addEventListener('load', () => {
                rescale();
                initCharts();
            });
            window.addEventListener('resize', rescale);
        </script>
    </body>
    </html>`;
}

module.exports = { buildSlides };
