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
