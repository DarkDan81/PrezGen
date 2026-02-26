# Stage 2 - Backend MVP Slice

This stage starts implementation from the Stage 1 contract.

Implemented in first slice:

1. SQLite bootstrap and migration.
2. API app scaffold with envelope/error format.
3. Endpoints:
   - `POST /api/v1/presentations`
   - `GET /api/v1/presentations`
   - `POST /api/v1/presentations/:presentationId/slides`
4. Health endpoint:
   - `GET /api/v1/health`

Implemented in second slice:

1. Presentation details:
   - `GET /api/v1/presentations/:presentationId`
   - `PATCH /api/v1/presentations/:presentationId`
2. Slide reorder:
   - `POST /api/v1/presentations/:presentationId/slides/reorder`
3. Datasets (manual table):
   - `POST /api/v1/presentations/:presentationId/datasets`
   - `GET /api/v1/presentations/:presentationId/datasets`
   - `GET /api/v1/datasets/:datasetId`

Current limitation in this slice:

- Dataset upload via CSV endpoint is not implemented yet (manual table only).

Implemented in third slice:

1. Blocks CRUD:
   - `POST /api/v1/slides/:slideId/blocks`
   - `GET /api/v1/slides/:slideId/blocks`
   - `GET /api/v1/blocks/:blockId`
   - `PATCH /api/v1/blocks/:blockId`
   - `DELETE /api/v1/blocks/:blockId`
2. Block reorder:
   - `POST /api/v1/slides/:slideId/blocks/reorder`

Implemented in fourth slice:

1. Slides full CRUD:
   - `GET /api/v1/presentations/:presentationId/slides`
   - `GET /api/v1/slides/:slideId`
   - `PATCH /api/v1/slides/:slideId`
   - `DELETE /api/v1/slides/:slideId`

Implemented in fifth slice:

1. Themes read endpoints:
   - `GET /api/v1/themes`
   - `GET /api/v1/themes/:themeId`
2. Preview endpoints:
   - `POST /api/v1/presentations/:presentationId/render/preview`
   - `GET /api/v1/preview/:presentationId`

Preview note:

- Current preview is generated from DB entities and rendered via existing HTML slide builder.
- MVP shape is functional for constructor flows; visual parity improvements can be done in next slices.

Implemented in sixth slice:

1. Async PDF export endpoints:
   - `POST /api/v1/presentations/:presentationId/render/pdf`
   - `GET /api/v1/render-jobs/:jobId`
2. `render_jobs` persistence and background queue.
3. PDF artifacts served from `/dist/export/...`.

Implemented in seventh slice:

1. Unified render pipeline module:
   - `backend/render/model-builder.js`
   - block adapters in `backend/render/adapters/*`
2. Preview/PDF now rely on the shared pipeline (`DB -> RenderModel -> HTML/PDF`).
3. Legacy YAML parser is no longer part of backend preview/pdf path.

Implemented in eighth slice:

1. CSV dataset upload endpoint:
   - `POST /api/v1/presentations/:presentationId/datasets/upload-csv`
2. Strong block config validation by type (`chart`, `table`, `kpi`, `text`, `image`).
3. API smoke script:
   - `npm run api:smoke`

Implemented in ninth slice:

1. Text HTML sanitization on block write and render path.
2. Extended verification script:
   - `npm run api:verify`
   - covers validation errors + sanitizer behavior + preview/pdf path.

Implemented in tenth slice:

1. Dataset edit/delete endpoints:
   - `PATCH /api/v1/datasets/:datasetId`
   - `DELETE /api/v1/datasets/:datasetId`
2. Presentation image upload endpoint:
   - `POST /api/v1/presentations/:presentationId/assets/upload-image`
   - accepts `multipart/form-data` (`file`)
   - stores files in `data/presentations/:presentationId/assets`
   - returns URL under `/content/presentations/:presentationId/assets/...`
3. Static content serving:
   - `/content/*` now serves files from project `data/` directory.

Implemented in layout stabilization update:

1. Deterministic render limits in adapters:
   - charts capped by points/series;
   - tables capped by rows/columns;
   - KPI cards capped by item count.
2. Stronger block-config validation limits for:
   - `chart.limit`, `table.limit`, `table.columns`, `kpi.limit`, `kpi.items`, `text.html`.
3. Preview/PDF HTML rendering path simplified:
   - removed runtime auto-fit loops/timers from active `engine/slide-builder.js`;
   - moved to predictable compact-mode CSS + fixed chart options.
4. Dataset row filtering support for visual blocks:
   - chart adapter supports optional `filterField` + `filterValues`.
   - KPI adapter (dataset mode) supports optional `filterField` + `filterValues`.
   - validation updated to enforce schema for these fields.
5. Table rendering improvements:
   - table headers resolve from dataset column labels (with safe dedup fallback).
   - table config validation includes `transpose` boolean and optional `parameterLabel`.
   - transpose path now uses resolved display headers consistently (fixes mixed key/label transpose output).

Run:

```bash
npm run api
```

Default API port:

- `3100` (`API_PORT` env can override).

Data file:

- `data/prezgen.sqlite` (ignored by git).
