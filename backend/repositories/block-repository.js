const { getDb } = require('../db/connection');

function mapBlock(row) {
    return {
        id: row.id,
        presentationId: row.presentation_id,
        slideId: row.slide_id,
        order: row.order,
        type: row.type,
        layout: row.layout_json ? JSON.parse(row.layout_json) : null,
        config: JSON.parse(row.config_json),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function createBlock(block) {
    const db = getDb();
    db.prepare(`
        INSERT INTO blocks (
            id, presentation_id, slide_id, "order", type, layout_json, config_json, created_at, updated_at
        ) VALUES (
            @id, @presentation_id, @slide_id, @order, @type, @layout_json, @config_json, @created_at, @updated_at
        )
    `).run({
        id: block.id,
        presentation_id: block.presentationId,
        slide_id: block.slideId,
        order: block.order,
        type: block.type,
        layout_json: block.layout ? JSON.stringify(block.layout) : null,
        config_json: JSON.stringify(block.config),
        created_at: block.createdAt,
        updated_at: block.updatedAt,
    });
    return block;
}

function listBlocksBySlide(slideId) {
    const db = getDb();
    return db.prepare('SELECT * FROM blocks WHERE slide_id = ? ORDER BY "order" ASC').all(slideId).map(mapBlock);
}

function getBlockById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM blocks WHERE id = ?').get(id);
    return row ? mapBlock(row) : null;
}

function getNextOrderForSlide(slideId) {
    const db = getDb();
    const row = db.prepare('SELECT COALESCE(MAX("order"), -1) AS max_order FROM blocks WHERE slide_id = ?').get(slideId);
    return row.max_order + 1;
}

function updateBlockById(id, patch) {
    const db = getDb();
    const clauses = [];
    const params = { id };

    if (patch.type !== undefined) {
        clauses.push('type = @type');
        params.type = patch.type;
    }
    if (patch.layout !== undefined) {
        clauses.push('layout_json = @layout_json');
        params.layout_json = patch.layout ? JSON.stringify(patch.layout) : null;
    }
    if (patch.config !== undefined) {
        clauses.push('config_json = @config_json');
        params.config_json = JSON.stringify(patch.config);
    }
    clauses.push('updated_at = @updated_at');
    params.updated_at = patch.updatedAt;

    db.prepare(`UPDATE blocks SET ${clauses.join(', ')} WHERE id = @id`).run(params);
    return getBlockById(id);
}

function deleteBlockById(id) {
    const db = getDb();
    return db.prepare('DELETE FROM blocks WHERE id = ?').run(id).changes > 0;
}

function reorderBlocks(slideId, blockIds, updatedAt) {
    const db = getDb();
    const idsSet = new Set(blockIds);
    const existing = listBlocksBySlide(slideId);
    if (existing.length !== blockIds.length) return false;
    if (existing.some((block) => !idsSet.has(block.id))) return false;

    const updateStmt = db.prepare(`
        UPDATE blocks
        SET "order" = @order, updated_at = @updated_at
        WHERE id = @id AND slide_id = @slide_id
    `);

    const tx = db.transaction(() => {
        blockIds.forEach((id, index) => {
            updateStmt.run({ id, order: index, updated_at: updatedAt, slide_id: slideId });
        });
    });
    tx();
    return true;
}

module.exports = {
    createBlock,
    deleteBlockById,
    getBlockById,
    getNextOrderForSlide,
    listBlocksBySlide,
    reorderBlocks,
    updateBlockById,
};

