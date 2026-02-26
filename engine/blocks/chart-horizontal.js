module.exports = (block) => {
    const c = block.chart;
    const headers = block.headers;
    const style = `style="flex: ${block.flexWidth || 1}"`;
    const parseNum = (v) => parseFloat(v?.toString().replace(/\s/g, '').replace(',', '.')) || 0;

    let categoryCols = headers.filter(h => 
        h !== 'Group' && h !== 'Показатель' && isNaN(parseInt(h)) && h.length > 2
    );

    if (c.series && c.series.length > 0) {
        categoryCols = categoryCols.filter(cat => c.series.includes(cat));
    }

    const rows = block.data;
    const latestRow = rows[rows.length - 1] || {};

    let items = categoryCols.map(cat => ({
        label: cat,
        value: parseNum(latestRow[cat])
    })).filter(i => i.value !== 0).sort((a, b) => b.value - a.value);

    if (c.limit && items.length > c.limit) {
        const top = items.slice(0, c.limit);
        if (c.show_others !== false) {
            const othersSum = items.slice(c.limit).reduce((sum, i) => sum + i.value, 0);
            top.push({ label: 'ПРОЧИЕ', value: othersSum });
        }
        items = top;
    }

    const chartConfig = {
        showLabels: true,
        horizontal: true,
        largeLabels: true,
        shorten: c.shorten === true, // ПЕРЕДАЕМ ФЛАГ
        data: {
            labels: items.map(i => i.label),
            datasets: [{
                label: latestRow[headers[1]] || 'Значение',
                data: items.map(i => i.value),
                backgroundColor: items.map((_, idx) => idx % 2 === 0 ? '#8CC63F' : '#528220')
            }]
        }
    };

    return `<div class="block-wrapper chart-block" ${style}>
        <canvas data-type="bar" data-config='${JSON.stringify(chartConfig).replace(/'/g, "&apos;")}'></canvas>
    </div>`;
};