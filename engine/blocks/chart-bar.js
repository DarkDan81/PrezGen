module.exports = (block) => {
    const c = block.chart;
    const headers = block.headers;
    const style = `style="flex: ${block.flexWidth || 1}"`;
    const parseNum = (v) => parseFloat(v?.toString().replace(/\s/g, '').replace(',', '.')) || 0;

    const categoryKey = headers[1]; 
    
    let rows = block.data;
    if (c.series && c.series.length > 0) {
        rows = rows.filter(r => c.series.includes(r[categoryKey]));
    }

    const activeCols = headers.slice(2).filter(col => 
        rows.some(r => r[col] && r[col].toString().trim() !== "")
    );

    const chartConfig = {
        showLabels: c.show_labels !== false,
        shorten: c.shorten === true, // ПЕРЕДАЕМ ФЛАГ
        data: {
            labels: activeCols,
            datasets: rows.map((row, idx) => ({
                label: row[categoryKey],
                data: activeCols.map(col => parseNum(row[col])),
                backgroundColor: activeCols.map(col => {
                    const val = parseNum(row[col]);
                    if (val < 0) return '#A7A9AC';
                    return idx % 2 === 0 ? '#8CC63F' : '#528220';
                }),
                borderRadius: 5
            }))
        }
    };

    return `<div class="block-wrapper chart-block" ${style}>
        <canvas data-type="bar" data-config='${JSON.stringify(chartConfig).replace(/'/g, "&apos;")}'></canvas>
    </div>`;
};