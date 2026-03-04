const MAX_KPI_CARDS = 24;

function clampPositiveInt(value, fallback, max) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.min(Math.floor(n), max);
}

function filterRows(rows, config) {
    const field = config.filterField;
    const values = Array.isArray(config.filterValues) ? config.filterValues.filter(Boolean) : [];
    if (!field || values.length === 0) return rows;
    const set = new Set(values.map((v) => String(v)));
    return rows.filter((row) => set.has(String(row[field] ?? '')));
}

function kpiAdapter(block, dataset) {
    const config = block.config || {};

    if (config.mode === 'manual') {
        const cards = Array.isArray(config.items) ? config.items.slice(0, MAX_KPI_CARDS) : [];
        return {
            kpi_cards: cards,
            kpi_compact: cards.length > 3,
        };
    }

    const rows = filterRows(dataset.rows || [], config);
    const limit = clampPositiveInt(config.limit, rows.length || MAX_KPI_CARDS, MAX_KPI_CARDS);
    const cards = rows.slice(0, limit).map((row) => ({
        label: row[config.labelField],
        value: row[config.valueField],
        unit: config.unitField ? row[config.unitField] : '',
        growth: config.growthField ? row[config.growthField] : '',
    }));

    return {
        kpi_cards: cards,
        kpi_compact: cards.length > 3,
    };
}

module.exports = { kpiAdapter };

