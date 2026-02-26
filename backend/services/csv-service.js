const { parse } = require('csv-parse/sync');

function inferType(values) {
    const nonEmpty = values.filter((v) => v !== null && v !== undefined && `${v}`.trim() !== '');
    if (nonEmpty.length === 0) return 'string';

    const isNumber = nonEmpty.every((value) => {
        const n = Number(`${value}`.replace(/\s/g, '').replace(',', '.'));
        return Number.isFinite(n);
    });
    if (isNumber) return 'number';

    const isBoolean = nonEmpty.every((value) => {
        const v = `${value}`.toLowerCase();
        return v === 'true' || v === 'false' || v === '1' || v === '0';
    });
    if (isBoolean) return 'boolean';

    return 'string';
}

function parseCsvToDatasetShape(buffer) {
    const raw = buffer.toString('utf8');
    const records = parse(raw, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        relax_quotes: true,
    });

    if (!records.length) {
        return {
            columns: [],
            rows: [],
        };
    }

    const headerKeys = Object.keys(records[0]);
    const columns = headerKeys.map((key) => ({
        key,
        label: key,
        type: inferType(records.map((row) => row[key])),
        nullable: true,
    }));

    return {
        columns,
        rows: records,
    };
}

module.exports = { parseCsvToDatasetShape };

