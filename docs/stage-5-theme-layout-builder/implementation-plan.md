# Stage 5 Implementation Plan

Date: 2026-02-27
Status: draft execution plan

## Phase 1 - Contract and Persistence

1. Add DB schema for `themes` (custom + system flags).
2. Add DB schema for `layout_presets` (system presets for MVP).
3. Add slide layout binding fields (`layoutPresetId`, `slotAssignments`).
4. Implement backend validation rules for theme tokens and layout contract.
5. Seed baseline system themes:
   - `Eurofoods` (fully migrated);
   - one alternative theme (replace/fix incomplete `Cyberpunk`).

Exit criteria:

1. Contracts stable and test-covered.
2. System themes and presets queryable from API.

## Phase 2 - Theme CRUD and Duplicate Flow

1. Implement themes CRUD endpoints for custom themes.
2. Enforce system theme immutability in write endpoints.
3. Implement duplicate endpoint (`system/custom -> custom copy`).
4. Keep existing presentation theme application flow compatible.

Exit criteria:

1. User can create/duplicate/update/delete custom themes via API.
2. Presentation can apply custom theme immediately.

## Phase 3 - Theme Editor Screen

1. Add route for dedicated theme editor page.
2. Add sections:
   - Colors
   - Typography
   - Spacing
   - Chart
   - Table
3. Add live preview zone on reference slides.
4. Add warnings for risky values:
   - too small/large numeric values;
   - low contrast text/background pairs.

Exit criteria:

1. Editing tokens does not require raw CSS edits.
2. Save/apply flow is stable and understandable.

## Phase 4 - Layout Presets Integration

1. Expose layout preset selection in slide creation/edit flow.
2. Replace plain dropdown with visual layout cards (schema-based mini slide preview).
3. Localize preset names via i18n keys (`nameKey` with fallback to `name`).
4. Add slot assignment UX (map blocks into preset slots).
5. Filter incompatible blocks per slot based on `allowedBlockTypes`.
6. Expand preset catalog with image-oriented and mirrored variants.
7. Add user-facing `Section Title` slide option (centered title/subtitle, no blocks).
8. Enforce no-block behavior for `Section Title` in UI and API.
9. Update renderer to resolve:
   - geometry from layout preset;
   - visuals from theme tokens;
   - content from block adapters.

Exit criteria:

1. Slide geometry can change independently from theme visuals.
2. Existing block types render correctly in multiple presets.
3. Layout selection is understandable visually without reading preset names.
4. Section separator slides are usable without block configuration.

## Phase 5 - Import/Export Foundation

1. Add export endpoint returning stable `theme.json`.
2. Add backend import validator/parser (feature-flagged if needed).
3. Keep UI import/export controls optional for next stage.

Exit criteria:

1. Theme can be exported reliably in portable format.
2. Import path exists at backend level for future UI enablement.

## Phase 6 - Stabilization and Manual QA

1. Verify preview/PDF parity for at least:
   - 2 themes;
   - 3 layout presets;
   - all major block types.
2. Extend manual checklist with theme/layout scenarios.
3. Document known constraints and post-MVP improvements.

Exit criteria:

1. No critical regressions in existing constructor workflows.
2. Theme + layout builder usable end-to-end for MVP scenarios.

## Phase 7 - Post-MVP Layout Polish Additions (Approved)

1. Image cluster focal behavior:
   - add image fit policy (`cover|contain`) and focal/anchor control per image block;
   - define sane defaults for cluster slots so narrow/tall assets align predictably.
2. KPI compact layout in constrained slots:
   - add internal responsive KPI grid;
   - reduce typography/padding in compact mode;
   - prevent card overflow in `2x2` and similar dense presets.
3. Demo seed completeness:
   - ensure seeded test slides actually bind all claimed blocks (example: `single-column` text + KPI mismatch);
   - populate long/medium/short text content for overlap/overflow QA cases.
4. Manual QA expansion:
   - add dedicated checks for image anchoring behavior in left/right mirrored image presets;
   - add KPI compact-grid checks in dense layout slots.

## Phase 8 - Editor Shell Usability Refactor + Regression Fixes (Approved)

1. Fix content/render regressions discovered in QA demo:
   - manual KPI must not fallback to dataset-missing message;
   - text overflow in `two-columns` should wrap/clip safely inside slot;
   - cluster image placement must be deterministic for mixed aspect-ratio assets.
2. Introduce collapsible top editor header:
   - collapse/expand toggle button;
   - preserve current controls state while collapsed.
3. Make all three work zones independently scrollable:
   - left panel (`Slides` + `Blocks`) independent scroll;
   - center preview independent scroll;
   - right `Properties` panel independent scroll.
4. Layout height behavior:
   - with collapsed header, preview should maximize visible viewport height;
   - avoid global page scroll for routine editing interactions.
5. QA checklist update:
   - add explicit test cases for collapsed-header workflow;
   - add scroll-behavior checks for left/center/right zones.
6. Interaction-flow simplification:
   - move block settings to left workspace under selected slide/block controls;
   - keep right panel focused on slide settings, layout, and datasets only.
7. Presentations list hygiene:
   - add delete action in presentations list with mandatory confirmation.

Exit criteria:

1. Editor can be used without continuous page-level scrolling.
2. Header collapse materially increases usable preview area.
3. QA demo deck renders without current overflow/fallback defects.
4. Block editing flow requires fewer cross-column mouse/eye jumps.
