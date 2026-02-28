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

function validateThemeTokens(tokens) {
    const details = [];
    const warnings = [];

    if (!isPlainObject(tokens)) {
        details.push({ path: 'tokens', rule: 'object', message: 'tokens must be an object' });
        return { details, warnings };
    }

    const color = isPlainObject(tokens.color) ? tokens.color : {};
    const typography = isPlainObject(tokens.typography) ? tokens.typography : {};
    const spacing = isPlainObject(tokens.spacing) ? tokens.spacing : {};
    const chart = isPlainObject(tokens.chart) ? tokens.chart : {};
    const table = isPlainObject(tokens.table) ? tokens.table : {};

    ['bgCanvas', 'textPrimary', 'accent'].forEach((key) => {
        if (!isHexColor(color[key] || '')) {
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

    if (isHexColor(color.textPrimary) && isHexColor(color.bgCanvas)) {
        const ratio = contrastRatio(color.textPrimary, color.bgCanvas);
        if (ratio < 4.5) {
            warnings.push({
                path: 'tokens.color',
                rule: 'contrast',
                message: `textPrimary/bgCanvas contrast ratio is ${ratio.toFixed(2)} (< 4.5)`,
            });
        }
    }
    if (isHexColor(table.headerText || '') && isHexColor(table.headerBg || '')) {
        const ratio = contrastRatio(table.headerText, table.headerBg);
        if (ratio < 4.5) {
            warnings.push({
                path: 'tokens.table',
                rule: 'contrast',
                message: `table header text/background contrast ratio is ${ratio.toFixed(2)} (< 4.5)`,
            });
        }
    }

    return { details, warnings };
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
    validateLayoutBindingPayload,
    validateSlotAssignmentsAgainstLayout,
    validateThemeTokens,
};
