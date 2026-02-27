const { getDb } = require('./connection');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const THEMES_DIR = path.join(__dirname, '../../themes');

function hasColumn(db, tableName, columnName) {
    const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return rows.some((row) => row.name === columnName);
}

function ensureColumn(db, tableName, columnName, definitionSql) {
    if (hasColumn(db, tableName, columnName)) return;
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definitionSql}`);
}

function readThemeTokens(slug) {
    const themeYamlPath = path.join(THEMES_DIR, slug, 'theme.yaml');
    if (!fs.existsSync(themeYamlPath)) return {};
    try {
        const parsed = yaml.load(fs.readFileSync(themeYamlPath, 'utf8'));
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_error) {
        return {};
    }
}

function listSystemThemeSlugs() {
    if (!fs.existsSync(THEMES_DIR)) return [];
    return fs
        .readdirSync(THEMES_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((slug) => fs.existsSync(path.join(THEMES_DIR, slug, 'styles.css')));
}

function seedSystemThemes(db) {
    const now = new Date().toISOString();
    const slugs = listSystemThemeSlugs();
    const upsertTheme = db.prepare(`
        INSERT INTO themes (id, name, kind, is_system, base_theme_id, base_css_path, tokens_json, created_at, updated_at)
        VALUES (@id, @name, 'system', 1, NULL, @base_css_path, @tokens_json, @created_at, @updated_at)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            kind = excluded.kind,
            is_system = excluded.is_system,
            base_css_path = excluded.base_css_path,
            tokens_json = excluded.tokens_json,
            updated_at = excluded.updated_at
    `);

    slugs.forEach((slug) => {
        const themeId = `theme-${slug}`;
        upsertTheme.run({
            id: themeId,
            name: slug,
            base_css_path: `/themes/${slug}/styles.css`,
            tokens_json: JSON.stringify(readThemeTokens(slug)),
            created_at: now,
            updated_at: now,
        });
    });
}

function seedLayoutPresets(db) {
    const now = new Date().toISOString();
    const presets = [
        {
            id: 'layout-single-column',
            name: 'Single Column',
            schema: {
                grid: {
                    columns: '1fr',
                    rows: 'auto',
                    areas: ['main'],
                    gap: 20,
                },
                slots: [{ id: 'slot_main', area: 'main', allowedBlockTypes: ['text', 'image', 'chart', 'table', 'kpi'] }],
            },
        },
        {
            id: 'layout-two-columns',
            name: 'Two Columns',
            schema: {
                grid: {
                    columns: '1fr 1fr',
                    rows: 'auto',
                    areas: ['left right'],
                    gap: 20,
                },
                slots: [
                    { id: 'slot_left', area: 'left', allowedBlockTypes: ['text', 'image', 'chart', 'table', 'kpi'] },
                    { id: 'slot_right', area: 'right', allowedBlockTypes: ['text', 'image', 'chart', 'table', 'kpi'] },
                ],
            },
        },
        {
            id: 'layout-2x2-grid',
            name: '2x2 Grid',
            schema: {
                grid: {
                    columns: '1fr 1fr',
                    rows: '1fr 1fr',
                    areas: ['a b', 'c d'],
                    gap: 20,
                },
                slots: [
                    { id: 'slot_a', area: 'a', allowedBlockTypes: ['text', 'image', 'chart', 'table', 'kpi'] },
                    { id: 'slot_b', area: 'b', allowedBlockTypes: ['text', 'image', 'chart', 'table', 'kpi'] },
                    { id: 'slot_c', area: 'c', allowedBlockTypes: ['text', 'image', 'chart', 'table', 'kpi'] },
                    { id: 'slot_d', area: 'd', allowedBlockTypes: ['text', 'image', 'chart', 'table', 'kpi'] },
                ],
            },
        },
    ];

    const upsertPreset = db.prepare(`
        INSERT INTO layout_presets (id, name, kind, is_system, schema_json, created_at, updated_at)
        VALUES (@id, @name, 'system', 1, @schema_json, @created_at, @updated_at)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            kind = excluded.kind,
            is_system = excluded.is_system,
            schema_json = excluded.schema_json,
            updated_at = excluded.updated_at
    `);

    presets.forEach((preset) => {
        upsertPreset.run({
            id: preset.id,
            name: preset.name,
            schema_json: JSON.stringify(preset.schema),
            created_at: now,
            updated_at: now,
        });
    });
}

function migrate() {
    const db = getDb();

    db.exec(`
        CREATE TABLE IF NOT EXISTS presentations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            theme_id TEXT NOT NULL,
            theme_overrides TEXT,
            status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
            schema_version TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS slides (
            id TEXT PRIMARY KEY,
            presentation_id TEXT NOT NULL,
            "order" INTEGER NOT NULL CHECK ("order" >= 0),
            type TEXT NOT NULL CHECK (type IN ('title', 'content')),
            title TEXT,
            subtitle TEXT,
            notes TEXT,
            layout_preset_id TEXT,
            slot_assignments_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (presentation_id) REFERENCES presentations (id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_slides_presentation_order
        ON slides (presentation_id, "order");

        CREATE TABLE IF NOT EXISTS datasets (
            id TEXT PRIMARY KEY,
            presentation_id TEXT NOT NULL,
            name TEXT NOT NULL,
            source_type TEXT NOT NULL CHECK (source_type IN ('upload_csv', 'manual_table', 'api_future')),
            columns_json TEXT NOT NULL,
            rows_json TEXT NOT NULL,
            meta_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (presentation_id) REFERENCES presentations (id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_datasets_presentation
        ON datasets (presentation_id, created_at DESC);

        CREATE TABLE IF NOT EXISTS blocks (
            id TEXT PRIMARY KEY,
            presentation_id TEXT NOT NULL,
            slide_id TEXT NOT NULL,
            "order" INTEGER NOT NULL CHECK ("order" >= 0),
            type TEXT NOT NULL CHECK (type IN ('chart', 'table', 'kpi', 'text', 'image')),
            layout_json TEXT,
            config_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (presentation_id) REFERENCES presentations (id) ON DELETE CASCADE,
            FOREIGN KEY (slide_id) REFERENCES slides (id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_blocks_slide_order
        ON blocks (slide_id, "order");

        CREATE TABLE IF NOT EXISTS render_jobs (
            id TEXT PRIMARY KEY,
            presentation_id TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('preview_html', 'export_pdf', 'export_pptx_future')),
            status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'done', 'failed')),
            result_json TEXT,
            error_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (presentation_id) REFERENCES presentations (id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_render_jobs_presentation_created
        ON render_jobs (presentation_id, created_at DESC);

        CREATE TABLE IF NOT EXISTS themes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            kind TEXT NOT NULL CHECK (kind IN ('system', 'custom')),
            is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
            base_theme_id TEXT,
            base_css_path TEXT,
            tokens_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_themes_kind_name
        ON themes (kind, name);

        CREATE TABLE IF NOT EXISTS layout_presets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            kind TEXT NOT NULL CHECK (kind IN ('system', 'custom')),
            is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
            schema_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_layout_presets_kind_name
        ON layout_presets (kind, name);
    `);

    ensureColumn(db, 'slides', 'layout_preset_id', 'TEXT');
    ensureColumn(db, 'slides', 'slot_assignments_json', 'TEXT');

    seedSystemThemes(db);
    seedLayoutPresets(db);
}

module.exports = { migrate };
