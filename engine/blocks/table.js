module.exports = (block) => {
    const t = block.table || {};
    const style = `style="flex: ${block.flexWidth || 1}"`;
    const headers = block.headers;

    const formatVal = (v, isFirstColumn) => {
        if (v === null || v === undefined) return '';
        
        // Если это название строки (первый столбец) — возвращаем как есть, без изменений
        if (isFirstColumn) return v;

        const s = v.toString().trim();
        const n = parseFloat(s.replace(/\s/g, '').replace(',', '.'));
        
        // Если это не число — не трогаем
        if (isNaN(n) || !/^-?\d+([.,]\d+)?$/.test(s.replace(/\s/g, ''))) return v;

        // ТВОЯ ЛОГИКА: сокращение до миллионов
        if (t.shorten && Math.abs(n) >= 1000000) {
            return (n / 1000000).toFixed(1) + ' млн';
        }
        // ТВОЯ ЛОГИКА: пробелы-разделители (1 000 000)
        return n.toLocaleString('ru-RU');
    };

    // Генерируем строки
    const rowsHtml = block.data.map(r => {
        return `<tr>${headers.map((h, index) => {
            // index === 0 означает, что это первая колонка (названия параметров)
            return `<td>${formatVal(r[h], index === 0)}</td>`;
        }).join('')}</tr>`;
    }).join('');

    return `
        <div class="block-wrapper table-block" ${style}>
            <table class="ef-table">
                <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>`;
};