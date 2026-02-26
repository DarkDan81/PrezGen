# API Contract (Stage 1)

Base path (proposal):

- `/api/v1`

All endpoints return envelope format defined in `schema-catalog.md`.

Auth note:

- Stage 1/MVP: no auth required.
- API must remain auth-ready (middleware-friendly route structure and stable resource IDs).

## Presentations

## Create Presentation

- `POST /api/v1/presentations`

Request:

```json
{
  "name": "Annual Report 2026",
  "description": "Draft",
  "themeId": "uuid"
}
```

Response:

- `201` + `Presentation`

## List Presentations

- `GET /api/v1/presentations`

Query params:

- `status` optional (`draft`, `published`, `archived`)
- `q` optional search by name

Response:

- `200` + `Presentation[]`

## Get Presentation

- `GET /api/v1/presentations/:presentationId`

Response:

- `200` + `Presentation`

## Update Presentation

- `PATCH /api/v1/presentations/:presentationId`

Request (partial):

```json
{
  "name": "Updated name",
  "themeId": "uuid",
  "themeOverrides": {
    "colorTextPrimary": "#202020"
  }
}
```

## Delete Presentation

- `DELETE /api/v1/presentations/:presentationId`

Response:

- `204`

## Slides

## Create Slide

- `POST /api/v1/presentations/:presentationId/slides`

Request:

```json
{
  "type": "content",
  "title": "Sales",
  "subtitle": "Overview",
  "order": 2
}
```

Response:

- `201` + `Slide`

## Reorder Slides

- `POST /api/v1/presentations/:presentationId/slides/reorder`

Request:

```json
{
  "slideIds": ["slide_1", "slide_2", "slide_3"]
}
```

Response:

- `200` + reordered `Slide[]`

## Update Slide

- `PATCH /api/v1/slides/:slideId`

## Delete Slide

- `DELETE /api/v1/slides/:slideId`

## Blocks

## Create Block

- `POST /api/v1/slides/:slideId/blocks`

Request:

```json
{
  "type": "chart",
  "order": 0,
  "layout": { "widthRatio": 0.6 },
  "config": {
    "datasetId": "uuid",
    "kind": "line",
    "xField": "month",
    "valueField": "sales"
  }
}
```

Response:

- `201` + `Block`

## Reorder Blocks

- `POST /api/v1/slides/:slideId/blocks/reorder`

Request:

```json
{
  "blockIds": ["block_1", "block_2"]
}
```

## Update Block

- `PATCH /api/v1/blocks/:blockId`

Validation:

- `config` is validated by block type schema.

## Delete Block

- `DELETE /api/v1/blocks/:blockId`

## Datasets

## Upload CSV Dataset

- `POST /api/v1/presentations/:presentationId/datasets/upload-csv`
- `multipart/form-data`

Fields:

- `name` (string)
- `file` (csv)

Response:

- `201` + `Dataset`

## Create Manual Dataset

- `POST /api/v1/presentations/:presentationId/datasets`

Request:

```json
{
  "name": "manual_metrics",
  "sourceType": "manual_table",
  "columns": [
    { "key": "metric", "type": "string", "nullable": false },
    { "key": "value", "type": "number", "nullable": true }
  ],
  "rows": [
    { "metric": "Revenue", "value": 1200 }
  ]
}
```

## List Datasets

- `GET /api/v1/presentations/:presentationId/datasets`

## Get Dataset

- `GET /api/v1/datasets/:datasetId`

## Update Dataset

- `PATCH /api/v1/datasets/:datasetId`

## Delete Dataset

- `DELETE /api/v1/datasets/:datasetId`

## Themes

## List Themes

- `GET /api/v1/themes`

Response:

- `200` + `Theme[]`

## Get Theme

- `GET /api/v1/themes/:themeId`

## Update Theme Tokens (custom themes only in MVP)

- `PATCH /api/v1/themes/:themeId`

## Rendering

## Build Preview HTML

- `POST /api/v1/presentations/:presentationId/render/preview`

Request:

```json
{
  "mode": "latest_draft"
}
```

Response:

```json
{
  "previewUrl": "/preview/presentation_123"
}
```

## Export PDF

- `POST /api/v1/presentations/:presentationId/render/pdf`

Response:

- `202` + `RenderJob`

Notes:

- Export is asynchronous by contract for MVP.
- Client should poll `GET /api/v1/render-jobs/:jobId`.

## Get Render Job

- `GET /api/v1/render-jobs/:jobId`

Response:

- `200` + `RenderJob`

## Future: Export PPTX

- `POST /api/v1/presentations/:presentationId/render/pptx`

Status:

- Deferred (not in Stage 1 implementation).

## Error Codes

Common:

- `VALIDATION_ERROR` (400)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `UNPROCESSABLE_ENTITY` (422)
- `INTERNAL_ERROR` (500)

Rendering/Data-specific:

- `DATASET_COLUMN_MISSING`
- `BLOCK_CONFIG_INVALID`
- `RENDER_TIMEOUT`
- `EXPORT_FAILED`

## Non-Goals and Constraints in Contract

1. No absolute pixel positioning API for blocks.
2. No per-element timeline animation API.
3. No guarantee that web preview animation maps to PDF.
4. PPTX endpoint is reserved but deferred.
