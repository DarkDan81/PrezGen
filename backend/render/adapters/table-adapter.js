const MAX_TABLE_COLUMNS = 8;
const MAX_TABLE_ROWS = 100;

function clampPositiveInt(value, fallback, max) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.min(Math.floor(n), max);
}

function getDisplayLabels(columns, datasetColumns) {
    const byKey = new Map((datasetColumns || []).map((c) => [c.key, c.label || c.key]));
    const used = new Set();
    return columns.map((key) => {
        const base = String(byKey.get(key) || key);
        if (!used.has(base)) {
            used.add(base);
            return base;
        }
        const deduped = `${base} (${key})`;
        used.add(deduped);
        return deduped;
    });
}

function transposeRows(headers, rows, firstColName) {
    const outHeaders = [firstColName, ...rows.map((r) => r[headers[0]] || '-')];
    const outRows = headers.slice(1).map((header) => {
        const row = { [firstColName]: header };
        rows.forEach((r, index) => {
            row[outHeaders[index + 1]] = r[header];
        });
        return row;
    });
    return { headers: outHeaders, rows: outRows };
}

function tableAdapter(block, dataset) {
    const config = block.config || {};
    const sourceRows = dataset.rows || [];
    const sourceColumns = (dataset.columns || []).map((c) => c.key);

    const columns = sourceColumns.slice(0, MAX_TABLE_COLUMNS);
    const rowLimit = clampPositiveInt(config.limit, 10, MAX_TABLE_ROWS);

    const rows = sourceRows.slice(0, rowLimit);

    const displayHeaders = getDisplayLabels(columns, dataset.columns);
    const normalizedRows = rows.map((source) => {
        const row = {};
        columns.forEach((columnKey, index) => {
            const displayHeader = displayHeaders[index];
            row[displayHeader] = source[columnKey];
        });
        return row;
    });

    let headers = displayHeaders;
    let data = normalizedRows;

    if (config.transpose === true && columns.length > 1) {
        const defaultParameterLabel = displayHeaders[0] || 'Parameter';
        const result = transposeRows(displayHeaders, normalizedRows, config.parameterLabel || defaultParameterLabel);
        headers = result.headers;
        data = result.rows;
    }

    return {
        table: {
            shorten: config.shorten === true,
            parameter_label: config.parameterLabel,
            compact: data.length > 9 || headers.length > 5,
        },
        headers,
        data,
    };
}

module.exports = { tableAdapter };
