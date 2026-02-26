module.exports = (block) => {
    const style = `style="flex: ${block.flexWidth || 1}"`;
    const rows = block.data || [];
    const headers = block.headers || [];
    
    let cards = [];
    let isManual = false;

    // 1. ОПРЕДЕЛЯЕМ ИСТОЧНИК ДАННЫХ
    if (block.kpi_cards && block.kpi_cards.from_csv) {
        const config = block.kpi_cards;
        const categoryCols = headers.filter(h => 
            h !== 'Group' && h !== 'Показатель' && isNaN(parseInt(h)) && h.length > 2
        );
        const latestRow = rows[rows.length - 1] || {};
        cards = categoryCols.map(cat => ({
            label: cat,
            value: latestRow[cat],
            unit: config.unit || ''
        })).filter(c => c.value !== undefined);
        if (config.limit) cards = cards.slice(0, config.limit);
    } else {
        // РУЧНОЙ РЕЖИМ (из YAML)
        cards = Array.isArray(block.kpi_cards) ? block.kpi_cards : [];
        isManual = true; 
    }

    const isVertical = block.isVertical;
    const count = cards.length;
    let gridClasses = isVertical ? 'kpi-grid-vertical' : 'kpi-grid-horizontal';
    if (count > 2) gridClasses += ' compact';

    const cardsHtml = cards.map(k => {
        let displayVal = k.value;

        // УМНОЕ ФОРМАТИРОВАНИЕ
        if (isManual) {
            // В ручном режиме форматируем ТОЛЬКО если это просто число без лишних знаков
            // (чтобы время 00:40:05 не превращалось в 0)
            const raw = k.value?.toString().replace(/\s/g, '');
            const isPureNumber = /^-?\d+([.,]\d+)?$/.test(raw);
            
            if (isPureNumber) {
                const num = parseFloat(raw.replace(',', '.'));
                displayVal = num.toLocaleString('ru-RU');
            } else {
                displayVal = k.value; // Выводим "как есть" (для времени, текста и т.д.)
            }
        } else {
            // В режиме CSV (авто) форматируем всё что похоже на числа
            const num = parseFloat(k.value?.toString().replace(/\s/g, '').replace(',', '.'));
            if (!isNaN(num)) displayVal = num.toLocaleString('ru-RU');
        }

        const isNegative = k.growth && k.growth.includes('-');
        const growthColor = isNegative ? 'var(--ef-red)' : 'var(--ef-green)';
        const arrow = isNegative ? '▼' : '▲';

        return `
            <div class="kpi-card">
                <div class="label">${k.label}</div>
                <div class="kpi-value-row">
                    <span class="value">${displayVal}</span>
                    <span class="unit">${k.unit || ''}</span>
                </div>
                ${k.growth ? `<div class="growth" style="color: ${growthColor}">${arrow} ${k.growth}</div>` : ''}
            </div>
        `;
    }).join('');

    return `<div class="block-wrapper kpi-wrapper" ${style}><div class="${gridClasses}">${cardsHtml}</div></div>`;
};