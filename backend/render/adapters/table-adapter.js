function transposeRows(headers, rows, firstColName) {
    const outHeaders = [firstColName, ...rows.map((r) => r[headers[0]] || '—')];
    const outRows = headers.slice(1).map((header) => {
        const row = { [firstColName]: header };
        rows.forEach((r, index) => {
            row[outHeaders[index + 1]] = r[header];
        });
        return row;
    });
    return { headers: outHeaders, rows: outRows };
}

function sortRows(rows, sort) {
    if (!sort?.by) return rows;
    const direction = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
        const av = a[sort.by];
        const bv = b[sort.by];
        if (av === bv) return 0;
        return av > bv ? direction : -direction;
    });
}

function tableAdapter(block, dataset) {
    const config = block.config || {};
    const sourceRows = dataset.rows || [];
    const columns = Array.isArray(config.columns) && config.columns.length
        ? config.columns
        : (dataset.columns || []).map((c) => c.key);

    let rows = sortRows(sourceRows, config.sort);
    if (config.limit) {
        rows = rows.slice(0, Number(config.limit));
    }

    const normalizedRows = rows.map((source) => {
        const row = {};
        columns.forEach((column) => {
            row[column] = source[column];
        });
        return row;
    });

    let headers = columns;
    let data = normalizedRows;

    if (config.transpose === true && columns.length > 1) {
        const result = transposeRows(columns, normalizedRows, config.parameterLabel || 'Parameter');
        headers = result.headers;
        data = result.rows;
    }

    return {
        table: {
            shorten: config.shorten === true,
            parameter_label: config.parameterLabel,
        },
        headers,
        data,
    };
}

module.exports = { tableAdapter };

