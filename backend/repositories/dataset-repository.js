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

function updateDatasetById(datasetId, patch) {
    const db = getDb();
    const clauses = [];
    const params = { id: datasetId };

    if (patch.name !== undefined) {
        clauses.push('name = @name');
        params.name = patch.name;
    }
    if (patch.columns !== undefined) {
        clauses.push('columns_json = @columns_json');
        params.columns_json = JSON.stringify(patch.columns || []);
    }
    if (patch.rows !== undefined) {
        clauses.push('rows_json = @rows_json');
        params.rows_json = JSON.stringify(patch.rows || []);
    }
    if (patch.meta !== undefined) {
        clauses.push('meta_json = @meta_json');
        params.meta_json = patch.meta ? JSON.stringify(patch.meta) : null;
    }

    clauses.push('updated_at = @updated_at');
    params.updated_at = patch.updatedAt;

    db.prepare(`UPDATE datasets SET ${clauses.join(', ')} WHERE id = @id`).run(params);
    return getDatasetById(datasetId);
}

function deleteDatasetById(datasetId) {
    const db = getDb();
    return db.prepare('DELETE FROM datasets WHERE id = ?').run(datasetId).changes > 0;
}

module.exports = {
    createDataset,
    deleteDatasetById,
    getDatasetById,
    listDatasetsByPresentation,
    updateDatasetById,
};
