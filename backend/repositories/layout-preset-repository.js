const { getDb } = require('../db/connection');

function mapLayoutPreset(row) {
    let schema = {};
    if (row.schema_json) {
        try {
            const parsed = JSON.parse(row.schema_json);
            schema = parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_error) {
            schema = {};
        }
    }

    return {
        id: row.id,
        name: row.name,
        nameKey: row.name_key || null,
        kind: row.kind,
        isSystem: row.is_system === 1,
        schema,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function listLayoutPresets() {
    const db = getDb();
    return db
        .prepare('SELECT * FROM layout_presets ORDER BY is_system DESC, name ASC')
        .all()
        .map(mapLayoutPreset);
}

function getLayoutPresetById(layoutPresetId) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM layout_presets WHERE id = ?').get(layoutPresetId);
    return row ? mapLayoutPreset(row) : null;
}

module.exports = {
    listLayoutPresets,
    getLayoutPresetById,
};
