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
        accentSecondary: '#39a8ff',
        success: '#37d67a',
        warn: '#ff626f',
        info: '#55b8ff',
    },
    typography: {
        titleSize: 64,
        subtitleSize: 30,
        bodySize: 28,
        lineHeight: 1.38,
        profile: 'technical',
    },
    spacing: {
        radius: 8,
        borderWidth: 1,
    },
    chart: {
        palette: ['#39a8ff', '#ff7b1f', '#69bcff', '#ff9a4d'],
        mode: 'contrast',
    },
    table: {
        headerBg: '#152135',
        headerText: '#f2f7ff',
        mode: 'normal',
    },
    decor: {
        presetPack: 'balanced',
        intensity: 2,
        safeZoneAlpha: 0.08,
        titleMultiplier: 1.25,
        contentMultiplier: 1,
        gridEnabled: true,
        textGlowEnabled: true,
        cardShadowEnabled: true,
        tableShadowEnabled: true,
        chartShadowEnabled: true,
        imageShadowEnabled: true,
        logoEnabled: true,
        logoText: 'DARKDAN',
        logoImageUrl: '',
        serviceTag: 'SYSTEM v1.0',
        logoAnchor: 'top-right',
        logoSize: 14,
        logoOpacity: 0.95,
        badgeVariant: 'outlined',
        badgeOnTitle: true,
        badgeOnContent: true,
        shapeLeftLineEnabled: true,
        shapeLeftLineAnchor: 'left',
        shapeLeftLineSize: 1,
        shapeLeftLineOpacity: 1,
        shapeTriangleEnabled: true,
        shapeTriangleAnchor: 'bottom-right',
        shapeTriangleSize: 1,
        shapeTriangleOpacity: 1,
        shapeBlobEnabled: true,
        shapeBlobAnchor: 'top-right',
        shapeBlobSize: 1,
        shapeBlobOpacity: 1,
    },
};

const ALLOWED_TOP_LEVEL = new Set(['color', 'typography', 'spacing', 'chart', 'table', 'decor']);
const ALLOWED_GROUP_KEYS = {
    color: new Set(['bgCanvas', 'textPrimary', 'accent', 'accentSecondary', 'success', 'warn', 'info']),
    typography: new Set(['titleSize', 'subtitleSize', 'bodySize', 'lineHeight', 'profile']),
    spacing: new Set(['radius', 'borderWidth']),
    chart: new Set(['palette', 'mode']),
    table: new Set(['headerBg', 'headerText', 'mode']),
    decor: new Set([
        'presetPack',
        'intensity',
        'safeZoneAlpha',
        'titleMultiplier',
        'contentMultiplier',
        'gridEnabled',
        'textGlowEnabled',
        'cardShadowEnabled',
        'tableShadowEnabled',
        'chartShadowEnabled',
        'imageShadowEnabled',
        'logoEnabled',
        'logoText',
        'logoImageUrl',
        'serviceTag',
        'logoAnchor',
        'logoSize',
        'logoOpacity',
        'badgeVariant',
        'badgeOnTitle',
        'badgeOnContent',
        'shapeLeftLineEnabled',
        'shapeLeftLineAnchor',
        'shapeLeftLineSize',
        'shapeLeftLineOpacity',
        'shapeTriangleEnabled',
        'shapeTriangleAnchor',
        'shapeTriangleSize',
        'shapeTriangleOpacity',
        'shapeBlobEnabled',
        'shapeBlobAnchor',
        'shapeBlobSize',
        'shapeBlobOpacity',
    ]),
};

const ALLOWED_DECOR_ANCHORS = new Set(['top-right', 'top-left', 'bottom-right', 'bottom-left']);
const ALLOWED_LEFT_LINE_ANCHORS = new Set(['left', 'right']);
const ALLOWED_TRIANGLE_ANCHORS = new Set(['top-right', 'top-left', 'bottom-right', 'bottom-left']);
const ALLOWED_BLOB_ANCHORS = new Set(['top-right', 'top-left', 'bottom-right', 'bottom-left']);
const ALLOWED_BADGE_VARIANTS = new Set(['minimal', 'outlined', 'signal']);
const ALLOWED_PRESET_PACKS = new Set(['compact', 'balanced', 'bold']);
const ALLOWED_TYPO_PROFILES = new Set(['executive', 'technical', 'sales']);
const ALLOWED_CHART_MODES = new Set(['contrast', 'minimal', 'dashboard']);
const ALLOWED_TABLE_MODES = new Set(['dense', 'normal', 'boardroom']);
const MAX_LOGO_IMAGE_URL_LENGTH = 30_000_000;

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

    ['bgCanvas', 'textPrimary', 'accent', 'accentSecondary', 'success', 'warn', 'info'].forEach((key) => {
        if (color[key] !== undefined && !isHexColor(color[key] || '')) {
            details.push({ path: `tokens.color.${key}`, rule: 'hexColor', message: `${key} must be a hex color` });
        }
    });

    addRangeDetails(details, 'tokens.typography.titleSize', typography.titleSize, 18, 96);
    addRangeDetails(details, 'tokens.typography.subtitleSize', typography.subtitleSize, 12, 72);
    addRangeDetails(details, 'tokens.typography.bodySize', typography.bodySize, 10, 48);
    addRangeDetails(details, 'tokens.typography.lineHeight', typography.lineHeight, 1, 2.2);
    if (typography.profile !== undefined && !ALLOWED_TYPO_PROFILES.has(String(typography.profile))) {
        details.push({
            path: 'tokens.typography.profile',
            rule: 'enum',
            message: 'profile must be one of executive, technical, sales',
        });
    }

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
    if (chart.mode !== undefined && !ALLOWED_CHART_MODES.has(String(chart.mode))) {
        details.push({
            path: 'tokens.chart.mode',
            rule: 'enum',
            message: 'chart.mode must be one of contrast, minimal, dashboard',
        });
    }

    if (table.headerBg && !isHexColor(table.headerBg)) {
        details.push({ path: 'tokens.table.headerBg', rule: 'hexColor', message: 'table.headerBg must be a hex color' });
    }
    if (table.headerText && !isHexColor(table.headerText)) {
        details.push({ path: 'tokens.table.headerText', rule: 'hexColor', message: 'table.headerText must be a hex color' });
    }
    if (table.mode !== undefined && !ALLOWED_TABLE_MODES.has(String(table.mode))) {
        details.push({
            path: 'tokens.table.mode',
            rule: 'enum',
            message: 'table.mode must be one of dense, normal, boardroom',
        });
    }

    addRangeDetails(details, 'tokens.decor.intensity', decor.intensity, 1, 3);
    addRangeDetails(details, 'tokens.decor.safeZoneAlpha', decor.safeZoneAlpha, 0, 0.35);
    addRangeDetails(details, 'tokens.decor.titleMultiplier', decor.titleMultiplier, 0.8, 2);
    addRangeDetails(details, 'tokens.decor.contentMultiplier', decor.contentMultiplier, 0.6, 1.6);
    addRangeDetails(details, 'tokens.decor.logoSize', decor.logoSize, 10, 36);
    addRangeDetails(details, 'tokens.decor.logoOpacity', decor.logoOpacity, 0.2, 1);
    addRangeDetails(details, 'tokens.decor.shapeLeftLineSize', decor.shapeLeftLineSize, 0.4, 1.8);
    addRangeDetails(details, 'tokens.decor.shapeLeftLineOpacity', decor.shapeLeftLineOpacity, 0, 1);
    addRangeDetails(details, 'tokens.decor.shapeTriangleSize', decor.shapeTriangleSize, 0.4, 1.8);
    addRangeDetails(details, 'tokens.decor.shapeTriangleOpacity', decor.shapeTriangleOpacity, 0, 1);
    addRangeDetails(details, 'tokens.decor.shapeBlobSize', decor.shapeBlobSize, 0.4, 1.8);
    addRangeDetails(details, 'tokens.decor.shapeBlobOpacity', decor.shapeBlobOpacity, 0, 1);

    if (decor.presetPack !== undefined && !ALLOWED_PRESET_PACKS.has(String(decor.presetPack))) {
        details.push({
            path: 'tokens.decor.presetPack',
            rule: 'enum',
            message: 'presetPack must be one of compact, balanced, bold',
        });
    }
    if (decor.badgeVariant !== undefined && !ALLOWED_BADGE_VARIANTS.has(String(decor.badgeVariant))) {
        details.push({
            path: 'tokens.decor.badgeVariant',
            rule: 'enum',
            message: 'badgeVariant must be one of minimal, outlined, signal',
        });
    }
    if (decor.logoAnchor !== undefined && !ALLOWED_DECOR_ANCHORS.has(String(decor.logoAnchor))) {
        details.push({
            path: 'tokens.decor.logoAnchor',
            rule: 'enum',
            message: 'logoAnchor must be one of top-right, top-left, bottom-right, bottom-left',
        });
    }
    if (decor.shapeLeftLineAnchor !== undefined && !ALLOWED_LEFT_LINE_ANCHORS.has(String(decor.shapeLeftLineAnchor))) {
        details.push({
            path: 'tokens.decor.shapeLeftLineAnchor',
            rule: 'enum',
            message: 'shapeLeftLineAnchor must be one of left, right',
        });
    }
    if (decor.shapeTriangleAnchor !== undefined && !ALLOWED_TRIANGLE_ANCHORS.has(String(decor.shapeTriangleAnchor))) {
        details.push({
            path: 'tokens.decor.shapeTriangleAnchor',
            rule: 'enum',
            message: 'shapeTriangleAnchor must be one of top-right, top-left, bottom-right, bottom-left',
        });
    }
    if (decor.shapeBlobAnchor !== undefined && !ALLOWED_BLOB_ANCHORS.has(String(decor.shapeBlobAnchor))) {
        details.push({
            path: 'tokens.decor.shapeBlobAnchor',
            rule: 'enum',
            message: 'shapeBlobAnchor must be one of top-right, top-left, bottom-right, bottom-left',
        });
    }

    [
        'gridEnabled',
        'textGlowEnabled',
        'cardShadowEnabled',
        'tableShadowEnabled',
        'chartShadowEnabled',
        'imageShadowEnabled',
        'logoEnabled',
        'badgeOnTitle',
        'badgeOnContent',
        'shapeLeftLineEnabled',
        'shapeTriangleEnabled',
        'shapeBlobEnabled',
    ].forEach((key) => {
        if (decor[key] !== undefined && typeof decor[key] !== 'boolean') {
            details.push({
                path: `tokens.decor.${key}`,
                rule: 'boolean',
                message: `${key} must be a boolean`,
            });
        }
    });

    if (decor.logoText !== undefined && (typeof decor.logoText !== 'string' || decor.logoText.trim().length === 0)) {
        details.push({
            path: 'tokens.decor.logoText',
            rule: 'string',
            message: 'logoText must be a non-empty string',
        });
    }
    if (decor.logoImageUrl !== undefined && typeof decor.logoImageUrl !== 'string') {
        details.push({
            path: 'tokens.decor.logoImageUrl',
            rule: 'string',
            message: 'logoImageUrl must be a string',
        });
    }
    if (typeof decor.logoImageUrl === 'string' && decor.logoImageUrl.length > MAX_LOGO_IMAGE_URL_LENGTH) {
        details.push({
            path: 'tokens.decor.logoImageUrl',
            rule: 'length',
            message: `logoImageUrl is too long (max ${MAX_LOGO_IMAGE_URL_LENGTH} chars)`,
        });
    }
    if (decor.serviceTag !== undefined && typeof decor.serviceTag !== 'string') {
        details.push({
            path: 'tokens.decor.serviceTag',
            rule: 'string',
            message: 'serviceTag must be a string',
        });
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

function resolvePresetAdjustedDecor(decor) {
    const preset = String(decor.presetPack || 'balanced');
    if (preset === 'compact') {
        return {
            ...decor,
            intensity: clamp(decor.intensity, 1, 2.2, 1.5),
            titleMultiplier: clamp(decor.titleMultiplier, 0.8, 1.4, 1.05),
            contentMultiplier: clamp(decor.contentMultiplier, 0.6, 1.3, 0.9),
        };
    }
    if (preset === 'bold') {
        return {
            ...decor,
            intensity: clamp(decor.intensity, 1.8, 3, 2.6),
            titleMultiplier: clamp(decor.titleMultiplier, 1.1, 2, 1.45),
            contentMultiplier: clamp(decor.contentMultiplier, 0.9, 1.6, 1.15),
        };
    }
    return {
        ...decor,
        intensity: clamp(decor.intensity, 1, 3, THEME_TOKEN_DEFAULTS.decor.intensity),
        titleMultiplier: clamp(decor.titleMultiplier, 0.8, 2, THEME_TOKEN_DEFAULTS.decor.titleMultiplier),
        contentMultiplier: clamp(decor.contentMultiplier, 0.6, 1.6, THEME_TOKEN_DEFAULTS.decor.contentMultiplier),
    };
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

    const normalizedDecorRaw = {
        presetPack: ALLOWED_PRESET_PACKS.has(String(merged.decor.presetPack))
            ? String(merged.decor.presetPack)
            : THEME_TOKEN_DEFAULTS.decor.presetPack,
        intensity: clamp(merged.decor.intensity, 1, 3, THEME_TOKEN_DEFAULTS.decor.intensity),
        safeZoneAlpha: clamp(merged.decor.safeZoneAlpha, 0, 0.35, THEME_TOKEN_DEFAULTS.decor.safeZoneAlpha),
        titleMultiplier: clamp(merged.decor.titleMultiplier, 0.8, 2, THEME_TOKEN_DEFAULTS.decor.titleMultiplier),
        contentMultiplier: clamp(merged.decor.contentMultiplier, 0.6, 1.6, THEME_TOKEN_DEFAULTS.decor.contentMultiplier),
        gridEnabled: merged.decor.gridEnabled !== false,
        textGlowEnabled: merged.decor.textGlowEnabled !== false,
        cardShadowEnabled: merged.decor.cardShadowEnabled !== false,
        tableShadowEnabled: merged.decor.tableShadowEnabled !== false,
        chartShadowEnabled: merged.decor.chartShadowEnabled !== false,
        imageShadowEnabled: merged.decor.imageShadowEnabled !== false,
        logoEnabled: merged.decor.logoEnabled !== false,
        logoText: String(merged.decor.logoText || THEME_TOKEN_DEFAULTS.decor.logoText).trim().slice(0, 32) || THEME_TOKEN_DEFAULTS.decor.logoText,
        logoImageUrl: String(merged.decor.logoImageUrl || '').trim().slice(0, MAX_LOGO_IMAGE_URL_LENGTH),
        serviceTag: String(merged.decor.serviceTag || THEME_TOKEN_DEFAULTS.decor.serviceTag).trim().slice(0, 42),
        logoAnchor: ALLOWED_DECOR_ANCHORS.has(String(merged.decor.logoAnchor))
            ? String(merged.decor.logoAnchor)
            : THEME_TOKEN_DEFAULTS.decor.logoAnchor,
        logoSize: clamp(merged.decor.logoSize, 10, 36, THEME_TOKEN_DEFAULTS.decor.logoSize),
        logoOpacity: clamp(merged.decor.logoOpacity, 0.2, 1, THEME_TOKEN_DEFAULTS.decor.logoOpacity),
        badgeVariant: ALLOWED_BADGE_VARIANTS.has(String(merged.decor.badgeVariant))
            ? String(merged.decor.badgeVariant)
            : THEME_TOKEN_DEFAULTS.decor.badgeVariant,
        badgeOnTitle: merged.decor.badgeOnTitle !== false,
        badgeOnContent: merged.decor.badgeOnContent !== false,
        shapeLeftLineEnabled: merged.decor.shapeLeftLineEnabled !== false,
        shapeLeftLineAnchor: ALLOWED_LEFT_LINE_ANCHORS.has(String(merged.decor.shapeLeftLineAnchor))
            ? String(merged.decor.shapeLeftLineAnchor)
            : THEME_TOKEN_DEFAULTS.decor.shapeLeftLineAnchor,
        shapeLeftLineSize: clamp(merged.decor.shapeLeftLineSize, 0.4, 1.8, THEME_TOKEN_DEFAULTS.decor.shapeLeftLineSize),
        shapeLeftLineOpacity: clamp(merged.decor.shapeLeftLineOpacity, 0, 1, THEME_TOKEN_DEFAULTS.decor.shapeLeftLineOpacity),
        shapeTriangleEnabled: merged.decor.shapeTriangleEnabled !== false,
        shapeTriangleAnchor: ALLOWED_TRIANGLE_ANCHORS.has(String(merged.decor.shapeTriangleAnchor))
            ? String(merged.decor.shapeTriangleAnchor)
            : THEME_TOKEN_DEFAULTS.decor.shapeTriangleAnchor,
        shapeTriangleSize: clamp(merged.decor.shapeTriangleSize, 0.4, 1.8, THEME_TOKEN_DEFAULTS.decor.shapeTriangleSize),
        shapeTriangleOpacity: clamp(merged.decor.shapeTriangleOpacity, 0, 1, THEME_TOKEN_DEFAULTS.decor.shapeTriangleOpacity),
        shapeBlobEnabled: merged.decor.shapeBlobEnabled !== false,
        shapeBlobAnchor: ALLOWED_BLOB_ANCHORS.has(String(merged.decor.shapeBlobAnchor))
            ? String(merged.decor.shapeBlobAnchor)
            : THEME_TOKEN_DEFAULTS.decor.shapeBlobAnchor,
        shapeBlobSize: clamp(merged.decor.shapeBlobSize, 0.4, 1.8, THEME_TOKEN_DEFAULTS.decor.shapeBlobSize),
        shapeBlobOpacity: clamp(merged.decor.shapeBlobOpacity, 0, 1, THEME_TOKEN_DEFAULTS.decor.shapeBlobOpacity),
    };
    const adjustedDecor = resolvePresetAdjustedDecor(normalizedDecorRaw);

    const normalized = {
        color: {
            bgCanvas: isHexColor(merged.color.bgCanvas) ? merged.color.bgCanvas : THEME_TOKEN_DEFAULTS.color.bgCanvas,
            textPrimary: isHexColor(merged.color.textPrimary) ? merged.color.textPrimary : THEME_TOKEN_DEFAULTS.color.textPrimary,
            accent: isHexColor(merged.color.accent) ? merged.color.accent : THEME_TOKEN_DEFAULTS.color.accent,
            accentSecondary: isHexColor(merged.color.accentSecondary) ? merged.color.accentSecondary : THEME_TOKEN_DEFAULTS.color.accentSecondary,
            success: isHexColor(merged.color.success) ? merged.color.success : THEME_TOKEN_DEFAULTS.color.success,
            warn: isHexColor(merged.color.warn) ? merged.color.warn : THEME_TOKEN_DEFAULTS.color.warn,
            info: isHexColor(merged.color.info) ? merged.color.info : THEME_TOKEN_DEFAULTS.color.info,
        },
        typography: {
            titleSize: clamp(merged.typography.titleSize, 18, 96, THEME_TOKEN_DEFAULTS.typography.titleSize),
            subtitleSize: clamp(merged.typography.subtitleSize, 12, 72, THEME_TOKEN_DEFAULTS.typography.subtitleSize),
            bodySize: clamp(merged.typography.bodySize, 10, 48, THEME_TOKEN_DEFAULTS.typography.bodySize),
            lineHeight: clamp(merged.typography.lineHeight, 1, 2.2, THEME_TOKEN_DEFAULTS.typography.lineHeight),
            profile: ALLOWED_TYPO_PROFILES.has(String(merged.typography.profile))
                ? String(merged.typography.profile)
                : THEME_TOKEN_DEFAULTS.typography.profile,
        },
        spacing: {
            radius: clamp(merged.spacing.radius, 0, 48, THEME_TOKEN_DEFAULTS.spacing.radius),
            borderWidth: clamp(merged.spacing.borderWidth, 0, 12, THEME_TOKEN_DEFAULTS.spacing.borderWidth),
        },
        chart: {
            palette: Array.isArray(merged.chart.palette)
                ? merged.chart.palette.filter(isHexColor).slice(0, 4)
                : THEME_TOKEN_DEFAULTS.chart.palette.slice(),
            mode: ALLOWED_CHART_MODES.has(String(merged.chart.mode))
                ? String(merged.chart.mode)
                : THEME_TOKEN_DEFAULTS.chart.mode,
        },
        table: {
            headerBg: isHexColor(merged.table.headerBg) ? merged.table.headerBg : THEME_TOKEN_DEFAULTS.table.headerBg,
            headerText: isHexColor(merged.table.headerText) ? merged.table.headerText : THEME_TOKEN_DEFAULTS.table.headerText,
            mode: ALLOWED_TABLE_MODES.has(String(merged.table.mode))
                ? String(merged.table.mode)
                : THEME_TOKEN_DEFAULTS.table.mode,
        },
        decor: adjustedDecor,
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
