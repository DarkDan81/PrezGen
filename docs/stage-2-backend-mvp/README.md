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

Run:

```bash
npm run api
```

Default API port:

- `3100` (`API_PORT` env can override).

Data file:

- `data/prezgen.sqlite` (ignored by git).
