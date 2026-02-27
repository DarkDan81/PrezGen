# Stage 5 Execution Order (Detailed Runbook)

Date: 2026-02-27
Status: approved implementation sequence

This file defines exact implementation order for Stage 5.  
Rule: do not skip steps. If a step is blocked, document blocker in this file and stop at nearest safe boundary.

## 0. Branch and Safety Baseline

1. Create implementation branch from current working branch.
2. Ensure current checks pass before changes:
   - `npm run frontend:build`
   - `npm run api:verify`
3. Snapshot current API behavior:
   - `GET /api/v1/themes`
   - `GET /api/v1/themes/:themeId`
   - preview/pdf flow for one presentation.

Done when:

1. Baseline checks are green.
2. Baseline behavior notes saved in commit message or PR notes.

## 1. Backend DB Migration Layer

Goal: introduce new persistence model without breaking old flows.

1. Add DB tables:
   - `themes`:
     - `id` (text pk)
     - `name`
     - `kind` (`system|custom`)
     - `is_system` (int bool)
     - `base_theme_id` (nullable)
     - `tokens_json` (text)
     - `created_at`, `updated_at`
   - `layout_presets`:
     - `id` (text pk)
     - `name`
     - `kind` (`system|custom` or `system` only for MVP)
     - `is_system`
     - `schema_json` (text)
     - `created_at`, `updated_at`
2. Extend slide storage:
   - `slides.layout_preset_id` (nullable text)
   - `slides.slot_assignments_json` (nullable text)
3. Add migration scripts and bootstrap defaults:
   - migrate `Eurofoods` into tokenized system theme row;
   - add at least one alternative system theme row;
   - seed 2-3 system layout presets.

Files to touch:

1. `backend/db/*` migration/bootstrap modules.
2. Seed scripts that currently seed themes.

Done when:

1. Fresh DB includes new tables and seeds.
2. Existing DB upgrades cleanly.
3. Existing endpoints still work.

## 2. Backend Domain Validation Layer

Goal: centralize rules for tokens/layout schema.

1. Create validators:
   - `validateThemeTokens(tokens)`
   - `validateLayoutPreset(schema)`
   - `validateSlideLayoutBinding(layoutPreset, slotAssignments, blocks)`
2. Add warning-producing checks:
   - typography min/max
   - spacing min/max
   - contrast checks for critical text/background pairs.
3. Keep hard errors and warnings separate:
   - errors block save;
   - warnings return in response metadata.

Files to touch:

1. `backend/validation/*`
2. `backend/render/*` helper boundary where needed.

Done when:

1. Invalid tokens/layout are rejected deterministically.
2. Warnings are returned in stable API shape.

## 3. Theme API (CRUD + Duplicate)

Goal: user-manageable custom themes with system immutability.

1. Implement endpoints:
   - `POST /api/v1/themes` (custom)
   - `PATCH /api/v1/themes/:themeId` (custom only)
   - `DELETE /api/v1/themes/:themeId` (custom only)
   - `POST /api/v1/themes/:themeId/duplicate`
2. Keep existing read endpoints backward compatible.
3. Enforce rule:
   - `is_system=true` cannot be patched/deleted.

Files to touch:

1. `backend/routes/*themes*`
2. `backend/services/theme-service*` (new if needed)
3. API verify script expectations.

Done when:

1. Duplicate flow works from system theme to custom copy.
2. System immutability is enforced with clear error messages.

## 4. Layout Preset API + Slide Binding API

Goal: expose geometry model independently from theme model.

1. Implement:
   - `GET /api/v1/layout-presets`
   - `GET /api/v1/layout-presets/:layoutPresetId`
   - `PATCH /api/v1/slides/:slideId/layout`
2. `PATCH /slides/:id/layout` payload:
   - `layoutPresetId`
   - `slotAssignments[]`
3. Validate assignment compatibility with slide blocks.

Files to touch:

1. `backend/routes/*slides*`
2. `backend/routes/*layout*` (new)
3. slide repository/service modules.

Done when:

1. Slide can switch layout preset without data corruption.
2. Invalid slot mapping is blocked.

## 5. Render Pipeline Refactor Boundary

Goal: make preview/pdf resolve the same theme+layout model.

1. Introduce render model contract:
   - `resolvedThemeTokens`
   - `resolvedLayoutPreset`
   - `resolvedSlotAssignments`
2. Update model builder:
   - fetch theme tokens from DB theme record;
   - fetch layout preset for each slide (fallback to default if absent).
3. Update adapters/templating:
   - block visuals consume tokens;
   - slide shell geometry consumes layout preset.
4. Remove layout hardcoding where it conflicts with preset model.

Files to touch:

1. `backend/render/model-builder.js`
2. `backend/render/adapters/*`
3. `engine/slide-builder.js` / related HTML builder path.

Done when:

1. Preview and PDF are visually consistent for the same presentation.
2. Two different layout presets produce different geometry without style breakage.

## 6. Frontend API Client Layer

Goal: typed access to new backend contracts.

1. Add types:
   - `ThemeTokens`, `ThemeEntity`, `LayoutPreset`, `SlideLayoutBinding`.
2. Add client calls for all new endpoints.
3. Keep old theme read calls compatible during migration.

Files to touch:

1. `frontend/src/api/types.ts`
2. `frontend/src/api/client.ts`

Done when:

1. Frontend compiles with typed calls for theme/layout features.

## 7. Frontend Theme Builder Screen

Goal: separate page for create/edit/duplicate theme.

1. Add route:
   - `/themes`
   - `/themes/:themeId` (optional split route)
2. Build page sections:
   - Theme list (system/custom)
   - Actions: create, duplicate, save, delete (custom only)
   - Token editors: color/typography/spacing/chart/table
3. Add warnings panel from backend warning response.
4. Add apply-to-presentation action (immediate).

Files to touch:

1. `frontend/src/pages/*Themes*` (new)
2. `frontend/src/App.tsx` routing
3. shared ui components if missing.

Done when:

1. User can create from scratch, duplicate system, edit custom.
2. Save/apply flow works end-to-end.

## 8. Frontend Layout Preset Integration in Editor

Goal: select slide layout and map blocks to slots.

1. In editor slide controls add visual layout picker:
   - layout cards with mini-schema preview;
   - localized names via `nameKey`.
2. Use visual picker as primary selector (dropdown fallback is optional and may be omitted in current UI).
3. Add slot assignment UI per selected slide.
4. Filter block choices per slot by `allowedBlockTypes`.
5. Persist changes via `PATCH /slides/:id/layout`.
6. Add `Section Title` slide creation option:
   - centered title/subtitle;
   - no blocks area and no slot assignment controls.
7. Enforce API-side guard: no block create for `type=title`.

Files to touch:

1. `frontend/src/pages/EditorPage.tsx`
2. optional new components:
   - `SlideLayoutPicker.tsx`
   - `SlideLayoutForm.tsx`
3. backend route guard in `POST /slides/:slideId/blocks`.

Done when:

1. Slide layout can be changed from UI and reflected in preview.
2. User can choose layout visually.
3. Section Title slide works as separator and cannot host blocks.

## 9. Import/Export Foundation (No Full UX)

Goal: backend-ready file exchange with stable JSON format.

1. Implement export endpoint:
   - `GET /api/v1/themes/:themeId/export`
2. Implement import backend parser (can be feature-flagged):
   - `POST /api/v1/themes/import`
3. Validate JSON schema version field:
   - `schemaVersion: 1`

Files to touch:

1. `backend/routes/*themes*`
2. `backend/services/theme-import-export*` (new)

Done when:

1. Theme JSON can be exported and re-imported via API tooling.

## 10. Verification and QA Gate

Mandatory checks:

1. `npm run frontend:build`
2. `npm run api:verify` (extended for theme/layout endpoints)
3. Manual scenarios:
   - duplicate system theme -> edit -> apply to presentation;
   - switch slide to `2x2 grid` preset and assign blocks;
   - verify visual layout cards + localized labels;
   - create `Section Title` slide and confirm block actions are disabled/rejected;
   - preview/pdf parity check;
   - warning scenarios for tiny typography and low-contrast colors.

Done when:

1. All automated checks green.
2. Manual checklist passes with no blocker defects.

## 11. Documentation Completion Gate

1. Update:
   - `docs/stage-5-theme-layout-builder/implementation-plan.md`
   - `docs/manual-test-checklist.md` (add stage 5 cases)
2. Add `implementation-status.md` for stage 5 once coding starts.

Done when:

1. Stage docs reflect actual implemented scope and known gaps.

## Suggested Commit Order

1. `stage5: add db schema for themes and layout presets`
2. `stage5: add theme/layout validators and api contracts`
3. `stage5: implement theme crud and duplicate endpoints`
4. `stage5: implement layout preset and slide layout binding endpoints`
5. `stage5: refactor render model for theme tokens and layout presets`
6. `stage5: add frontend api types and client methods`
7. `stage5: add dedicated theme builder screen`
8. `stage5: add layout preset controls in editor`
9. `stage5: add theme import/export backend foundation`
10. `stage5: extend tests and docs`
