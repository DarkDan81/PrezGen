function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatMetricValue(raw) {
    const asText = String(raw ?? '').trim();
    if (!asText) return '';

    const normalized = asText.replace(/\s/g, '').replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(normalized)) return asText;

    const num = Number(normalized);
    if (!Number.isFinite(num)) return asText;
    return num.toLocaleString('en-US');
}

module.exports = (block) => {
    const style = `style="flex: ${block.flexWidth || 1}"`;
    const cards = Array.isArray(block.kpi_cards) ? block.kpi_cards : [];
    const isCompact = block.kpi_compact === true || cards.length > 3;
    const densityClass = cards.length >= 6 ? 'kpi-dense-6' : cards.length >= 4 ? 'kpi-dense-4' : '';
    const gridClass = cards.length > 2 ? `kpi-grid-horizontal compact ${densityClass}`.trim() : `kpi-grid-horizontal ${densityClass}`.trim();

    const cardsHtml = cards.map((kpi) => {
        const label = escapeHtml(kpi?.label || '');
        const value = escapeHtml(formatMetricValue(kpi?.value));
        const unit = escapeHtml(kpi?.unit || '');
        const growthRaw = String(kpi?.growth || '').trim();
        const isNegative = growthRaw.startsWith('-');
        const growthColor = isNegative ? 'var(--ef-red)' : 'var(--ef-green)';
        const arrow = isNegative ? 'v' : '^';

        return `
            <div class="kpi-card">
                <div class="label">${label}</div>
                <div class="kpi-value-row">
                    <span class="value">${value}</span>
                    <span class="unit">${unit}</span>
                </div>
                ${growthRaw ? `<div class="growth" style="color: ${growthColor}">${arrow} ${escapeHtml(growthRaw)}</div>` : ''}
            </div>
        `;
    }).join('');

    return `
        <div class="block-wrapper kpi-wrapper ${isCompact ? 'kpi-compact' : ''}" ${style}>
            <div class="${gridClass}" data-kpi-count="${cards.length}">${cardsHtml}</div>
        </div>
    `;
};
