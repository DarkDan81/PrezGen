# Stage 5 Implementation Status

Date: 2026-02-27
Branch: `feat/frontend-mvp-editor`

## Completed

1. Step 0 baseline checks:
   - `npm run frontend:build` passed.
   - `npm run api:verify` skipped in this session (`3100` was already occupied).
2. Step 1 DB migration layer:
   - Added `themes` table.
   - Added `layout_presets` table.
   - Added slide columns:
     - `slides.layout_preset_id`
     - `slides.slot_assignments_json`
   - Added safe column migration for existing DBs.
3. System seed bootstrap:
   - System themes seeded from `/themes/*` folders into DB.
   - System layout presets seeded and upserted with localization keys:
     - `single-column`
     - `two-columns`
     - `2x2-grid`
     - `content-left + 3-images-right`
     - `3-images-left + content-right`
     - `content-left + 4-images-right`
     - `4-images-left + content-right`
     - `content-left + 2-vertical-right`
     - `content-left + vertical + 2-horizontal-right`
4. Backend read path prep:
   - Added DB repositories:
     - `theme-repository`
     - `layout-preset-repository`
   - `themes-service` now reads from DB first with file fallback.
5. Slide repository extension:
   - Added `layoutPresetId` + `slotAssignments` mapping/read/write support.
6. Validation layer (backend):
   - Added `validateThemeTokens` with range/color checks and warnings.
   - Added layout-binding payload and slot-assignment validators.
7. Theme API extension:
   - `POST /api/v1/themes`
   - `PATCH /api/v1/themes/:themeId` (custom only)
   - `DELETE /api/v1/themes/:themeId` (custom only)
   - `POST /api/v1/themes/:themeId/duplicate`
   - `GET /api/v1/themes/:themeId/export`
   - `POST /api/v1/themes/import`
8. Layout preset API extension:
   - `GET /api/v1/layout-presets`
   - `GET /api/v1/layout-presets/:layoutPresetId`
9. Slide layout binding API:
   - `PATCH /api/v1/slides/:slideId/layout`
   - validates layout existence, slot membership, block membership, and block-type compatibility.
10. Frontend API client/types extension:
    - added `ThemeTokens`, `LayoutPreset`, `ValidationWarning` types.
    - added client methods for theme CRUD/duplicate/import/export and layout preset endpoints.
    - added `patchSlideLayout` client method.
11. Dedicated frontend theme builder screen:
    - new route `/themes`.
    - theme list + create from scratch + duplicate + save + delete (custom) actions.
    - token editor for core fields (colors, typography, spacing).
    - warning panel support from backend responses.
    - apply selected theme to a selected presentation.
12. Editor integration for layout presets:
    - layout selection uses visual cards (schema thumbnail previews), no dropdown fallback in current UI.
    - added visual layout picker cards with schema thumbnail previews.
    - layout names are localized via `layoutPreset.nameKey` + i18n dictionary.
    - slot-to-block assignment controls filter options by allowed block types.
    - image-only slots include quick action `Add Image` (creates and assigns image block).
    - save layout action wired to new slide layout endpoint.
13. i18n updates:
    - added dictionary keys for themes page and layout controls.
    - integrated RU/EN labels in new UI flows.
14. Section Title slide mode:
    - editor supports creating both `content` and `title` (section) slides.
    - blocks panel is disabled for `title` slides in UI.
    - backend guards added:
      - reject block creation for `title` slides.
      - reject layout preset binding for `title` slides.
15. Editor UX polish:
    - right `Properties` column has independent scroll (reduced full-page scroll thrash).
    - slide list has inline quick-delete (`red X`) per slide.
    - block list has inline quick-delete (`red X`) per block.
    - block delete keeps slot assignments consistent (removes bindings for deleted block).
    - block labels use stable per-slide numbering in left panel.
    - slot block selectors show numbered block labels instead of short block IDs.
16. Stability fixes:
    - `Themes` page token normalization prevents blank screen when theme has partial token payload.
    - editor UI mode (`light|dark`) persists via localStorage and restores on page reload.
17. Render and demo polish (post-MVP additions implemented):
    - image blocks now support fit/position payload (`fitMode`, `focalPoint`) in render model.
    - layout slots now expose deterministic CSS classes (`layout-preset-*`, `slot-*`) for slot-specific visual tuning.
    - image cluster presets switched to no-crop baseline (`contain`) with stable cell framing.
    - KPI blocks now use adaptive internal grid sizing in dense layouts (`2x2` and similar), reducing card overflow.
    - `layout-single-column` seed had stacked `text + kpi` via two vertical slots (deprecated and removed in Stage 6).
    - QA demo seed content expanded with long/medium/short text stress cases and full slot bindings.
18. Phase 8 implementation progress:
    - fixed manual KPI render path (`mode=manual`) to avoid dataset-missing fallback.
    - added long-token wrapping safeguards in theme text blocks (`overflow-wrap/word-break`).
    - improved grid-image slot fill behavior for cluster layouts (layout-grid image blocks stretch to slot).
    - editor header now supports collapse/expand with persisted state.
    - editor workspace now uses independent scrolling zones:
      - left panel (`Slides` + `Blocks`);
      - center preview frame;
      - right properties panel.
    - image block editor now exposes user-facing `fitMode` and `focalPoint` controls.
    - image block editor now also supports `zoom`, `offsetX`, `offsetY` for in-slot framing adjustments.
    - removed helper frames/background from cluster image slots in final render path (preview + PDF).
    - cover-mode framing now uses viewport-oriented object-position shifting (instead of moving already cropped bitmap).
    - switching back to `contain` no longer keeps crop-like framing artifacts.
    - `Refresh Preview` action moved to persistent top row so it remains visible when header is collapsed.
    - block settings moved to left workspace under selected slide block list.
    - right panel narrowed to slide settings, layout mapping, and datasets.
    - presentations list now supports delete action with confirmation dialog.
    - language selector on key screens is now compact inline (flag + locale name, no separate label field).
    - inline checkbox alignment fixed for block settings (including table transpose toggle).

## Verification after changes

1. `npm run frontend:build` passed.
2. Stage 5 backend smoke passed:
   - themes list/create/duplicate/delete
   - layout presets list
3. Feature smoke (isolated app instance on port `3101`) passed:
   - `layout-presets` returns expanded catalog and `nameKey`.
   - creating block on `title` slide returns `400`.
   - binding layout to `title` slide returns `400`.
4. Render smoke (isolated app instance on port `3101`) passed:
   - no `Dataset not found: n/a` in QA demo preview for manual KPI slide.
   - preview contains expected layout/slot/KPI marker classes for new cluster/compact behaviors.

## Notes

1. `npm run api:verify` was not executed in this pass because port `3100` was already occupied by another local process.
2. Render pipeline geometry integration:
   - `buildRenderModelByPresentationId` now includes resolved `layoutPreset` and `slotAssignments`.
   - `slide-builder` now renders content slides in grid mode when preset is selected.
   - slot assignment controls real block placement per slot (`grid-area`) in preview/PDF path.
3. Theme CSS compatibility:
   - added neutral layout-grid/slot rules to system theme CSS files.
4. Import/export UI flow is intentionally not implemented yet (backend foundation only).

## Planned Additions (Next Pass)

1. Add dedicated visual regression checklist for cluster anchors and dense KPI grids (manual + scripted snapshots).
2. Add dedicated visual regression checklist for collapsed-header workspace and multi-zone scroll behavior.
