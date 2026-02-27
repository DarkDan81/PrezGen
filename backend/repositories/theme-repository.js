const { getDb } = require('../db/connection');

function mapTheme(row) {
    let tokens = {};
    if (row.tokens_json) {
        try {
            const parsed = JSON.parse(row.tokens_json);
            tokens = parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_error) {
            tokens = {};
        }
    }

    return {
        id: row.id,
        name: row.name,
        kind: row.kind,
        isSystem: row.is_system === 1,
        baseThemeId: row.base_theme_id || null,
        baseCssPath: row.base_css_path || null,
        tokens,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function listThemesFromDb() {
    const db = getDb();
    return db
        .prepare('SELECT * FROM themes ORDER BY is_system DESC, name ASC')
        .all()
        .map(mapTheme);
}

function getThemeByIdFromDb(themeId) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM themes WHERE id = ?').get(themeId);
    return row ? mapTheme(row) : null;
}

function createTheme(theme) {
    const db = getDb();
    db.prepare(`
        INSERT INTO themes (
            id, name, kind, is_system, base_theme_id, base_css_path, tokens_json, created_at, updated_at
        ) VALUES (
            @id, @name, @kind, @is_system, @base_theme_id, @base_css_path, @tokens_json, @created_at, @updated_at
        )
    `).run({
        id: theme.id,
        name: theme.name,
        kind: theme.kind,
        is_system: theme.isSystem ? 1 : 0,
        base_theme_id: theme.baseThemeId || null,
        base_css_path: theme.baseCssPath || null,
        tokens_json: JSON.stringify(theme.tokens || {}),
        created_at: theme.createdAt,
        updated_at: theme.updatedAt,
    });
    return getThemeByIdFromDb(theme.id);
}

function updateThemeById(themeId, patch) {
    const db = getDb();
    const clauses = [];
    const params = { id: themeId };

    if (patch.name !== undefined) {
        clauses.push('name = @name');
        params.name = patch.name;
    }
    if (patch.baseThemeId !== undefined) {
        clauses.push('base_theme_id = @base_theme_id');
        params.base_theme_id = patch.baseThemeId || null;
    }
    if (patch.baseCssPath !== undefined) {
        clauses.push('base_css_path = @base_css_path');
        params.base_css_path = patch.baseCssPath || null;
    }
    if (patch.tokens !== undefined) {
        clauses.push('tokens_json = @tokens_json');
        params.tokens_json = JSON.stringify(patch.tokens || {});
    }

    clauses.push('updated_at = @updated_at');
    params.updated_at = patch.updatedAt;

    db.prepare(`UPDATE themes SET ${clauses.join(', ')} WHERE id = @id`).run(params);
    return getThemeByIdFromDb(themeId);
}

function deleteThemeById(themeId) {
    const db = getDb();
    return db.prepare('DELETE FROM themes WHERE id = ?').run(themeId).changes > 0;
}

module.exports = {
    createTheme,
    deleteThemeById,
    listThemesFromDb,
    getThemeByIdFromDb,
    updateThemeById,
};
