# Stage 3 Implementation Status

Date: 2026-02-26
Branch: `feat/frontend-mvp-editor`

## Implemented

1. Frontend app scaffold:
   - React + TypeScript + Vite.
2. Routing:
   - `/` presentations list/create screen.
   - `/presentations/:id` editor screen.
3. Editor capabilities:
   - slide list, create, reorder (drag handle);
   - block list, create, reorder (drag handle), delete;
   - slide autosave (title/subtitle);
   - block autosave with strict validation.
4. Block configuration forms:
   - `text`, `image`, `chart`, `table`, `kpi`.
5. Data actions:
   - upload CSV dataset;
   - select existing dataset;
   - create/edit/delete manual dataset from UI.
6. Manual dataset editor UX:
   - dataset opens in modal dialog;
   - spreadsheet-like table editing for all cells;
   - add/remove columns and rows;
   - horizontal/vertical scroll for large tables.
   - simplified column editing: user edits only display column names (technical keys/types hidden).
   - modal close safety: unsaved changes confirmation on `Close/Cancel/Esc`.
7. Image workflow:
   - `image` block supports URL and drag/drop upload;
   - uploaded images are persisted via backend and reused by URL.
8. Preview and export:
   - embedded iframe preview;
   - refresh preview uses cache-busting token and rebuild call;
   - PDF export trigger + job polling status.
   - dev-server proxy includes `/content`, so uploaded images resolve in preview during local development.
9. Constructor theming:
   - light/dark mode toggle via CSS variables.
10. Deterministic render stabilization (kept from previous step):
   - compact-mode CSS for dense content;
   - removed unstable runtime auto-fit loops from active render path;
   - stricter UI limits for block form numeric/text fields.
11. Block data filtering improvements:
   - `chart` and dataset-mode `kpi` now support row filtering by selected field + multi-select values from dataset rows.
12. Field selector UX:
   - chart/table/kpi field selectors render dataset column labels (human-readable names) while storing stable keys.
   - table block column selection changed to multi-select (instead of comma-separated key input).
13. Table block tuning:
   - table headers in rendered slide now use dataset column labels (not raw internal keys like `col_1`).
   - table block properties include `Transpose table` checkbox that toggles transposed output in preview/pdf.
   - table block UI no longer exposes `columns-to-render` and `sort` controls; full dataset columns order is used for stable behavior.

## Verified

1. `npm run frontend:build` passes.
2. `npm run api:verify` passes.
3. Manual API smoke for new endpoints:
   - `PATCH /api/v1/datasets/:datasetId`;
   - `POST /api/v1/presentations/:presentationId/assets/upload-image`.

## Known Gaps (next frontend slices)

1. Better field-level UX and validation message mapping from backend details.
2. Dataset editor quality improvements:
   - column reorder;
   - typed cell editors per column type;
   - bulk paste/import from clipboard.
3. Stronger async UX:
   - explicit loading/error state per operation;
   - retry toasts and optimistic updates where safe.
4. Draft revision/rollback UX is not yet implemented.
