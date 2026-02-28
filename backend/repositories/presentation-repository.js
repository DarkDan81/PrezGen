const { getDb } = require('../db/connection');

function mapPresentation(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        themeId: row.theme_id,
        themeOverrides: row.theme_overrides ? JSON.parse(row.theme_overrides) : null,
        status: row.status,
        schemaVersion: row.schema_version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function createPresentation(presentation) {
    const db = getDb();
    db.prepare(`
        INSERT INTO presentations (
            id, name, description, theme_id, theme_overrides, status, schema_version, created_at, updated_at
        ) VALUES (
            @id, @name, @description, @theme_id, @theme_overrides, @status, @schema_version, @created_at, @updated_at
        );
    `).run({
        id: presentation.id,
        name: presentation.name,
        description: presentation.description || null,
        theme_id: presentation.themeId,
        theme_overrides: presentation.themeOverrides ? JSON.stringify(presentation.themeOverrides) : null,
        status: presentation.status,
        schema_version: presentation.schemaVersion,
        created_at: presentation.createdAt,
        updated_at: presentation.updatedAt,
    });

    return presentation;
}

function listPresentations({ status, q }) {
    const db = getDb();
    let sql = `SELECT * FROM presentations`;
    const clauses = [];
    const params = {};

    if (status) {
        clauses.push('status = @status');
        params.status = status;
    }
    if (q) {
        clauses.push('name LIKE @q');
        params.q = `%${q}%`;
    }
    if (clauses.length) {
        sql += ` WHERE ${clauses.join(' AND ')}`;
    }
    sql += ` ORDER BY updated_at DESC`;

    return db.prepare(sql).all(params).map(mapPresentation);
}

function getPresentationById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM presentations WHERE id = ?').get(id);
    return row ? mapPresentation(row) : null;
}

function updatePresentationById(id, patch) {
    const db = getDb();
    const clauses = [];
    const params = { id };

    if (patch.name !== undefined) {
        clauses.push('name = @name');
        params.name = patch.name;
    }
    if (patch.description !== undefined) {
        clauses.push('description = @description');
        params.description = patch.description;
    }
    if (patch.themeId !== undefined) {
        clauses.push('theme_id = @theme_id');
        params.theme_id = patch.themeId;
    }
    if (patch.themeOverrides !== undefined) {
        clauses.push('theme_overrides = @theme_overrides');
        params.theme_overrides = patch.themeOverrides ? JSON.stringify(patch.themeOverrides) : null;
    }
    if (patch.status !== undefined) {
        clauses.push('status = @status');
        params.status = patch.status;
    }
    clauses.push('updated_at = @updated_at');
    params.updated_at = patch.updatedAt;

    db.prepare(`UPDATE presentations SET ${clauses.join(', ')} WHERE id = @id`).run(params);
    return getPresentationById(id);
}

function deletePresentationById(id) {
    const db = getDb();
    return db.prepare('DELETE FROM presentations WHERE id = ?').run(id).changes > 0;
}

module.exports = {
    createPresentation,
    deletePresentationById,
    getPresentationById,
    listPresentations,
    updatePresentationById,
};
