const COLORS = ['#8CC63F', '#528220', '#F7BA00', '#00A1E4', '#854293', '#E32B22'];

module.exports = (block) => {
    const c = block.chart;
    const headers = block.headers;
    const style = `style="flex: ${block.flexWidth || 1}"`;
    const parseNum = (v) => {
        if (!v || v.toString().trim() === "") return null;
        return parseFloat(v.toString().replace(/\s/g, '').replace(',', '.')) || null;
    };

    const categoryKey = headers[1];
    let rows = block.data;
    if (c.series && c.series.length > 0) {
        rows = rows.filter(r => c.series.includes(r[categoryKey]));
    }

    const activeCols = headers.slice(2).filter(col => 
        rows.some(r => r[col] && r[col].toString().trim() !== "")
    );

    const chartConfig = {
        showLabels: c.show_labels === true,
        shorten: c.shorten === true, // ПЕРЕДАЕМ ФЛАГ
        data: {
            labels: activeCols,
            datasets: rows.map((row, i) => ({
                label: row[categoryKey],
                data: activeCols.map(col => parseNum(row[col])),
                borderColor: COLORS[i % COLORS.length],
                backgroundColor: COLORS[i % COLORS.length],
                borderWidth: 8,
                tension: 0.3,
                pointRadius: 6
            }))
        }
    };

    return `<div class="block-wrapper chart-block" ${style}>
        <canvas data-type="line" data-config='${JSON.stringify(chartConfig).replace(/'/g, "&apos;")}'></canvas>
    </div>`;
};