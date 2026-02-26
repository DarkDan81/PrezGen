# Schema Catalog

This file defines canonical JSON shapes (transport contracts), not DB tables.

## Common Envelope

Success response:

```json
{
  "data": {},
  "meta": {
    "requestId": "req_123",
    "schemaVersion": "1.0"
  }
}
```

Error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Payload validation failed",
    "details": [
      {
        "path": "blocks[0].config.series",
        "rule": "required",
        "message": "series is required for chart block"
      }
    ]
  },
  "meta": {
    "requestId": "req_123",
    "schemaVersion": "1.0"
  }
}
```

## Presentation Schema

```json
{
  "id": "uuid",
  "name": "Q1 Report",
  "description": "Optional",
  "themeId": "uuid",
  "themeOverrides": {
    "fontFamilyBase": "Inter",
    "colorTextPrimary": "#111111"
  },
  "status": "draft",
  "schemaVersion": "1.0",
  "createdAt": "2026-02-26T12:00:00.000Z",
  "updatedAt": "2026-02-26T12:00:00.000Z"
}
```

Required:

- `name`, `themeId`, `status`, `schemaVersion`

## Slide Schema

```json
{
  "id": "uuid",
  "presentationId": "uuid",
  "order": 0,
  "type": "content",
  "title": "Revenue",
  "subtitle": "Q1 vs Q2",
  "notes": "Speaker notes",
  "createdAt": "2026-02-26T12:00:00.000Z",
  "updatedAt": "2026-02-26T12:00:00.000Z"
}
```

Required:

- `presentationId`, `order`, `type`

## Block Base Schema

```json
{
  "id": "uuid",
  "presentationId": "uuid",
  "slideId": "uuid",
  "order": 0,
  "type": "chart",
  "layout": {
    "widthRatio": 0.6,
    "minHeight": 280
  },
  "config": {},
  "createdAt": "2026-02-26T12:00:00.000Z",
  "updatedAt": "2026-02-26T12:00:00.000Z"
}
```

Required:

- `presentationId`, `slideId`, `order`, `type`, `config`

## Block Config Schemas

## Chart Block Config

```json
{
  "datasetId": "uuid",
  "kind": "line",
  "xField": "month",
  "seriesField": "region",
  "valueField": "sales",
  "seriesFilter": ["North", "South"],
  "limit": 12,
  "showOthers": false,
  "showLabels": true,
  "shorten": false
}
```

Rules:

- `kind` enum: `line`, `bar`, `horizontalBar`.
- `datasetId`, `xField`, `valueField` required.
- `seriesField` optional for single-series charts.

## Table Block Config

```json
{
  "datasetId": "uuid",
  "columns": ["month", "sales", "margin"],
  "sort": {
    "by": "sales",
    "direction": "desc"
  },
  "limit": 20,
  "transpose": false,
  "parameterLabel": "Metric",
  "shorten": true
}
```

## KPI Block Config

```json
{
  "mode": "dataset",
  "datasetId": "uuid",
  "labelField": "metric",
  "valueField": "value",
  "unitField": "unit",
  "growthField": "growth",
  "limit": 4
}
```

Alternative `mode = "manual"`:

```json
{
  "mode": "manual",
  "items": [
    { "label": "Revenue", "value": "1 200", "unit": "USD", "growth": "+12%" }
  ]
}
```

## Text Block Config

```json
{
  "html": "<div><h3>Summary</h3><p>...</p></div>"
}
```

Rules:

- Accepts sanitized subset of HTML in MVP.
- Markdown support is deferred.

## Image Block Config

```json
{
  "assetId": "uuid",
  "fit": "contain",
  "caption": "Optional"
}
```

Rules:

- `fit` enum: `contain`, `cover`, `fill`.

## Dataset Schema

```json
{
  "id": "uuid",
  "presentationId": "uuid",
  "name": "sales_2025",
  "sourceType": "upload_csv",
  "columns": [
    { "key": "month", "label": "Month", "type": "string", "nullable": false },
    { "key": "sales", "label": "Sales", "type": "number", "nullable": true }
  ],
  "rows": [
    { "month": "Jan", "sales": 1200 }
  ],
  "meta": {
    "rowCount": 120
  },
  "createdAt": "2026-02-26T12:00:00.000Z",
  "updatedAt": "2026-02-26T12:00:00.000Z"
}
```

## Theme Schema

```json
{
  "id": "uuid",
  "name": "eurofoods",
  "baseCssPath": "/themes/eurofoods/styles.css",
  "tokens": {
    "fontFamilyBase": "Segoe UI",
    "fontFamilyHeading": "Segoe UI",
    "colorTextPrimary": "#545359",
    "colorAccent": "#8CC63F",
    "colorDanger": "#E32B22"
  },
  "isSystem": true,
  "createdAt": "2026-02-26T12:00:00.000Z",
  "updatedAt": "2026-02-26T12:00:00.000Z"
}
```

## RenderJob Schema

```json
{
  "id": "uuid",
  "presentationId": "uuid",
  "type": "export_pdf",
  "status": "running",
  "result": {
    "url": "/exports/presentation_123.pdf"
  },
  "error": null,
  "createdAt": "2026-02-26T12:00:00.000Z",
  "updatedAt": "2026-02-26T12:00:00.000Z"
}
```

## Versioning Rules

1. All responses return `meta.schemaVersion`.
2. Breaking changes require schemaVersion bump (for example `1.x` to `2.0`).
3. Additive fields are backward-compatible in same major version.

## Implementation Notes (Approved)

1. MVP persistence target is SQLite.
2. Datasets are persisted in DB, not in source CSV files at runtime.
3. Text blocks use sanitized HTML as canonical storage/transport format.
