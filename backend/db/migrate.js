const { getDb } = require('./connection');

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
    `);
}

module.exports = { migrate };
