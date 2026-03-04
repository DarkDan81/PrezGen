function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

module.exports = (block) => {
    const t = block.table || {};
    const compactClass = t.compact ? 'table-compact' : '';
    const style = `style="flex: ${block.flexWidth || 1}"`;
    const headers = Array.isArray(block.headers) ? block.headers : [];

    const formatVal = (v, isFirstColumn) => {
        if (v === null || v === undefined) return '';
        if (isFirstColumn) return v;

        const s = v.toString().trim();
        const n = parseFloat(s.replace(/\s/g, '').replace(',', '.'));
        if (Number.isNaN(n) || !/^-?\d+([.,]\d+)?$/.test(s.replace(/\s/g, ''))) return v;

        if (t.shorten && Math.abs(n) >= 1000000) {
            return `${(n / 1000000).toFixed(1)} mln`;
        }
        return n.toLocaleString('en-US');
    };

    const rowsHtml = (block.data || []).map((row) => {
        const cells = headers.map((header, index) => {
            const value = formatVal(row[header], index === 0);
            return `<td>${escapeHtml(value)}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    return `
        <div class="block-wrapper table-block ${compactClass}" data-block-id="${escapeHtml(block._blockId || '')}" data-block-type="${escapeHtml(block._blockType || '')}" ${style}>
            <table class="ef-table">
                <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>`;
};
