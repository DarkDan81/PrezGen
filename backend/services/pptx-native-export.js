const fs = require('fs');
const path = require('path');
const { buildRenderModelByPresentationId } = require('../render/model-builder');
const { normalizeThemeTokens, THEME_TOKEN_DEFAULTS } = require('../validation/theme-layout');

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const PPTX_WIDTH = 13.333;
const PPTX_HEIGHT = 7.5;
const PX_TO_IN_X = PPTX_WIDTH / CANVAS_WIDTH;
const PX_TO_IN_Y = PPTX_HEIGHT / CANVAS_HEIGHT;
const PX_TO_PT = 72 / 96;

function pxToInX(px) {
    return px * PX_TO_IN_X;
}

function pxToInY(px) {
    return px * PX_TO_IN_Y;
}

function pxToPt(px, fallback) {
    const n = Number(px);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(1, n * PX_TO_PT);
}

function pxToReadablePt(px, fallback, scale = 1) {
    const base = pxToPt(px, fallback);
    return Math.max(1, base * scale);
}

function toHexColor(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const v = value.trim();
    if (!/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return fallback;
    return v.slice(1, 7).toUpperCase();
}

function clamp(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

function safeNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function parseTrackToken(token) {
    const raw = String(token || '').trim();
    if (!raw) return { kind: 'fr', value: 1 };
    if (raw.endsWith('fr')) return { kind: 'fr', value: Math.max(0.0001, safeNumber(raw.slice(0, -2), 1)) };
    if (raw.endsWith('%')) return { kind: 'percent', value: clamp(raw.slice(0, -1), 0, 100, 0) / 100 };
    if (raw.endsWith('px')) return { kind: 'px', value: Math.max(0, safeNumber(raw.slice(0, -2), 0)) };
    const n = safeNumber(raw, NaN);
    if (Number.isFinite(n)) return { kind: 'px', value: Math.max(0, n) };
    return { kind: 'fr', value: 1 };
}

function resolveTracks(trackString, totalSize, gap, expectedCount) {
    const tokens = String(trackString || '')
        .split(/\s+/)
        .filter(Boolean)
        .map(parseTrackToken);
    const items = tokens.length ? tokens : new Array(expectedCount || 1).fill(0).map(() => ({ kind: 'fr', value: 1 }));
    const count = items.length;
    const totalGap = Math.max(0, count - 1) * gap;
    const target = Math.max(0, totalSize - totalGap);

    let fixed = 0;
    let frSum = 0;
    const out = new Array(count).fill(0);
    for (let i = 0; i < count; i += 1) {
        const item = items[i];
        if (item.kind === 'px') {
            out[i] = item.value;
            fixed += item.value;
        } else if (item.kind === 'percent') {
            out[i] = item.value * target;
            fixed += out[i];
        } else {
            frSum += item.value;
        }
    }

    const remain = Math.max(0, target - fixed);
    for (let i = 0; i < count; i += 1) {
        const item = items[i];
        if (item.kind === 'fr') {
            out[i] = frSum > 0 ? (remain * item.value) / frSum : 0;
        }
    }

    return out;
}

function parseAreas(areaRows) {
    const rows = (Array.isArray(areaRows) ? areaRows : [])
        .map((row) => String(row || '').trim().split(/\s+/).filter(Boolean))
        .filter((row) => row.length > 0);
    const cols = rows.reduce((max, row) => Math.max(max, row.length), 0);
    return { rows, cols };
}

function computeAreaRects(grid, bodyRect) {
    const gap = Math.max(0, safeNumber(grid?.gap, 20));
    const { rows: areaRows, cols } = parseAreas(grid?.areas);
    if (!areaRows.length || !cols) return new Map();

    const colWidths = resolveTracks(grid?.columns, bodyRect.w, gap, cols);
    const rowHeights = resolveTracks(grid?.rows, bodyRect.h, gap, areaRows.length);

    const colStarts = [];
    const rowStarts = [];
    let x = bodyRect.x;
    let y = bodyRect.y;
    for (let i = 0; i < colWidths.length; i += 1) {
        colStarts.push(x);
        x += colWidths[i] + (i < colWidths.length - 1 ? gap : 0);
    }
    for (let i = 0; i < rowHeights.length; i += 1) {
        rowStarts.push(y);
        y += rowHeights[i] + (i < rowHeights.length - 1 ? gap : 0);
    }

    const areas = new Map();
    for (let r = 0; r < areaRows.length; r += 1) {
        for (let c = 0; c < areaRows[r].length; c += 1) {
            const name = areaRows[r][c];
            if (!name || name === '.') continue;
            const rect = areas.get(name) || { minR: r, maxR: r, minC: c, maxC: c };
            rect.minR = Math.min(rect.minR, r);
            rect.maxR = Math.max(rect.maxR, r);
            rect.minC = Math.min(rect.minC, c);
            rect.maxC = Math.max(rect.maxC, c);
            areas.set(name, rect);
        }
    }

    const out = new Map();
    areas.forEach((r, name) => {
        const x1 = colStarts[r.minC];
        const y1 = rowStarts[r.minR];
        const x2 = colStarts[r.maxC] + colWidths[r.maxC];
        const y2 = rowStarts[r.maxR] + rowHeights[r.maxR];
        out.set(name, { x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
    });
    return out;
}

function normalizeSlotAssignments(assignments) {
    if (!Array.isArray(assignments)) return [];
    return assignments
        .filter((item) => item && typeof item.slotId === 'string' && typeof item.blockId === 'string')
        .map((item) => ({ slotId: item.slotId, blockId: item.blockId }));
}

function resolveSlots(slide) {
    const schema = slide.layoutPreset?.schema;
    if (!schema || !schema.grid || !Array.isArray(schema.slots) || !schema.slots.length) {
        const blocks = Array.isArray(slide.blocks) ? slide.blocks : [];
        return blocks.map((block, index) => ({
            slotId: `auto_${index + 1}`,
            area: null,
            block,
        }));
    }

    const blocks = Array.isArray(slide.blocks) ? slide.blocks : [];
    const byId = new Map(blocks.map((b) => [String(b._blockId || ''), b]));
    const explicit = normalizeSlotAssignments(slide.slotAssignments);
    const taken = new Set(explicit.map((a) => a.blockId));
    const rest = blocks.filter((b) => !taken.has(String(b._blockId || '')));
    const slotMap = new Map();

    explicit.forEach((a) => {
        if (slotMap.has(a.slotId)) return;
        const block = byId.get(a.blockId);
        if (block) slotMap.set(a.slotId, block);
    });
    schema.slots.forEach((slot) => {
        if (slotMap.has(slot.id)) return;
        const next = rest.shift();
        if (next) slotMap.set(slot.id, next);
    });

    return schema.slots.map((slot) => ({
        slotId: slot.id,
        area: slot.area || null,
        block: slotMap.get(slot.id) || null,
    }));
}

function toLocalImageSource(src) {
    if (typeof src !== 'string' || !src.trim()) return null;
    const value = src.trim();
    if (value.startsWith('data:image/')) return { data: value };
    if (/^https?:\/\//i.test(value)) return { path: value };
    if (value.startsWith('/')) {
        const clean = decodeURIComponent(value.split('?')[0]);
        const local = path.join(__dirname, '..', '..', clean.replace(/^\//, ''));
        if (fs.existsSync(local)) return { path: local };
        return null;
    }
    if (fs.existsSync(value)) return { path: value };
    return null;
}

function htmlToPlainText(html) {
    const source = String(html || '');
    const withBullets = source
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\s*\/\s*(p|div|h[1-6])\s*>/gi, '\n\n')
        .replace(/<\s*li[^>]*>/gi, '\n• ')
        .replace(/<\s*\/\s*li\s*>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&#39;/gi, "'")
        .replace(/&quot;/gi, '"');
    return withBullets
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n');
}

function pickFontFace(tokens) {
    const preset = String(tokens.typography.fontPreset || 'sans');
    if (preset === 'modern') return 'Trebuchet MS';
    if (preset === 'industrial') return 'Bahnschrift';
    return 'Segoe UI';
}

function addDeckDecor(slide, tokens, isTitle) {
    const accent = toHexColor(tokens.color.accent, 'FF7B1F');
    const accent2 = toHexColor(tokens.color.accentSecondary, '39A8FF');
    const decor = tokens.decor || {};

    if (decor.gridEnabled !== false) {
        for (let x = 0; x <= CANVAS_WIDTH; x += 80) {
            slide.addShape('line', {
                x: pxToInX(x),
                y: 0,
                w: 0,
                h: PPTX_HEIGHT,
                line: { color: accent2, pt: 0.2, transparency: 85 },
            });
        }
        for (let y = 0; y <= CANVAS_HEIGHT; y += 80) {
            slide.addShape('line', {
                x: 0,
                y: pxToInY(y),
                w: PPTX_WIDTH,
                h: 0,
                line: { color: accent2, pt: 0.2, transparency: 85 },
            });
        }
    }

    if (decor.shapeBlobEnabled !== false) {
        const blobSize = clamp(decor.shapeBlobSize, 0.4, 1.8, 1);
        const w = 480 * blobSize;
        const h = 360 * blobSize;
        const anchor = String(decor.shapeBlobAnchor || 'top-right');
        const left = anchor.includes('left') ? -120 : CANVAS_WIDTH - w + 120;
        const top = anchor.includes('bottom') ? CANVAS_HEIGHT - h + 80 : -80;
        slide.addShape('ellipse', {
            x: pxToInX(left),
            y: pxToInY(top),
            w: pxToInX(w),
            h: pxToInY(h),
            fill: { color: accent2, transparency: clamp((1 - clamp(decor.shapeBlobOpacity, 0, 1, 1)) * 100, 0, 100, 60) },
            line: { color: accent2, transparency: 100, pt: 0 },
        });
    }

    if (decor.shapeTriangleEnabled !== false) {
        const tSize = clamp(decor.shapeTriangleSize, 0.4, 1.8, 1);
        const w = 420 * tSize;
        const h = 220 * tSize;
        const anchor = String(decor.shapeTriangleAnchor || 'bottom-right');
        const right = anchor.includes('right');
        const bottom = anchor.includes('bottom');
        slide.addShape('rtTriangle', {
            x: pxToInX(right ? CANVAS_WIDTH - w : 0),
            y: pxToInY(bottom ? CANVAS_HEIGHT - h : 0),
            w: pxToInX(w),
            h: pxToInY(h),
            rotate: right && bottom ? 0 : right ? 270 : bottom ? 90 : 180,
            fill: { color: accent, transparency: clamp((1 - clamp(decor.shapeTriangleOpacity, 0, 1, 1)) * 100, 0, 100, 60) },
            line: { color: accent, transparency: 100, pt: 0 },
        });
    }

    if (decor.shapeLeftLineEnabled !== false && !isTitle) {
        const size = clamp(decor.shapeLeftLineSize, 0.4, 1.8, 1);
        const width = Math.max(2, 6 * size);
        const x = String(decor.shapeLeftLineAnchor || 'left') === 'right' ? CANVAS_WIDTH - width : 0;
        slide.addShape('rect', {
            x: pxToInX(x),
            y: pxToInY(160),
            w: pxToInX(width),
            h: pxToInY(640),
            line: { color: accent, pt: 0, transparency: 100 },
            fill: { color: accent, transparency: clamp((1 - clamp(decor.shapeLeftLineOpacity, 0, 1, 1)) * 100, 0, 100, 35) },
        });
    }
}

function addBadge(slide, tokens, isTitle, warnings, slideIndex) {
    const decor = tokens.decor || {};
    if (decor.logoEnabled === false) return;
    if (isTitle && decor.badgeOnTitle === false) return;
    if (!isTitle && decor.badgeOnContent === false) return;

    const anchor = String(decor.logoAnchor || 'top-right');
    const badgeW = 180;
    const badgeH = 40;
    const left = anchor.includes('left') ? 44 : CANVAS_WIDTH - badgeW - 44;
    const top = anchor.includes('bottom') ? CANVAS_HEIGHT - badgeH - 30 : 30;
    const opacity = clamp(decor.logoOpacity, 0.2, 1, 0.95);
    const border = toHexColor(tokens.color.accent, 'FF7B1F');

    const logo = toLocalImageSource(decor.logoImageUrl || '');
    if (logo) {
        slide.addImage({
            ...logo,
            x: pxToInX(left),
            y: pxToInY(top),
            w: pxToInX(badgeW),
            h: pxToInY(badgeH),
            transparency: Math.round((1 - opacity) * 100),
            altText: 'Theme logo',
        });
        return;
    }

    if (decor.logoImageUrl) {
        warnings.push({
            slideIndex,
            blockId: null,
            code: 'LOGO_IMAGE_FALLBACK',
            message: 'Logo image is not available from exporter context, text badge used instead',
        });
    }

    slide.addShape('roundRect', {
        x: pxToInX(left),
        y: pxToInY(top),
        w: pxToInX(badgeW),
        h: pxToInY(badgeH),
        rectRadius: 0.04,
        line: { color: border, pt: 1, transparency: 20 },
        fill: { color: '0A1220', transparency: 5 },
    });
    slide.addText(String(decor.logoText || 'DARKDAN'), {
        x: pxToInX(left + 10),
        y: pxToInY(top + 8),
        w: pxToInX(badgeW - 20),
        h: pxToInY(20),
        align: 'center',
        bold: true,
        color: toHexColor(tokens.color.textPrimary, 'E7EDF6'),
        fontFace: pickFontFace(tokens),
        fontSize: clamp(decor.logoSize, 10, 36, 14) - 1,
    });
}

function splitBodyRect(slide, tokens) {
    const hasSubtitle = Boolean(slide.subtitle);
    const titleSize = clamp(tokens.typography.titleSize, 18, 96, 64);
    const subSize = clamp(tokens.typography.subtitleSize, 12, 72, 30);

    const x = 80;
    const y = 60;
    const w = CANVAS_WIDTH - x * 2;
    let headerH = Math.max(80, titleSize * 0.95);
    if (hasSubtitle) headerH += Math.max(24, subSize * 1.1);
    const bodyY = y + headerH + 24;
    const bodyH = CANVAS_HEIGHT - bodyY - 56;

    return {
        header: { x, y, w, h: headerH },
        body: { x, y: bodyY, w, h: Math.max(120, bodyH) },
    };
}

function getContentHeaderTextLayout(tokens, headerRect, hasSubtitle) {
    const titleSize = clamp(tokens.typography.titleSize, 18, 96, 64);
    const subtitleSize = clamp(tokens.typography.subtitleSize, 12, 72, 30);
    const titleBoxHeight = Math.max(76, titleSize * 1.18);
    const subtitleGap = 10;
    const subtitleBoxHeight = hasSubtitle ? Math.max(32, subtitleSize * 1.2) : 0;
    const titleY = headerRect.y;
    const subtitleY = titleY + titleBoxHeight + subtitleGap;
    return {
        titleY,
        titleBoxHeight,
        subtitleY,
        subtitleBoxHeight,
    };
}

function addTitleSlide(slideOut, slideData, tokens, warnings, slideIndex) {
    const textColor = toHexColor(tokens.color.textPrimary, 'E7EDF6');
    const accent = toHexColor(tokens.color.accentSecondary, '39A8FF');
    const fontFace = pickFontFace(tokens);
    addDeckDecor(slideOut, tokens, true);
    addBadge(slideOut, tokens, true, warnings, slideIndex);

    slideOut.addText(String(slideData.title || ''), {
        x: pxToInX(160),
        y: pxToInY(440),
        w: pxToInX(1600),
        h: pxToInY(120),
        align: 'center',
        valign: 'middle',
        color: textColor,
        bold: true,
        fontFace,
        fontSize: pxToPt(clamp(tokens.typography.titleSize, 18, 96, 64), 48),
    });
    slideOut.addText(String(slideData.subtitle || ''), {
        x: pxToInX(220),
        y: pxToInY(560),
        w: pxToInX(1480),
        h: pxToInY(70),
        align: 'center',
        valign: 'middle',
        color: accent,
        bold: true,
        fontFace,
        fontSize: pxToPt(clamp(tokens.typography.subtitleSize, 12, 72, 30), 22),
    });
}

function addTitleTextOnly(slideOut, slideData, tokens) {
    const textColor = toHexColor(tokens.color.textPrimary, 'E7EDF6');
    const accent = toHexColor(tokens.color.accentSecondary, '39A8FF');
    const fontFace = pickFontFace(tokens);

    slideOut.addText(String(slideData.title || ''), {
        x: pxToInX(160),
        y: pxToInY(440),
        w: pxToInX(1600),
        h: pxToInY(120),
        align: 'center',
        valign: 'middle',
        color: textColor,
        bold: true,
        fontFace,
        fontSize: pxToReadablePt(clamp(tokens.typography.titleSize, 18, 96, 64), 48, 0.9),
    });
    slideOut.addText(String(slideData.subtitle || ''), {
        x: pxToInX(220),
        y: pxToInY(560),
        w: pxToInX(1480),
        h: pxToInY(70),
        align: 'center',
        valign: 'middle',
        color: accent,
        bold: true,
        fontFace,
        fontSize: pxToReadablePt(clamp(tokens.typography.subtitleSize, 12, 72, 30), 22, 0.82),
    });
}

function addBlockBackground(slideOut, rect, tokens, kind) {
    const radius = clamp(tokens.spacing.radius, 0, 48, 8);
    let color = null;
    if (kind === 'table' || kind === 'chart') color = 'FFFFFF';
    if (kind === 'kpi') color = 'F7F9FC';
    if (!color) return;
    slideOut.addShape('roundRect', {
        x: pxToInX(rect.x),
        y: pxToInY(rect.y),
        w: pxToInX(rect.w),
        h: pxToInY(rect.h),
        rectRadius: Math.max(0, radius / 160),
        line: { color: 'DCE4F0', pt: Math.max(0, clamp(tokens.spacing.borderWidth, 0, 12, 1) * 0.6) },
        fill: { color, transparency: 3 },
    });
}

function renderTextBlock(slideOut, block, rect, tokens) {
    const text = htmlToPlainText(block.text || '');
    if (!text.trim()) return;
    slideOut.addText(text, {
        x: pxToInX(rect.x + 12),
        y: pxToInY(rect.y + 12),
        w: pxToInX(rect.w - 24),
        h: pxToInY(rect.h - 24),
        color: toHexColor(tokens.color.textPrimary, 'E7EDF6'),
        fontFace: pickFontFace(tokens),
        fontSize: pxToPt(clamp(tokens.typography.bodySize, 10, 48, 28), 20),
        breakLine: true,
        valign: 'top',
        autoFit: true,
        shrinkText: true,
    });
}

function renderTextAtRect(slideOut, htmlText, rect, tokens) {
    const text = htmlToPlainText(htmlText || '');
    if (!text.trim()) return;
    slideOut.addText(text, {
        x: pxToInX(rect.x + 6),
        y: pxToInY(rect.y + 6),
        w: pxToInX(rect.w - 12),
        h: pxToInY(rect.h - 12),
        color: toHexColor(tokens.color.textPrimary, 'E7EDF6'),
        fontFace: pickFontFace(tokens),
        fontSize: pxToReadablePt(clamp(tokens.typography.bodySize, 10, 48, 28), 18, 0.78),
        breakLine: true,
        valign: 'top',
        autoFit: true,
        shrinkText: true,
    });
}

function renderImageBlock(slideOut, block, rect, warnings, slideIndex) {
    const source = toLocalImageSource(block.image || '');
    if (!source) {
        warnings.push({
            slideIndex,
            blockId: block._blockId || null,
            code: 'IMAGE_SOURCE_UNAVAILABLE',
            message: 'Image source is not available for native mapper',
        });
        return;
    }
    const fit = String(block.imageFit || 'contain').toLowerCase();
    const sizing = {
        type: fit === 'cover' ? 'cover' : 'contain',
        x: pxToInX(rect.x),
        y: pxToInY(rect.y),
        w: pxToInX(rect.w),
        h: pxToInY(rect.h),
    };
    slideOut.addImage({
        ...source,
        x: pxToInX(rect.x),
        y: pxToInY(rect.y),
        w: pxToInX(rect.w),
        h: pxToInY(rect.h),
        sizing,
        altText: 'Slide image',
    });

    if (fit === 'cover' && (safeNumber(block.imageOffsetX, 0) !== 0 || safeNumber(block.imageOffsetY, 0) !== 0 || safeNumber(block.imageZoom, 100) !== 100)) {
        warnings.push({
            slideIndex,
            blockId: block._blockId || null,
            code: 'IMAGE_FOCUS_DEGRADED',
            message: 'Image focus offsets/zoom are approximated in native PPTX mode',
        });
    }
}

function tableRowsFromBlock(block) {
    const headers = Array.isArray(block.headers) ? block.headers : [];
    const rows = Array.isArray(block.data) ? block.data : [];
    const out = [];
    out.push(headers.map((h) => ({ text: String(h || ''), options: { bold: true } })));
    rows.forEach((row) => {
        out.push(headers.map((h) => String(row?.[h] ?? '')));
    });
    return out;
}

function renderTableBlock(slideOut, block, rect, tokens) {
    const rows = tableRowsFromBlock(block);
    if (rows.length < 2) return;
    addBlockBackground(slideOut, rect, tokens, 'table');
    slideOut.addTable(rows, {
        x: pxToInX(rect.x + 8),
        y: pxToInY(rect.y + 8),
        w: pxToInX(rect.w - 16),
        h: pxToInY(rect.h - 16),
        border: { type: 'solid', color: 'D5DDE8', pt: 0.6 },
        fontFace: pickFontFace(tokens),
        fontSize: Math.max(8, pxToPt(clamp(tokens.typography.bodySize, 10, 48, 28) * 0.45, 11)),
        color: toHexColor(tokens.color.textPrimary, '1E2430'),
        fill: 'FFFFFF',
        valign: 'middle',
    });
}

function dataSeriesFromChartBlock(block) {
    const headers = Array.isArray(block.headers) ? block.headers : [];
    const rows = Array.isArray(block.data) ? block.data : [];
    const labels = headers.slice(2).map((h) => String(h || ''));
    const seriesNameKey = headers[1] || 'Series';
    return rows.map((row) => ({
        name: String(row?.[seriesNameKey] || 'Series'),
        labels,
        values: labels.map((label) => safeNumber(row?.[label], 0)),
    }));
}

function renderChartBlock(slideOut, block, rect, tokens, warnings, slideIndex) {
    const kind = String(block.chart?.kind || 'line');
    const chartSeries = dataSeriesFromChartBlock(block);
    if (!chartSeries.length) return;
    addBlockBackground(slideOut, rect, tokens, 'chart');

    const palette = (Array.isArray(tokens.chart.palette) ? tokens.chart.palette : THEME_TOKEN_DEFAULTS.chart.palette)
        .map((c) => toHexColor(c, null))
        .filter(Boolean);
    const chartType = kind === 'line' ? 'line' : 'bar';
    const options = {
        x: pxToInX(rect.x + 10),
        y: pxToInY(rect.y + 10),
        w: pxToInX(rect.w - 20),
        h: pxToInY(rect.h - 20),
        chartColors: palette.length ? palette : undefined,
        showLegend: chartSeries.length > 1,
        valAxisLabelFontSize: clamp(tokens.chart.axisLabelSize, 12, 32, 22) * 0.55,
        catAxisLabelFontSize: clamp(tokens.chart.axisLabelSize, 12, 32, 22) * 0.55,
        dataLabelPosition: kind === 'horizontalBar' ? 'outEnd' : 't',
        dataLabelColor: toHexColor(tokens.color.textPrimary, '2D3540'),
        showValue: block.chart?.show_labels !== false,
        barDir: kind === 'horizontalBar' ? 'bar' : 'col',
    };

    try {
        slideOut.addChart(chartType, chartSeries, options);
    } catch (_error) {
        warnings.push({
            slideIndex,
            blockId: block._blockId || null,
            code: 'CHART_NATIVE_FAILED',
            message: 'Chart config is not fully supported by native mapper',
        });
    }
}

function computeCardsGrid(count) {
    if (count <= 1) return { cols: 1, rows: 1 };
    if (count <= 4) return { cols: 2, rows: Math.ceil(count / 2) };
    if (count <= 6) return { cols: 3, rows: 2 };
    return { cols: 4, rows: Math.ceil(count / 4) };
}

function renderKpiBlock(slideOut, block, rect, tokens) {
    const cards = Array.isArray(block.kpi_cards) ? block.kpi_cards : [];
    if (!cards.length) return;
    addBlockBackground(slideOut, rect, tokens, 'kpi');
    const gap = 12;
    const pad = 10;
    const { cols, rows } = computeCardsGrid(cards.length);
    const cardW = (rect.w - pad * 2 - gap * (cols - 1)) / cols;
    const cardH = (rect.h - pad * 2 - gap * (rows - 1)) / rows;

    cards.forEach((card, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const x = rect.x + pad + c * (cardW + gap);
        const y = rect.y + pad + r * (cardH + gap);
        slideOut.addShape('roundRect', {
            x: pxToInX(x),
            y: pxToInY(y),
            w: pxToInX(cardW),
            h: pxToInY(cardH),
            rectRadius: 0.04,
            fill: { color: 'FFFFFF', transparency: 2 },
            line: { color: toHexColor(tokens.color.accent, 'FF7B1F'), pt: 1 },
        });
        slideOut.addText(String(card.label || ''), {
            x: pxToInX(x + 10),
            y: pxToInY(y + 8),
            w: pxToInX(cardW - 20),
            h: pxToInY(22),
            fontFace: pickFontFace(tokens),
            fontSize: 11,
            color: toHexColor(tokens.color.textPrimary, '2B3340'),
        });
        slideOut.addText(String(card.value || ''), {
            x: pxToInX(x + 10),
            y: pxToInY(y + cardH * 0.36),
            w: pxToInX(cardW - 20),
            h: pxToInY(cardH * 0.34),
            bold: true,
            fontFace: pickFontFace(tokens),
            fontSize: Math.max(12, pxToPt(Math.max(16, Math.min(28, cardW * 0.07)), 18)),
            color: toHexColor(tokens.color.textPrimary, '2B3340'),
            shrinkText: true,
        });
        if (card.growth !== undefined && String(card.growth).trim()) {
            const negative = String(card.growth).trim().startsWith('-');
            slideOut.addText(`${negative ? 'v' : '^'} ${String(card.growth).trim()}`, {
                x: pxToInX(x + 10),
                y: pxToInY(y + cardH - 24),
                w: pxToInX(cardW - 20),
                h: pxToInY(16),
                fontFace: pickFontFace(tokens),
                fontSize: 10,
                color: toHexColor(negative ? tokens.color.warn : tokens.color.success, negative ? 'FF626F' : '37D67A'),
            });
        }
    });
}

function renderBlock(slideOut, block, rect, tokens, warnings, slideIndex) {
    if (!block || !rect) return;
    if (block.text) {
        renderTextBlock(slideOut, block, rect, tokens);
        return;
    }
    if (block.image) {
        renderImageBlock(slideOut, block, rect, warnings, slideIndex);
        return;
    }
    if (block.table) {
        renderTableBlock(slideOut, block, rect, tokens);
        return;
    }
    if (block.chart) {
        renderChartBlock(slideOut, block, rect, tokens, warnings, slideIndex);
        return;
    }
    if (block.kpi_cards) {
        renderKpiBlock(slideOut, block, rect, tokens);
        return;
    }
    warnings.push({
        slideIndex,
        blockId: block._blockId || null,
        code: 'BLOCK_UNSUPPORTED',
        message: `Block type ${block._blockType || 'unknown'} is not supported by native mapper`,
    });
}

function addContentSlide(slideOut, slideData, tokens, warnings, slideIndex) {
    const textColor = toHexColor(tokens.color.textPrimary, 'E7EDF6');
    const accent = toHexColor(tokens.color.accent, 'FF7B1F');
    const accent2 = toHexColor(tokens.color.accentSecondary, '39A8FF');
    const fontFace = pickFontFace(tokens);

    addDeckDecor(slideOut, tokens, false);
    addBadge(slideOut, tokens, false, warnings, slideIndex);

    const rects = splitBodyRect(slideData, tokens);
    const headerTextLayout = getContentHeaderTextLayout(tokens, rects.header, Boolean(slideData.subtitle));
    slideOut.addShape('rect', {
        x: pxToInX(rects.header.x),
        y: pxToInY(rects.header.y + 4),
        w: pxToInX(7),
        h: pxToInY(Math.max(64, clamp(tokens.typography.titleSize, 18, 96, 64) * 0.95)),
        line: { color: accent, pt: 0, transparency: 100 },
        fill: { color: accent, transparency: 0 },
    });
    slideOut.addText(String(slideData.title || ''), {
        x: pxToInX(rects.header.x + 20),
        y: pxToInY(headerTextLayout.titleY),
        w: pxToInX(rects.header.w - 30),
        h: pxToInY(headerTextLayout.titleBoxHeight),
        fontFace,
        bold: true,
        color: textColor,
        fontSize: clamp(tokens.typography.titleSize, 18, 96, 64),
    });
    if (slideData.subtitle) {
        slideOut.addText(String(slideData.subtitle), {
            x: pxToInX(rects.header.x + 20),
            y: pxToInY(headerTextLayout.subtitleY),
            w: pxToInX(rects.header.w - 30),
            h: pxToInY(headerTextLayout.subtitleBoxHeight),
            fontFace,
            bold: true,
            color: accent2,
            fontSize: clamp(tokens.typography.subtitleSize, 12, 72, 30),
        });
    }

    const slots = resolveSlots(slideData);
    const schema = slideData.layoutPreset?.schema;
    if (!schema || !schema.grid || !Array.isArray(schema.slots) || !schema.slots.length) {
        if (!slots.length) return;
        const gap = 20;
        const width = (rects.body.w - gap * (slots.length - 1)) / slots.length;
        slots.forEach((slot, i) => {
            const rect = { x: rects.body.x + i * (width + gap), y: rects.body.y, w: width, h: rects.body.h };
            if (slot.block) renderBlock(slideOut, slot.block, rect, tokens, warnings, slideIndex);
        });
        return;
    }

    const areaRects = computeAreaRects(schema.grid, rects.body);
    slots.forEach((slot) => {
        if (!slot.block) return;
        let rect = null;
        if (slot.area && areaRects.has(slot.area)) {
            rect = areaRects.get(slot.area);
        }
        if (!rect) {
            rect = { ...rects.body };
        }
        renderBlock(slideOut, slot.block, rect, tokens, warnings, slideIndex);
    });
}

function buildNativePptxDeck({ pptx, presentationId }) {
    const model = buildRenderModelByPresentationId(presentationId);
    if (!model) return { warnings: [], slidesCount: 0 };
    const normalized = normalizeThemeTokens(model.meta?.themeTokens || {});
    const tokens = normalized.tokens || THEME_TOKEN_DEFAULTS;
    const warnings = [...(normalized.warnings || [])].map((warning) => ({
        slideIndex: null,
        blockId: null,
        code: 'TOKEN_NORMALIZED',
        message: warning.message,
    }));

    const bg = toHexColor(tokens.color.bgCanvas, '05080D');
    const slides = Array.isArray(model.slides) ? model.slides : [];
    slides.forEach((slideData, index) => {
        const slideOut = pptx.addSlide();
        slideOut.background = { color: bg };
        if (slideData.type === 'title') {
            addTitleSlide(slideOut, slideData, tokens, warnings, index + 1);
        } else {
            addContentSlide(slideOut, slideData, tokens, warnings, index + 1);
        }
    });
    return { warnings, slidesCount: slides.length };
}

function buildHybridBlocksPptxDeck({ pptx, presentationId, slideAssets }) {
    const model = buildRenderModelByPresentationId(presentationId);
    if (!model) return { warnings: [], slidesCount: 0 };
    const normalized = normalizeThemeTokens(model.meta?.themeTokens || {});
    const tokens = normalized.tokens || THEME_TOKEN_DEFAULTS;
    const warnings = [...(normalized.warnings || [])].map((warning) => ({
        slideIndex: null,
        blockId: null,
        code: 'TOKEN_NORMALIZED',
        message: warning.message,
    }));

    const bg = toHexColor(tokens.color.bgCanvas, '05080D');
    const slides = Array.isArray(model.slides) ? model.slides : [];
    slides.forEach((slideData, index) => {
        const slideOut = pptx.addSlide();
        slideOut.background = { color: bg };
        const asset = Array.isArray(slideAssets) ? slideAssets[index] : null;
        if (asset?.backgroundPath) {
            slideOut.addImage({
                path: asset.backgroundPath,
                x: 0,
                y: 0,
                w: PPTX_WIDTH,
                h: PPTX_HEIGHT,
            });
        }

        if (slideData.type === 'title') {
            addTitleTextOnly(slideOut, slideData, tokens);
        } else {
            const textColor = toHexColor(tokens.color.textPrimary, 'E7EDF6');
            const accent = toHexColor(tokens.color.accent, 'FF7B1F');
            const accent2 = toHexColor(tokens.color.accentSecondary, '39A8FF');
            const fontFace = pickFontFace(tokens);
            const rects = splitBodyRect(slideData, tokens);
            const headerTextLayout = getContentHeaderTextLayout(tokens, rects.header, Boolean(slideData.subtitle));

            slideOut.addShape('rect', {
                x: pxToInX(rects.header.x),
                y: pxToInY(rects.header.y + 4),
                w: pxToInX(7),
                h: pxToInY(Math.max(64, clamp(tokens.typography.titleSize, 18, 96, 64) * 0.95)),
                line: { color: accent, pt: 0, transparency: 100 },
                fill: { color: accent, transparency: 0 },
            });
            slideOut.addText(String(slideData.title || ''), {
                x: pxToInX(rects.header.x + 20),
                y: pxToInY(headerTextLayout.titleY),
                w: pxToInX(rects.header.w - 30),
                h: pxToInY(headerTextLayout.titleBoxHeight),
                fontFace,
                bold: true,
                color: textColor,
                fontSize: pxToReadablePt(clamp(tokens.typography.titleSize, 18, 96, 64), 48, 0.9),
            });
            if (slideData.subtitle) {
                slideOut.addText(String(slideData.subtitle), {
                    x: pxToInX(rects.header.x + 20),
                    y: pxToInY(headerTextLayout.subtitleY),
                    w: pxToInX(rects.header.w - 30),
                    h: pxToInY(headerTextLayout.subtitleBoxHeight),
                    fontFace,
                    bold: true,
                    color: accent2,
                    fontSize: pxToReadablePt(clamp(tokens.typography.subtitleSize, 12, 72, 30), 22, 0.82),
                });
            }
        }

        const byId = new Map((Array.isArray(slideData.blocks) ? slideData.blocks : []).map((b) => [String(b._blockId || ''), b]));
        const items = Array.isArray(asset?.blocks) ? asset.blocks : [];
        items.forEach((item) => {
            const rect = item?.rect;
            if (!rect) return;
            if (item.blockType === 'text') {
                const block = byId.get(String(item.blockId || ''));
                renderTextAtRect(slideOut, block?.text || '', rect, tokens);
                return;
            }
            if (item.imagePath) {
                slideOut.addImage({
                    path: item.imagePath,
                    x: pxToInX(rect.x),
                    y: pxToInY(rect.y),
                    w: pxToInX(rect.w),
                    h: pxToInY(rect.h),
                });
                return;
            }
            warnings.push({
                slideIndex: index + 1,
                blockId: item.blockId || null,
                code: 'BLOCK_ASSET_MISSING',
                message: `Block asset is missing for ${item.blockType || 'unknown'} block`,
            });
        });
    });
    return { warnings, slidesCount: slides.length };
}

module.exports = {
    buildNativePptxDeck,
    buildHybridBlocksPptxDeck,
};
