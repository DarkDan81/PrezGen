function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatMetricValue(raw) {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
        return formatCompactNumber(raw);
    }

    const asText = String(raw ?? '').trim();
    if (!asText) return '';

    const parsed = parseFlexibleNumber(asText);
    if (!Number.isFinite(parsed)) return asText;
    return formatCompactNumber(parsed);
}

function parseFlexibleNumber(text) {
    const cleaned = String(text || '')
        .trim()
        .replace(/[\s\u00A0]/g, '')
        .replace(/[₽$€£]/g, '');

    if (!cleaned) return NaN;
    if (!/^-?[\d.,]+$/.test(cleaned)) return NaN;

    const hasComma = cleaned.includes(',');
    const hasDot = cleaned.includes('.');

    if (hasComma && hasDot) {
        const lastComma = cleaned.lastIndexOf(',');
        const lastDot = cleaned.lastIndexOf('.');
        const decimalSep = lastComma > lastDot ? ',' : '.';
        const thousandSep = decimalSep === ',' ? '.' : ',';
        const normalized = cleaned.split(thousandSep).join('').replace(decimalSep, '.');
        return Number(normalized);
    }

    if (hasComma) {
        const parts = cleaned.split(',');
        if (parts.length > 2) return Number(parts.join(''));
        const [left, right] = parts;
        if (right && right.length === 3) return Number(`${left}${right}`);
        return Number(`${left}.${right || ''}`);
    }

    if (hasDot) {
        const parts = cleaned.split('.');
        if (parts.length > 2) return Number(parts.join(''));
        const [left, right] = parts;
        if (right && right.length === 3) return Number(`${left}${right}`);
        return Number(cleaned);
    }

    return Number(cleaned);
}

function formatCompactNumber(num) {
    if (!Number.isFinite(num)) return '';
    const abs = Math.abs(num);

    const formatCompact = (value, suffix) => {
        const short = Math.round(value * 10) / 10;
        const text = Number.isInteger(short)
            ? short.toLocaleString('ru-RU')
            : short.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        return `${text} ${suffix}`;
    };

    if (abs >= 1_000_000_000_000) return formatCompact(num / 1_000_000_000_000, 'трлн');
    if (abs >= 1_000_000_000) return formatCompact(num / 1_000_000_000, 'млрд');
    if (abs >= 1_000_000) return formatCompact(num / 1_000_000, 'млн');

    return num.toLocaleString('ru-RU');
}

function pickValueFontSize(valueText) {
    const length = String(valueText ?? '').trim().length;
    if (length <= 6) return 54;
    if (length <= 8) return 48;
    if (length <= 10) return 42;
    if (length <= 12) return 36;
    return 32;
}

module.exports = (block) => {
    const style = `style="flex: ${block.flexWidth || 1}"`;
    const cards = Array.isArray(block.kpi_cards) ? block.kpi_cards : [];
    const count = cards.length;
    const columns = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;
    const rows = Math.max(1, Math.ceil(Math.max(count, 1) / columns));
    const gridStyle = `style="--kpi-cols:${columns}; --kpi-rows:${rows}"`;

    const cardsHtml = cards.map((kpi) => {
        const label = escapeHtml(kpi?.label || '');
        const normalizedValue = formatMetricValue(kpi?.value);
        const value = escapeHtml(normalizedValue);
        const unit = escapeHtml(kpi?.unit || '');
        const growthRaw = String(kpi?.growth || '').trim();
        const isNegative = growthRaw.startsWith('-');
        const growthColor = isNegative ? 'var(--pg-warn, #ff626f)' : 'var(--pg-success, #37d67a)';
        const arrow = isNegative ? 'v' : '^';
        const valueFontSize = pickValueFontSize(normalizedValue);

        return `
            <div class="kpi-card">
                <div class="label">${label}</div>
                <div class="kpi-value-row">
                    <span class="value" style="font-size:${valueFontSize}px">${value}</span>
                    <span class="unit">${unit}</span>
                </div>
                ${growthRaw ? `<div class="growth" style="color: ${growthColor}">${arrow} ${escapeHtml(growthRaw)}</div>` : ''}
            </div>
        `;
    }).join('');

    return `
        <div class="block-wrapper kpi-wrapper" data-block-id="${escapeHtml(block._blockId || '')}" data-block-type="${escapeHtml(block._blockType || '')}" ${style}>
            <div class="kpi-grid-auto" data-kpi-count="${count}" ${gridStyle}>${cardsHtml}</div>
        </div>
    `;
};
