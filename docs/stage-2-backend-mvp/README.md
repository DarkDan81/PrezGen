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

Run:

```bash
npm run api
```

Default API port:

- `3100` (`API_PORT` env can override).

Data file:

- `data/prezgen.sqlite` (ignored by git).
