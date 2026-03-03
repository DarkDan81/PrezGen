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

function buildThemeBodyClasses(tokens) {
    const chartMode = sanitizeClassToken(tokens?.chart?.mode || 'contrast');
    const tableMode = sanitizeClassToken(tokens?.table?.mode || 'normal');
    const typeProfile = sanitizeClassToken(tokens?.typography?.profile || 'technical');
    const fontPreset = sanitizeClassToken(tokens?.typography?.fontPreset || 'sans');
    const presetPack = sanitizeClassToken(tokens?.decor?.presetPack || 'balanced');
    const shapeStyle = sanitizeClassToken(tokens?.decor?.shapeStyle || 'soft');
    const decor = (tokens && typeof tokens === 'object' && tokens.decor && typeof tokens.decor === 'object') ? tokens.decor : {};
    const toggles = [
        decor.gridEnabled === false ? 'theme-grid-off' : 'theme-grid-on',
        decor.textGlowEnabled === false ? 'theme-fx-text-glow-off' : 'theme-fx-text-glow-on',
        decor.cardShadowEnabled === false ? 'theme-fx-card-shadow-off' : 'theme-fx-card-shadow-on',
        decor.tableShadowEnabled === false ? 'theme-fx-table-shadow-off' : 'theme-fx-table-shadow-on',
        decor.chartShadowEnabled === false ? 'theme-fx-chart-shadow-off' : 'theme-fx-chart-shadow-on',
        decor.imageShadowEnabled === false ? 'theme-fx-image-shadow-off' : 'theme-fx-image-shadow-on',
    ];
    return `theme-chart-${chartMode} theme-table-${tableMode} theme-type-${typeProfile} theme-font-${fontPreset} theme-pack-${presetPack} theme-shape-style-${shapeStyle} ${toggles.join(' ')}`.trim();
}

function resolveAnchorPositions(anchor, defaults) {
    const byAnchor = {
        'top-left': { top: defaults.top, right: 'auto', left: defaults.left, bottom: 'auto' },
        'top-right': { top: defaults.top, right: defaults.right, left: 'auto', bottom: 'auto' },
        'bottom-left': { top: 'auto', right: 'auto', left: defaults.left, bottom: defaults.bottom },
        'bottom-right': { top: 'auto', right: defaults.right, left: 'auto', bottom: defaults.bottom },
    };
    return byAnchor[String(anchor || '')] || byAnchor['top-right'];
}

function renderThemeBadge(tokens, options = {}) {
    const decor = (tokens && typeof tokens === 'object' && tokens.decor && typeof tokens.decor === 'object') ? tokens.decor : {};
    const isTitle = options.isTitle === true;
    const show = decor.logoEnabled !== false
        && ((isTitle && decor.badgeOnTitle !== false) || (!isTitle && decor.badgeOnContent !== false));
    if (!show) return '';

    const main = escapeHtml(decor.logoText || 'DARKDAN');
    const imageUrl = typeof decor.logoImageUrl === 'string' ? decor.logoImageUrl.trim() : '';
    const variant = sanitizeClassToken(decor.badgeVariant || 'outlined');
    const anchor = sanitizeClassToken(decor.logoAnchor || 'top-right');
    const hasImageClass = imageUrl ? 'has-image' : '';
    const badgeInner = imageUrl
        ? `<img src="${escapeAttr(imageUrl)}" class="badge-image" alt="logo">`
        : `<span class="badge-main">${main}</span>`;
    return `
        <div class="theme-badge variant-${variant} anchor-${anchor} ${hasImageClass}">
            ${badgeInner}
        </div>
    `;
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

function isHexColor(value) {
    return typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim());
}

function asFiniteNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function buildThemeVarsCss(tokens) {
    if (!tokens || typeof tokens !== 'object') return '';

    const color = (tokens.color && typeof tokens.color === 'object') ? tokens.color : {};
    const typography = (tokens.typography && typeof tokens.typography === 'object') ? tokens.typography : {};
    const spacing = (tokens.spacing && typeof tokens.spacing === 'object') ? tokens.spacing : {};
    const chart = (tokens.chart && typeof tokens.chart === 'object') ? tokens.chart : {};
    const table = (tokens.table && typeof tokens.table === 'object') ? tokens.table : {};
    const decor = (tokens.decor && typeof tokens.decor === 'object') ? tokens.decor : {};

    const vars = [];
    const push = (name, value) => {
        if (value === undefined || value === null || value === '') return;
        vars.push(`${name}:${value};`);
    };

    if (isHexColor(color.bgCanvas)) push('--pg-bg-canvas', String(color.bgCanvas).trim());
    if (isHexColor(color.textPrimary)) push('--pg-text-primary', String(color.textPrimary).trim());
    if (isHexColor(color.accent)) push('--pg-accent', String(color.accent).trim());
    if (isHexColor(color.accentSecondary)) push('--pg-accent-secondary', String(color.accentSecondary).trim());
    if (isHexColor(color.success)) push('--pg-success', String(color.success).trim());
    if (isHexColor(color.warn)) push('--pg-warn', String(color.warn).trim());
    if (isHexColor(color.info)) push('--pg-info', String(color.info).trim());

    push('--pg-title-size', `${asFiniteNumber(typography.titleSize, 64)}px`);
    push('--pg-subtitle-size', `${asFiniteNumber(typography.subtitleSize, 30)}px`);
    push('--pg-body-size', `${asFiniteNumber(typography.bodySize, 28)}px`);
    push('--pg-line-height', String(asFiniteNumber(typography.lineHeight, 1.38)));
    const fontPreset = String(typography.fontPreset || 'sans');
    if (fontPreset === 'modern') {
        push('--pg-font-family', '"Trebuchet MS", "Segoe UI", Roboto, Helvetica, Arial, sans-serif');
    } else if (fontPreset === 'industrial') {
        push('--pg-font-family', '"Bahnschrift", "Segoe UI", Tahoma, Arial, sans-serif');
    } else {
        push('--pg-font-family', '"Segoe UI", Roboto, Helvetica, Arial, sans-serif');
    }

    push('--pg-radius', `${asFiniteNumber(spacing.radius, 8)}px`);
    push('--pg-border-width', `${asFiniteNumber(spacing.borderWidth, 1)}px`);

    const palette = Array.isArray(chart.palette) ? chart.palette : [];
    palette.slice(0, 4).forEach((entry, index) => {
        if (isHexColor(entry)) push(`--pg-chart-${index + 1}`, String(entry).trim());
    });
    if (isHexColor(palette[0])) push('--pg-accent-alt', String(palette[0]).trim());

    if (isHexColor(table.headerBg)) push('--pg-table-header-bg', String(table.headerBg).trim());
    if (isHexColor(table.headerText)) push('--pg-table-header-text', String(table.headerText).trim());

    const chartMode = String(chart.mode || 'contrast');
    if (chartMode === 'minimal') {
        push('--pg-chart-axis', '#b8c7de');
        push('--pg-chart-label', '#d9e4f4');
    } else if (chartMode === 'dashboard') {
        push('--pg-chart-axis', '#e7eefb');
        push('--pg-chart-label', '#f8fbff');
    } else {
        push('--pg-chart-axis', '#f4f8ff');
        push('--pg-chart-label', '#ffffff');
    }
    push('--pg-chart-axis-size', `${asFiniteNumber(chart.axisLabelSize, 22)}px`);
    push('--pg-chart-datalabel-size', `${asFiniteNumber(chart.dataLabelSize, 20)}px`);
    push('--pg-chart-line-width', String(asFiniteNumber(chart.lineWidth, 8)));
    push('--pg-chart-point-radius', String(asFiniteNumber(chart.pointRadius, 6)));

    push('--pg-decor-intensity', String(asFiniteNumber(decor.intensity, 2)));
    push('--pg-decor-safe-zone-alpha', String(asFiniteNumber(decor.safeZoneAlpha, 0.08)));
    push('--pg-decor-title-mult', String(asFiniteNumber(decor.titleMultiplier, 1.25)));
    push('--pg-decor-content-mult', String(asFiniteNumber(decor.contentMultiplier, 1)));
    push('--pg-grid-enabled', decor.gridEnabled === false ? '0' : '1');
    push('--pg-fx-text-glow-enabled', decor.textGlowEnabled === false ? '0' : '1');
    push('--pg-fx-card-shadow-enabled', decor.cardShadowEnabled === false ? '0' : '1');
    push('--pg-fx-table-shadow-enabled', decor.tableShadowEnabled === false ? '0' : '1');
    push('--pg-fx-chart-shadow-enabled', decor.chartShadowEnabled === false ? '0' : '1');
    push('--pg-fx-image-shadow-enabled', decor.imageShadowEnabled === false ? '0' : '1');
    push('--pg-logo-enabled', decor.logoEnabled === false ? '0' : '1');
    push('--pg-logo-size', `${asFiniteNumber(decor.logoSize, 14)}px`);
    push('--pg-logo-opacity', String(asFiniteNumber(decor.logoOpacity, 0.95)));

    const anchor = String(decor.logoAnchor || 'top-right');
    if (anchor === 'top-left') {
        push('--pg-logo-top', '28px');
        push('--pg-logo-right', 'auto');
        push('--pg-logo-left', '38px');
        push('--pg-logo-bottom', 'auto');
    } else if (anchor === 'bottom-right') {
        push('--pg-logo-top', 'auto');
        push('--pg-logo-right', '38px');
        push('--pg-logo-left', 'auto');
        push('--pg-logo-bottom', '28px');
    } else if (anchor === 'bottom-left') {
        push('--pg-logo-top', 'auto');
        push('--pg-logo-right', 'auto');
        push('--pg-logo-left', '38px');
        push('--pg-logo-bottom', '28px');
    } else {
        push('--pg-logo-top', '28px');
        push('--pg-logo-right', '38px');
        push('--pg-logo-left', 'auto');
        push('--pg-logo-bottom', 'auto');
    }
    push('--pg-badge-on-title', decor.badgeOnTitle === false ? '0' : '1');
    push('--pg-badge-on-content', decor.badgeOnContent === false ? '0' : '1');
    push('--pg-shape-left-line-enabled', decor.shapeLeftLineEnabled === false ? '0' : '1');
    push('--pg-shape-left-line-scale', String(asFiniteNumber(decor.shapeLeftLineSize, 1)));
    push('--pg-shape-left-line-opacity', String(asFiniteNumber(decor.shapeLeftLineOpacity, 1)));
    push('--pg-shape-triangle-enabled', decor.shapeTriangleEnabled === false ? '0' : '1');
    push('--pg-shape-triangle-scale', String(asFiniteNumber(decor.shapeTriangleSize, 1)));
    push('--pg-shape-triangle-opacity', String(asFiniteNumber(decor.shapeTriangleOpacity, 1)));
    push('--pg-shape-blob-enabled', decor.shapeBlobEnabled === false ? '0' : '1');
    push('--pg-shape-blob-scale', String(asFiniteNumber(decor.shapeBlobSize, 1)));
    push('--pg-shape-blob-opacity', String(asFiniteNumber(decor.shapeBlobOpacity, 1)));

    const leftLineAnchor = String(decor.shapeLeftLineAnchor || 'left');
    if (leftLineAnchor === 'right') {
        push('--pg-left-line-left', 'auto');
        push('--pg-left-line-right', '0');
    } else {
        push('--pg-left-line-left', '0');
        push('--pg-left-line-right', 'auto');
    }

    const tri = resolveAnchorPositions(String(decor.shapeTriangleAnchor || 'bottom-right'), {
        top: '0',
        right: '0',
        left: '0',
        bottom: '0',
    });
    push('--pg-triangle-top', tri.top);
    push('--pg-triangle-right', tri.right);
    push('--pg-triangle-left', tri.left);
    push('--pg-triangle-bottom', tri.bottom);
    const triAnchor = String(decor.shapeTriangleAnchor || 'bottom-right');
    let triClip = 'polygon(100% 0, 100% 100%, 0 100%)';
    if (triAnchor === 'top-left') triClip = 'polygon(0 0, 100% 0, 0 100%)';
    if (triAnchor === 'top-right') triClip = 'polygon(100% 0, 100% 100%, 0 0)';
    if (triAnchor === 'bottom-left') triClip = 'polygon(0 0, 100% 100%, 0 100%)';
    push('--pg-triangle-clip', triClip);

    const blob = resolveAnchorPositions(String(decor.shapeBlobAnchor || 'top-right'), {
        top: '-220px',
        right: '-240px',
        left: '-240px',
        bottom: '-220px',
    });
    push('--pg-blob-top', blob.top);
    push('--pg-blob-right', blob.right);
    push('--pg-blob-left', blob.left);
    push('--pg-blob-bottom', blob.bottom);

    return vars.length ? `:root{${vars.join('')}}` : '';
}

function buildSlides(data) {
    const themeName = data.meta.theme;
    const logoPath = data.meta.logoPath || '';
    const charactersMap = data.meta.characters || {};
    const themeCss = loadThemeCss(themeName);
    const structureCss = loadStructureCss();
    const themeVarsCss = buildThemeVarsCss(data.meta.themeTokens);

    const themeTokens = data.meta.themeTokens || {};
    const decorTokens = (themeTokens.decor && typeof themeTokens.decor === 'object') ? themeTokens.decor : {};

    const slidesHtml = data.slides.map((slide, index) => {
        const isTitle = slide.type === 'title';
        const characterHtml = renderCharacter(slide, charactersMap);
        const layoutRender = renderBlocksWithLayout(slide);
        const leftLineAnchorClass = `anchor-${sanitizeClassToken(decorTokens.shapeLeftLineAnchor || 'left')}`;
        const triangleAnchorClass = `anchor-${sanitizeClassToken(decorTokens.shapeTriangleAnchor || 'bottom-right')}`;
        const blobAnchorClass = `anchor-${sanitizeClassToken(decorTokens.shapeBlobAnchor || 'top-right')}`;

        const slideContent = isTitle
            ? `
                <div class="decor-blob ${blobAnchorClass}"></div>
                <div class="decor-line-left ${leftLineAnchorClass}"></div>
                <div class="slide-decor-line ${triangleAnchorClass}"></div>
                ${renderThemeBadge(themeTokens, { isTitle: true })}
                ${logoPath ? `<img src="${logoPath}" class="title-logo" alt="logo">` : ''}
                <div class="title-content">
                    <h1>${escapeHtml(slide.title || '')}</h1>
                    <p>${escapeHtml(slide.subtitle || '')}</p>
                </div>
                ${characterHtml}`
            : `
                ${logoPath ? `<img src="${logoPath}" class="corner-logo" alt="logo">` : ''}
                ${renderThemeBadge(themeTokens, { isTitle: false })}
                <div class="decor-blob ${blobAnchorClass}"></div>
                <div class="decor-line-left ${leftLineAnchorClass}"></div>
                <div class="slide-decor-line ${triangleAnchorClass}"></div>
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

    const bodyThemeClasses = buildThemeBodyClasses(themeTokens);
    return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="/themes/${themeName}/styles.css">
        ${themeCss ? `<style>${themeCss}</style>` : ''}
        ${structureCss ? `<style>${structureCss}</style>` : ''}
        ${themeVarsCss ? `<style>${themeVarsCss}</style>` : ''}
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"></script>
    </head>
    <body class="viewer-mode ${bodyThemeClasses}">
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
                const baseAxisSize = Number.parseFloat(rootStyles.getPropertyValue('--pg-chart-axis-size')) || 22;
                const baseDataLabelSize = Number.parseFloat(rootStyles.getPropertyValue('--pg-chart-datalabel-size')) || 20;
                const axisTickSize = denseLabels ? Math.max(12, baseAxisSize - 3) : baseAxisSize;
                const yTickSize = denseLabels ? Math.max(12, baseAxisSize - 5) : Math.max(12, baseAxisSize - 2);
                const dataLabelSize = denseLabels ? Math.max(12, baseDataLabelSize - 3) : baseDataLabelSize;
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
                                font: { size: axisTickSize, weight: 'bold' },
                                maxRotation: isHorizontal ? 0 : 35,
                                minRotation: isHorizontal ? 0 : 35,
                            },
                        },
                        y: {
                            ticks: {
                                color: axisColor,
                                font: { size: yTickSize, weight: 'bold' },
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
                            font: { size: dataLabelSize, weight: '700' },
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
                const chartLineWidth = Number.parseFloat(rootStyles.getPropertyValue('--pg-chart-line-width')) || 8;
                const chartPointRadius = Number.parseFloat(rootStyles.getPropertyValue('--pg-chart-point-radius')) || 6;
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
                        if (dataset.type === 'line' || config.type === 'line') {
                            dataset.borderWidth = chartLineWidth;
                            dataset.pointRadius = chartPointRadius;
                        }
                    });
                }

                document.querySelectorAll('canvas').forEach((canvas) => {
                    try {
                        const ctx = canvas.getContext('2d');
                        const config = JSON.parse(canvas.dataset.config);
                        config.type = canvas.dataset.type;
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
