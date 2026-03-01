function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHexColor(value) {
    return typeof value === 'string' && /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

function luminance(hex) {
    const normalized = hex.replace('#', '').slice(0, 6);
    const rgb = [0, 2, 4].map((idx) => parseInt(normalized.slice(idx, idx + 2), 16) / 255);
    const linear = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(hexA, hexB) {
    const l1 = luminance(hexA);
    const l2 = luminance(hexB);
    const light = Math.max(l1, l2);
    const dark = Math.min(l1, l2);
    return (light + 0.05) / (dark + 0.05);
}

function addRangeDetails(details, path, value, min, max) {
    if (value === undefined) return;
    if (typeof value !== 'number' || Number.isNaN(value) || value < min || value > max) {
        details.push({
            path,
            rule: 'range',
            message: `${path} must be a number between ${min} and ${max}`,
        });
    }
}

function clamp(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

const THEME_TOKEN_DEFAULTS = {
    color: {
        bgCanvas: '#05080d',
        textPrimary: '#e7edf6',
        accent: '#ff7b1f',
    },
    typography: {
        titleSize: 64,
        subtitleSize: 30,
        bodySize: 28,
        lineHeight: 1.38,
    },
    spacing: {
        radius: 8,
        borderWidth: 1,
    },
    chart: {
        palette: ['#39a8ff', '#ff7b1f', '#69bcff', '#ff9a4d'],
    },
    table: {
        headerBg: '#152135',
        headerText: '#f2f7ff',
    },
    decor: {
        intensity: 2,
        safeZoneAlpha: 0.08,
        titleMultiplier: 1.25,
        contentMultiplier: 1,
        logoEnabled: true,
        logoText: 'DARKDAN',
        logoAnchor: 'top-right',
        logoSize: 14,
        logoOpacity: 0.95,
        shapePreset: 'both',
    },
};

const ALLOWED_TOP_LEVEL = new Set(['color', 'typography', 'spacing', 'chart', 'table', 'decor']);
const ALLOWED_GROUP_KEYS = {
    color: new Set(['bgCanvas', 'textPrimary', 'accent']),
    typography: new Set(['titleSize', 'subtitleSize', 'bodySize', 'lineHeight']),
    spacing: new Set(['radius', 'borderWidth']),
    chart: new Set(['palette']),
    table: new Set(['headerBg', 'headerText']),
    decor: new Set([
        'intensity',
        'safeZoneAlpha',
        'titleMultiplier',
        'contentMultiplier',
        'logoEnabled',
        'logoText',
        'logoAnchor',
        'logoSize',
        'logoOpacity',
        'shapePreset',
    ]),
};

const ALLOWED_DECOR_ANCHORS = new Set(['top-right', 'top-left', 'bottom-right', 'bottom-left']);
const ALLOWED_SHAPE_PRESETS = new Set(['none', 'left-line', 'triangle', 'blob', 'both']);

function findUnknownTokenKeys(tokens) {
    const details = [];

    Object.keys(tokens).forEach((key) => {
        if (!ALLOWED_TOP_LEVEL.has(key)) {
            details.push({
                path: `tokens.${key}`,
                rule: 'unknown',
                message: `tokens.${key} is not supported by PPTX-safe theme schema`,
            });
        }
    });

    Object.entries(ALLOWED_GROUP_KEYS).forEach(([group, keys]) => {
        const value = tokens[group];
        if (value === undefined) return;
        if (!isPlainObject(value)) {
            details.push({
                path: `tokens.${group}`,
                rule: 'object',
                message: `tokens.${group} must be an object`,
            });
            return;
        }
        Object.keys(value).forEach((childKey) => {
            if (!keys.has(childKey)) {
                details.push({
                    path: `tokens.${group}.${childKey}`,
                    rule: 'unknown',
                    message: `tokens.${group}.${childKey} is not supported by PPTX-safe theme schema`,
                });
            }
        });
    });

    return details;
}

function validateThemeTokens(tokens) {
    const details = [];
    const warnings = [];

    if (!isPlainObject(tokens)) {
        details.push({ path: 'tokens', rule: 'object', message: 'tokens must be an object' });
        return { details, warnings };
    }

    details.push(...findUnknownTokenKeys(tokens));

    const color = isPlainObject(tokens.color) ? tokens.color : {};
    const typography = isPlainObject(tokens.typography) ? tokens.typography : {};
    const spacing = isPlainObject(tokens.spacing) ? tokens.spacing : {};
    const chart = isPlainObject(tokens.chart) ? tokens.chart : {};
    const table = isPlainObject(tokens.table) ? tokens.table : {};
    const decor = isPlainObject(tokens.decor) ? tokens.decor : {};

    ['bgCanvas', 'textPrimary', 'accent'].forEach((key) => {
        if (color[key] !== undefined && !isHexColor(color[key] || '')) {
            details.push({ path: `tokens.color.${key}`, rule: 'hexColor', message: `${key} must be a hex color` });
        }
    });

    addRangeDetails(details, 'tokens.typography.titleSize', typography.titleSize, 18, 96);
    addRangeDetails(details, 'tokens.typography.subtitleSize', typography.subtitleSize, 12, 72);
    addRangeDetails(details, 'tokens.typography.bodySize', typography.bodySize, 10, 48);
    addRangeDetails(details, 'tokens.typography.lineHeight', typography.lineHeight, 1, 2.2);

    if (spacing.slidePadding !== undefined) {
        details.push({
            path: 'tokens.spacing.slidePadding',
            rule: 'forbidden',
            message: 'slidePadding is structural and cannot be theme-controlled',
        });
    }
    if (spacing.blockGap !== undefined) {
        details.push({
            path: 'tokens.spacing.blockGap',
            rule: 'forbidden',
            message: 'blockGap is structural and cannot be theme-controlled',
        });
    }
    if (spacing.cardPadding !== undefined) {
        details.push({
            path: 'tokens.spacing.cardPadding',
            rule: 'forbidden',
            message: 'cardPadding is structural and cannot be theme-controlled',
        });
    }
    addRangeDetails(details, 'tokens.spacing.radius', spacing.radius, 0, 48);
    addRangeDetails(details, 'tokens.spacing.borderWidth', spacing.borderWidth, 0, 12);

    addRangeDetails(details, 'tokens.decor.intensity', decor.intensity, 1, 3);
    addRangeDetails(details, 'tokens.decor.safeZoneAlpha', decor.safeZoneAlpha, 0, 0.35);
    addRangeDetails(details, 'tokens.decor.titleMultiplier', decor.titleMultiplier, 0.8, 2);
    addRangeDetails(details, 'tokens.decor.contentMultiplier', decor.contentMultiplier, 0.6, 1.6);
    addRangeDetails(details, 'tokens.decor.logoSize', decor.logoSize, 10, 36);
    addRangeDetails(details, 'tokens.decor.logoOpacity', decor.logoOpacity, 0.2, 1);

    if (decor.logoEnabled !== undefined && typeof decor.logoEnabled !== 'boolean') {
        details.push({
            path: 'tokens.decor.logoEnabled',
            rule: 'boolean',
            message: 'logoEnabled must be a boolean',
        });
    }
    if (decor.logoText !== undefined && (typeof decor.logoText !== 'string' || decor.logoText.trim().length === 0)) {
        details.push({
            path: 'tokens.decor.logoText',
            rule: 'string',
            message: 'logoText must be a non-empty string',
        });
    }
    if (decor.logoAnchor !== undefined && !ALLOWED_DECOR_ANCHORS.has(String(decor.logoAnchor))) {
        details.push({
            path: 'tokens.decor.logoAnchor',
            rule: 'enum',
            message: 'logoAnchor must be one of top-right, top-left, bottom-right, bottom-left',
        });
    }
    if (decor.shapePreset !== undefined && !ALLOWED_SHAPE_PRESETS.has(String(decor.shapePreset))) {
        details.push({
            path: 'tokens.decor.shapePreset',
            rule: 'enum',
            message: 'shapePreset must be one of none, left-line, triangle, blob, both',
        });
    }

    if (Array.isArray(chart.palette) && chart.palette.length) {
        chart.palette.forEach((value, index) => {
            if (!isHexColor(value)) {
                details.push({
                    path: `tokens.chart.palette[${index}]`,
                    rule: 'hexColor',
                    message: 'chart.palette items must be hex colors',
                });
            }
        });
    }

    if (table.headerBg && !isHexColor(table.headerBg)) {
        details.push({ path: 'tokens.table.headerBg', rule: 'hexColor', message: 'table.headerBg must be a hex color' });
    }
    if (table.headerText && !isHexColor(table.headerText)) {
        details.push({ path: 'tokens.table.headerText', rule: 'hexColor', message: 'table.headerText must be a hex color' });
    }

    const effectiveText = isHexColor(color.textPrimary) ? color.textPrimary : THEME_TOKEN_DEFAULTS.color.textPrimary;
    const effectiveBg = isHexColor(color.bgCanvas) ? color.bgCanvas : THEME_TOKEN_DEFAULTS.color.bgCanvas;
    const ratio = contrastRatio(effectiveText, effectiveBg);
    if (ratio < 4.5) {
        warnings.push({
            path: 'tokens.color',
            rule: 'contrast',
            message: `textPrimary/bgCanvas contrast ratio is ${ratio.toFixed(2)} (< 4.5)`,
        });
    }

    const tableHeaderText = isHexColor(table.headerText || '') ? table.headerText : THEME_TOKEN_DEFAULTS.table.headerText;
    const tableHeaderBg = isHexColor(table.headerBg || '') ? table.headerBg : THEME_TOKEN_DEFAULTS.table.headerBg;
    const tableRatio = contrastRatio(tableHeaderText, tableHeaderBg);
    if (tableRatio < 4.5) {
        warnings.push({
            path: 'tokens.table',
            rule: 'contrast',
            message: `table header text/background contrast ratio is ${tableRatio.toFixed(2)} (< 4.5)`,
        });
    }

    return { details, warnings };
}

function normalizeThemeTokens(tokens, options = {}) {
    const warnings = [];
    const source = isPlainObject(tokens) ? tokens : {};
    const baseTokens = isPlainObject(options.baseTokens) ? options.baseTokens : {};
    const merged = {
        ...THEME_TOKEN_DEFAULTS,
        ...baseTokens,
        ...source,
        color: { ...THEME_TOKEN_DEFAULTS.color, ...(baseTokens.color || {}), ...(source.color || {}) },
        typography: { ...THEME_TOKEN_DEFAULTS.typography, ...(baseTokens.typography || {}), ...(source.typography || {}) },
        spacing: { ...THEME_TOKEN_DEFAULTS.spacing, ...(baseTokens.spacing || {}), ...(source.spacing || {}) },
        chart: { ...THEME_TOKEN_DEFAULTS.chart, ...(baseTokens.chart || {}), ...(source.chart || {}) },
        table: { ...THEME_TOKEN_DEFAULTS.table, ...(baseTokens.table || {}), ...(source.table || {}) },
        decor: { ...THEME_TOKEN_DEFAULTS.decor, ...(baseTokens.decor || {}), ...(source.decor || {}) },
    };

    const normalized = {
        color: {
            bgCanvas: isHexColor(merged.color.bgCanvas) ? merged.color.bgCanvas : THEME_TOKEN_DEFAULTS.color.bgCanvas,
            textPrimary: isHexColor(merged.color.textPrimary) ? merged.color.textPrimary : THEME_TOKEN_DEFAULTS.color.textPrimary,
            accent: isHexColor(merged.color.accent) ? merged.color.accent : THEME_TOKEN_DEFAULTS.color.accent,
        },
        typography: {
            titleSize: clamp(merged.typography.titleSize, 18, 96, THEME_TOKEN_DEFAULTS.typography.titleSize),
            subtitleSize: clamp(merged.typography.subtitleSize, 12, 72, THEME_TOKEN_DEFAULTS.typography.subtitleSize),
            bodySize: clamp(merged.typography.bodySize, 10, 48, THEME_TOKEN_DEFAULTS.typography.bodySize),
            lineHeight: clamp(merged.typography.lineHeight, 1, 2.2, THEME_TOKEN_DEFAULTS.typography.lineHeight),
        },
        spacing: {
            radius: clamp(merged.spacing.radius, 0, 48, THEME_TOKEN_DEFAULTS.spacing.radius),
            borderWidth: clamp(merged.spacing.borderWidth, 0, 12, THEME_TOKEN_DEFAULTS.spacing.borderWidth),
        },
        chart: {
            palette: Array.isArray(merged.chart.palette)
                ? merged.chart.palette.filter(isHexColor).slice(0, 4)
                : THEME_TOKEN_DEFAULTS.chart.palette.slice(),
        },
        table: {
            headerBg: isHexColor(merged.table.headerBg) ? merged.table.headerBg : THEME_TOKEN_DEFAULTS.table.headerBg,
            headerText: isHexColor(merged.table.headerText) ? merged.table.headerText : THEME_TOKEN_DEFAULTS.table.headerText,
        },
        decor: {
            intensity: clamp(merged.decor.intensity, 1, 3, THEME_TOKEN_DEFAULTS.decor.intensity),
            safeZoneAlpha: clamp(merged.decor.safeZoneAlpha, 0, 0.35, THEME_TOKEN_DEFAULTS.decor.safeZoneAlpha),
            titleMultiplier: clamp(merged.decor.titleMultiplier, 0.8, 2, THEME_TOKEN_DEFAULTS.decor.titleMultiplier),
            contentMultiplier: clamp(merged.decor.contentMultiplier, 0.6, 1.6, THEME_TOKEN_DEFAULTS.decor.contentMultiplier),
            logoEnabled: Boolean(merged.decor.logoEnabled),
            logoText: String(merged.decor.logoText || THEME_TOKEN_DEFAULTS.decor.logoText).trim().slice(0, 32) || THEME_TOKEN_DEFAULTS.decor.logoText,
            logoAnchor: ALLOWED_DECOR_ANCHORS.has(String(merged.decor.logoAnchor))
                ? String(merged.decor.logoAnchor)
                : THEME_TOKEN_DEFAULTS.decor.logoAnchor,
            logoSize: clamp(merged.decor.logoSize, 10, 36, THEME_TOKEN_DEFAULTS.decor.logoSize),
            logoOpacity: clamp(merged.decor.logoOpacity, 0.2, 1, THEME_TOKEN_DEFAULTS.decor.logoOpacity),
            shapePreset: ALLOWED_SHAPE_PRESETS.has(String(merged.decor.shapePreset))
                ? String(merged.decor.shapePreset)
                : THEME_TOKEN_DEFAULTS.decor.shapePreset,
        },
    };

    const unknowns = findUnknownTokenKeys(source);
    if (unknowns.length) {
        unknowns.forEach((unknown) => {
            warnings.push({
                path: unknown.path,
                rule: 'ignored',
                message: `${unknown.path} was ignored by normalization`,
            });
        });
    }

    if (!normalized.chart.palette.length) {
        normalized.chart.palette = THEME_TOKEN_DEFAULTS.chart.palette.slice();
        warnings.push({
            path: 'tokens.chart.palette',
            rule: 'default',
            message: 'chart.palette was empty after normalization and default palette was applied',
        });
    }

    return { tokens: normalized, warnings };
}

function validateLayoutBindingPayload(payload) {
    const details = [];
    if (!isPlainObject(payload)) {
        return {
            details: [{ path: 'body', rule: 'object', message: 'request body must be an object' }],
        };
    }

    const { layoutPresetId, slotAssignments } = payload;

    if (!layoutPresetId || typeof layoutPresetId !== 'string') {
        details.push({ path: 'layoutPresetId', rule: 'required', message: 'layoutPresetId is required' });
    }
    if (slotAssignments !== undefined) {
        if (!Array.isArray(slotAssignments)) {
            details.push({ path: 'slotAssignments', rule: 'array', message: 'slotAssignments must be an array' });
        } else {
            slotAssignments.forEach((item, index) => {
                if (!isPlainObject(item)) {
                    details.push({ path: `slotAssignments[${index}]`, rule: 'object', message: 'assignment must be an object' });
                    return;
                }
                if (!item.slotId || typeof item.slotId !== 'string') {
                    details.push({ path: `slotAssignments[${index}].slotId`, rule: 'required', message: 'slotId is required' });
                }
                if (!item.blockId || typeof item.blockId !== 'string') {
                    details.push({ path: `slotAssignments[${index}].blockId`, rule: 'required', message: 'blockId is required' });
                }
            });
        }
    }

    return { details };
}

function validateSlotAssignmentsAgainstLayout(layoutPreset, slotAssignments, slideBlocks) {
    const details = [];
    if (!layoutPreset) {
        details.push({ path: 'layoutPresetId', rule: 'exists', message: 'layout preset not found' });
        return { details };
    }

    const slots = Array.isArray(layoutPreset.schema?.slots) ? layoutPreset.schema.slots : [];
    const slotIds = new Set(slots.map((slot) => slot.id));
    const blocksById = new Map(slideBlocks.map((block) => [block.id, block]));

    const usedSlots = new Set();
    const usedBlocks = new Set();

    (slotAssignments || []).forEach((assignment, index) => {
        if (!slotIds.has(assignment.slotId)) {
            details.push({
                path: `slotAssignments[${index}].slotId`,
                rule: 'membership',
                message: 'slotId is not part of selected layout preset',
            });
            return;
        }

        if (usedSlots.has(assignment.slotId)) {
            details.push({
                path: `slotAssignments[${index}].slotId`,
                rule: 'unique',
                message: 'slotId must be unique in assignments',
            });
        }
        usedSlots.add(assignment.slotId);

        const block = blocksById.get(assignment.blockId);
        if (!block) {
            details.push({
                path: `slotAssignments[${index}].blockId`,
                rule: 'membership',
                message: 'blockId is not part of current slide',
            });
            return;
        }

        if (usedBlocks.has(assignment.blockId)) {
            details.push({
                path: `slotAssignments[${index}].blockId`,
                rule: 'unique',
                message: 'blockId must be unique in assignments',
            });
        }
        usedBlocks.add(assignment.blockId);

        const slot = slots.find((s) => s.id === assignment.slotId);
        const allowed = Array.isArray(slot?.allowedBlockTypes) ? slot.allowedBlockTypes : [];
        if (allowed.length && !allowed.includes(block.type)) {
            details.push({
                path: `slotAssignments[${index}]`,
                rule: 'blockType',
                message: `block type ${block.type} is not allowed in slot ${assignment.slotId}`,
            });
        }
    });

    return { details };
}

module.exports = {
    THEME_TOKEN_DEFAULTS,
    normalizeThemeTokens,
    validateLayoutBindingPayload,
    validateSlotAssignmentsAgainstLayout,
    validateThemeTokens,
};
