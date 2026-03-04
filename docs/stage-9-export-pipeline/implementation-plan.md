# Stage 9 Implementation Plan

## Phase 1. Capability freeze and contract lock

1. Freeze export matrix from Stage 8 into actionable mapping table:
- block type -> PPTX primitive strategy,
- token -> native/raster/ignored.
2. Add API contract section for PPTX render jobs and warning payload.
3. Define parity tolerance rules (position/font/size deltas).

Deliverable:
- locked mapping table and API contract patch.

## Phase 2. Job orchestration extension

1. Extend render job types with `export_pptx`.
2. Add queue execution path and artifact persistence strategy.
3. Add status/result shape with warning list support.

Deliverable:
- stable async PPTX job lifecycle.

## Phase 3. PPTX base builder and slide shell

1. Build PPTX deck/slide shell from render model:
- page size,
- slide ordering,
- background/color layers.
2. Add deterministic coordinate system mapping (1920x1080 -> PPTX units).
3. Implement title/content slide wrappers.

Deliverable:
- valid PPTX with empty shells and correct slide structure.

## Phase 4. Block mapping implementation

1. Text block mapping (rich text subset + sanitization-safe styles).
2. Table mapping (header/body styles + density modes).
3. Chart mapping for supported chart kinds with palette/mode rules.
4. KPI/card mapping with typography and borders.
5. Image mapping with fit/crop/focus behavior.

Deliverable:
- all current production block types exported in PPTX.

## Phase 5. Decor and token mapping

1. Apply theme tokens to PPTX equivalents:
- palette,
- typography presets,
- borders/radius where representable.
2. Map badge/logo and safe decor primitives.
3. Apply `safe-raster` for declared non-native visuals only.

Deliverable:
- themed PPTX output aligned with Stage 8 contract.

## Phase 6. Regression and parity hardening

1. Add automated smoke scenarios:
- preview generation,
- PDF export,
- PPTX export.
2. Add manual parity checklist on QA demo deck:
- geometry,
- readability,
- color consistency,
- warning correctness.
3. Document known deltas and accepted exceptions.

Deliverable:
- sign-off-ready test evidence for Stage 9.

## Phase 7. UX integration and docs sync

1. Add PPTX export trigger/status UI in editor (same interaction model as PDF).
2. Show warning summary when export uses fallback/degradation.
3. Update all docs and checklists with final behavior.

Deliverable:
- complete user-facing export flow with docs parity.

## Suggested commit slicing

1. `stage9: lock pptx mapping matrix and api contract`
2. `stage9: add async pptx render job orchestration`
3. `stage9: implement pptx slide shell and coordinate mapper`
4. `stage9: map text table chart kpi image blocks to pptx`
5. `stage9: map tokens/decor and fallback warning model`
6. `stage9: add export ui integration and regression checks`
7. `docs(stage9): sync status checklist and known limits`
