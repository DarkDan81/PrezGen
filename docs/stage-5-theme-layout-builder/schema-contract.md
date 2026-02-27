# Stage 5 Schema Contract (Draft)

Date: 2026-02-27
Status: draft for implementation

## 1) Theme Entity

Minimal DB-facing model:

```json
{
  "id": "theme_custom_001",
  "name": "My Business Light",
  "kind": "system",
  "isSystem": false,
  "baseThemeId": "theme-eurofoods",
  "createdAt": "2026-02-27T10:00:00.000Z",
  "updatedAt": "2026-02-27T10:00:00.000Z",
  "tokens": {}
}
```

Notes:

1. `kind` can be `system` or `custom`.
2. `baseThemeId` is optional and used for duplicated themes lineage only.
3. System themes are immutable by API rules.

## 2) Theme Tokens (MVP Shape)

```json
{
  "color": {
    "bgCanvas": "#ffffff",
    "bgCard": "#f8fafc",
    "textPrimary": "#0f172a",
    "textSecondary": "#475569",
    "border": "#cbd5e1",
    "accent": "#2563eb",
    "danger": "#dc2626"
  },
  "typography": {
    "fontFamily": "Inter",
    "titleSize": 42,
    "subtitleSize": 24,
    "bodySize": 18,
    "lineHeight": 1.35
  },
  "spacing": {
    "slidePadding": 40,
    "blockGap": 20,
    "cardPadding": 16,
    "radius": 12,
    "borderWidth": 1
  },
  "chart": {
    "palette": ["#2563eb", "#16a34a", "#f59e0b", "#ef4444"],
    "labelColor": "#334155",
    "gridColor": "#e2e8f0",
    "axisColor": "#64748b"
  },
  "table": {
    "headerBg": "#e2e8f0",
    "headerText": "#0f172a",
    "rowBg": "#ffffff",
    "rowAltBg": "#f8fafc",
    "cellText": "#1e293b",
    "borderColor": "#cbd5e1"
  }
}
```

Validation baseline:

1. Numeric ranges for sizes/spacing (min/max).
2. Color format validation.
3. Contrast warnings for critical pairs (`textPrimary` vs `bgCanvas`, table header text/bg).

## 3) Layout Preset Entity

```json
{
  "id": "layout_2x2_grid",
  "name": "2x2 Grid",
  "kind": "system",
  "isSystem": true,
  "slots": [
    { "id": "slot_a", "area": "a", "allowedBlockTypes": ["text", "kpi", "chart", "table", "image"] },
    { "id": "slot_b", "area": "b", "allowedBlockTypes": ["text", "kpi", "chart", "table", "image"] },
    { "id": "slot_c", "area": "c", "allowedBlockTypes": ["text", "kpi", "chart", "table", "image"] },
    { "id": "slot_d", "area": "d", "allowedBlockTypes": ["text", "kpi", "chart", "table", "image"] }
  ],
  "grid": {
    "columns": "1fr 1fr",
    "rows": "1fr 1fr",
    "areas": [
      "a b",
      "c d"
    ],
    "gap": 20
  }
}
```

## 4) Slide Binding Extension

`Slide` gets optional `layoutPresetId` and block-to-slot mapping:

```json
{
  "layoutPresetId": "layout_2x2_grid",
  "slotAssignments": [
    { "slotId": "slot_a", "blockId": "block_01" },
    { "slotId": "slot_b", "blockId": "block_02" }
  ]
}
```

## 5) API Draft

Themes:

1. `GET /api/v1/themes`
2. `GET /api/v1/themes/:themeId`
3. `POST /api/v1/themes` (custom only)
4. `PATCH /api/v1/themes/:themeId` (custom only)
5. `DELETE /api/v1/themes/:themeId` (custom only)
6. `POST /api/v1/themes/:themeId/duplicate`
7. `GET /api/v1/themes/:themeId/export` (JSON payload/attachment)
8. `POST /api/v1/themes/import` (optional step after base contract)

Layout presets:

1. `GET /api/v1/layout-presets`
2. `GET /api/v1/layout-presets/:layoutPresetId`

Slide layout binding:

1. `PATCH /api/v1/slides/:slideId/layout`

## 6) Migration Notes

1. Convert existing `Eurofoods` CSS into token model first (reference baseline).
2. Rebuild incomplete `Cyberpunk` in same token model after baseline migration.
3. Keep backward-compatible fallback from token model to legacy theme css during migration window.
