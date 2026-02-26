const { getDb } = require('../db/connection');

function mapSlide(row) {
    return {
        id: row.id,
        presentationId: row.presentation_id,
        order: row.order,
        type: row.type,
        title: row.title,
        subtitle: row.subtitle,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function createSlide(slide) {
    const db = getDb();
    db.prepare(`
        INSERT INTO slides (
            id, presentation_id, "order", type, title, subtitle, notes, created_at, updated_at
        ) VALUES (
            @id, @presentation_id, @order, @type, @title, @subtitle, @notes, @created_at, @updated_at
        );
    `).run({
        id: slide.id,
        presentation_id: slide.presentationId,
        order: slide.order,
        type: slide.type,
        title: slide.title || null,
        subtitle: slide.subtitle || null,
        notes: slide.notes || null,
        created_at: slide.createdAt,
        updated_at: slide.updatedAt,
    });

    return slide;
}

function getNextOrderForPresentation(presentationId) {
    const db = getDb();
    const row = db
        .prepare('SELECT COALESCE(MAX("order"), -1) AS max_order FROM slides WHERE presentation_id = ?')
        .get(presentationId);
    return row.max_order + 1;
}

function listSlidesByPresentation(presentationId) {
    const db = getDb();
    return db
        .prepare('SELECT * FROM slides WHERE presentation_id = ? ORDER BY "order" ASC')
        .all(presentationId)
        .map(mapSlide);
}

function reorderSlides(presentationId, slideIds, updatedAt) {
    const db = getDb();
    const idsSet = new Set(slideIds);
    const existingSlides = listSlidesByPresentation(presentationId);
    if (existingSlides.length !== slideIds.length) {
        return false;
    }
    if (existingSlides.some((slide) => !idsSet.has(slide.id))) {
        return false;
    }

    const updateStmt = db.prepare(`
        UPDATE slides
        SET "order" = @order, updated_at = @updated_at
        WHERE id = @id AND presentation_id = @presentation_id
    `);

    const tx = db.transaction(() => {
        slideIds.forEach((id, index) => {
            updateStmt.run({
                id,
                order: index,
                updated_at: updatedAt,
                presentation_id: presentationId,
            });
        });
    });
    tx();
    return true;
}

module.exports = {
    createSlide,
    getNextOrderForPresentation,
    mapSlide,
    listSlidesByPresentation,
    reorderSlides,
};
