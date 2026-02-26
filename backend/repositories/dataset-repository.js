const { getDb } = require('../db/connection');

function mapDataset(row) {
    return {
        id: row.id,
        presentationId: row.presentation_id,
        name: row.name,
        sourceType: row.source_type,
        columns: JSON.parse(row.columns_json),
        rows: JSON.parse(row.rows_json),
        meta: row.meta_json ? JSON.parse(row.meta_json) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function createDataset(dataset) {
    const db = getDb();
    db.prepare(`
        INSERT INTO datasets (
            id, presentation_id, name, source_type, columns_json, rows_json, meta_json, created_at, updated_at
        ) VALUES (
            @id, @presentation_id, @name, @source_type, @columns_json, @rows_json, @meta_json, @created_at, @updated_at
        );
    `).run({
        id: dataset.id,
        presentation_id: dataset.presentationId,
        name: dataset.name,
        source_type: dataset.sourceType,
        columns_json: JSON.stringify(dataset.columns || []),
        rows_json: JSON.stringify(dataset.rows || []),
        meta_json: dataset.meta ? JSON.stringify(dataset.meta) : null,
        created_at: dataset.createdAt,
        updated_at: dataset.updatedAt,
    });
    return dataset;
}

function listDatasetsByPresentation(presentationId) {
    const db = getDb();
    return db
        .prepare('SELECT * FROM datasets WHERE presentation_id = ? ORDER BY created_at DESC')
        .all(presentationId)
        .map(mapDataset);
}

function getDatasetById(datasetId) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM datasets WHERE id = ?').get(datasetId);
    return row ? mapDataset(row) : null;
}

module.exports = {
    createDataset,
    getDatasetById,
    listDatasetsByPresentation,
};

