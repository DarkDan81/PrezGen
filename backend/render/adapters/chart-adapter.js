const MAX_CHART_POINTS = 24;
const MAX_CATEGORY_SERIES = 6;
const MAX_LABEL_LENGTH = 28;

function toNumber(value) {
    const raw = `${value ?? ''}`.replace(/\s/g, '').replace(',', '.');
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
}

function clampPositiveInt(value, fallback, max) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.min(Math.floor(n), max);
}

function shortenLabel(value) {
    const text = String(value ?? '').trim();
    if (!text) return '';
    if (text.length <= MAX_LABEL_LENGTH) return text;
    return `${text.slice(0, MAX_LABEL_LENGTH - 3)}...`;
}

function filterRows(rows, config) {
    const field = config.filterField;
    const values = Array.isArray(config.filterValues) ? config.filterValues.filter(Boolean) : [];
    if (!field || values.length === 0) return rows;
    const set = new Set(values.map((v) => String(v)));
    return rows.filter((row) => set.has(String(row[field] ?? '')));
}

function toLineOrBar(block, dataset) {
    const config = block.config || {};
    const rows = filterRows(dataset.rows || [], config);
    const xField = config.xField;
    const valueField = config.valueField;
    const seriesField = config.seriesField;

    const labels = Array.from(new Set(rows.map((row) => shortenLabel(row[xField]))))
        .filter(Boolean)
        .slice(0, MAX_CHART_POINTS);

    const categoryKey = seriesField || 'Series';
    const categories = seriesField
        ? Array.from(new Set(rows.map((row) => shortenLabel(row[seriesField]))))
            .filter(Boolean)
            .slice(0, MAX_CATEGORY_SERIES)
        : ['Value'];

    const dataRows = categories.map((category) => {
        const item = { [categoryKey]: category };
        labels.forEach((label) => {
            const matched = rows.find((row) => {
                const xMatch = shortenLabel(row[xField]) === label;
                const seriesMatch = seriesField ? shortenLabel(row[seriesField]) === category : true;
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
    const rows = filterRows(dataset.rows || [], config);
    const xField = config.xField;
    const valueField = config.valueField;

    const requestedLimit = clampPositiveInt(config.limit, MAX_CHART_POINTS, MAX_CHART_POINTS);

    let items = rows
        .map((row) => ({
            label: shortenLabel(row[xField]),
            value: toNumber(row[valueField]),
        }))
        .filter((item) => item.label);

    items.sort((a, b) => b.value - a.value);

    if (items.length > requestedLimit) {
        const top = items.slice(0, requestedLimit);
        if (config.showOthers !== false) {
            const restValue = items.slice(requestedLimit).reduce((sum, item) => sum + item.value, 0);
            top.push({ label: 'Other', value: restValue });
        }
        items = top;
    }

    const row = { Metric: 'Value' };
    items.forEach((item) => {
        row[item.label] = item.value;
    });

    return {
        chart: {
            kind: 'horizontalBar',
            show_labels: config.showLabels !== false,
            show_others: config.showOthers !== false,
            shorten: config.shorten === true,
            limit: requestedLimit,
        },
        headers: ['Group', 'Metric', ...items.map((item) => item.label)],
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

