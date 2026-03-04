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

function tryParseWithDelimiter(raw, delimiter) {
    try {
        const records = parse(raw, {
            columns: true,
            delimiter,
            skip_empty_lines: true,
            bom: true,
            relax_quotes: true,
        });
        if (!Array.isArray(records) || records.length === 0) return null;
        const headerKeys = Object.keys(records[0] || {});
        if (!headerKeys.length) return null;

        // Score heuristic:
        // - prefer parses with more columns
        // - prefer parses with stable object shape across rows
        const expectedCount = headerKeys.length;
        const consistentRows = records.reduce((acc, row) => {
            const count = Object.keys(row || {}).length;
            return acc + (count === expectedCount ? 1 : 0);
        }, 0);
        const score = expectedCount * 1000 + consistentRows;

        return { delimiter, records, headerKeys, score };
    } catch {
        return null;
    }
}

function parseCsvRecordsAuto(raw) {
    const candidates = [';', ',', '\t'];
    const parsed = candidates
        .map((delimiter) => tryParseWithDelimiter(raw, delimiter))
        .filter(Boolean);

    if (!parsed.length) return [];

    parsed.sort((a, b) => b.score - a.score);
    return parsed[0].records;
}

function parseCsvToDatasetShape(buffer) {
    const raw = buffer.toString('utf8');
    const records = parseCsvRecordsAuto(raw);

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

