function toNumber(value) {
    const raw = `${value ?? ''}`.replace(/\s/g, '').replace(',', '.');
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
}

function toLineOrBar(block, dataset) {
    const config = block.config || {};
    const rows = dataset.rows || [];
    const xField = config.xField;
    const valueField = config.valueField;
    const seriesField = config.seriesField;

    const labels = Array.from(new Set(rows.map((row) => String(row[xField] ?? '')))).filter(Boolean);
    const categoryKey = seriesField || 'Series';
    const categories = seriesField
        ? Array.from(new Set(rows.map((row) => String(row[seriesField] ?? '')))).filter(Boolean)
        : ['Value'];

    const dataRows = categories.map((category) => {
        const item = { [categoryKey]: category };
        labels.forEach((label) => {
            const matched = rows.find((row) => {
                const xMatch = String(row[xField] ?? '') === label;
                const seriesMatch = seriesField ? String(row[seriesField] ?? '') === category : true;
                return xMatch && seriesMatch;
            });
            item[label] = matched ? matched[valueField] : '';
        });
        return item;
    });

    return {
        chart: {
            kind: config.kind || 'line',
            show_labels: config.showLabels !== false,
            shorten: config.shorten === true,
        },
        headers: ['Group', categoryKey, ...labels],
        data: dataRows,
    };
}

function toHorizontal(block, dataset) {
    const config = block.config || {};
    const rows = dataset.rows || [];
    const xField = config.xField;
    const valueField = config.valueField;

    let items = rows
        .map((row) => ({
            label: String(row[xField] ?? ''),
            value: toNumber(row[valueField]),
        }))
        .filter((item) => item.label);

    items.sort((a, b) => b.value - a.value);
    if (config.limit && items.length > Number(config.limit)) {
        const top = items.slice(0, Number(config.limit));
        if (config.showOthers !== false) {
            const restValue = items.slice(Number(config.limit)).reduce((sum, item) => sum + item.value, 0);
            top.push({ label: 'Прочие', value: restValue });
        }
        items = top;
    }

    const row = { 'Показатель': 'Value' };
    items.forEach((item) => {
        row[item.label] = item.value;
    });

    return {
        chart: {
            kind: 'horizontalBar',
            show_labels: config.showLabels !== false,
            show_others: config.showOthers !== false,
            shorten: config.shorten === true,
            limit: config.limit,
        },
        headers: ['Group', 'Показатель', ...items.map((item) => item.label)],
        data: [row],
    };
}

function chartAdapter(block, dataset) {
    const kind = block.config?.kind || 'line';
    if (kind === 'horizontalBar') {
        return toHorizontal(block, dataset);
    }
    return toLineOrBar(block, dataset);
}

module.exports = { chartAdapter };

