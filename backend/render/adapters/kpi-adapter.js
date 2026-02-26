function kpiAdapter(block, dataset) {
    const config = block.config || {};
    if (config.mode === 'manual') {
        return {
            kpi_cards: Array.isArray(config.items) ? config.items : [],
        };
    }

    const rows = dataset.rows || [];
    const limit = Number(config.limit || rows.length);
    const cards = rows.slice(0, limit).map((row) => ({
        label: row[config.labelField],
        value: row[config.valueField],
        unit: config.unitField ? row[config.unitField] : '',
        growth: config.growthField ? row[config.growthField] : '',
    }));

    return {
        kpi_cards: cards,
    };
}

module.exports = { kpiAdapter };

