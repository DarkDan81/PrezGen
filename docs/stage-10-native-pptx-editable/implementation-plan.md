# Stage 10 Implementation Plan

## Phase 1. Contract and capability matrix lock

1. Freeze per-block/per-token mapping matrix:
- `native`,
- `raster`,
- `blocked`.
2. Extend API contract for warning payload granularity.
3. Define acceptance tolerance:
- geometry delta,
- font-size delta,
- table/chart readability thresholds.

Deliverable:
- locked matrix and contract patch before code changes.

## Phase 2. Export mode and job orchestration

1. Add export mode options:
- `raster` (existing Stage 9),
- `hybrid_native` (new Stage 10 default candidate).
2. Keep current async job lifecycle.
3. Include export metadata:
- mode,
- mapper version,
- warning summary.

Deliverable:
- stable async pipeline for both modes.

## Phase 3. Coordinate and text layout core

1. Build deterministic transform:
- model px -> PPTX inches.
2. Add text run mapper for supported rich-text subset:
- bold/italic/underline,
- color,
- lists (basic bullet),
- headings/paragraphs.
3. Implement line-wrap guard rails to reduce overflow mismatch.

Deliverable:
- native text shells matching slide geometry.

## Phase 4. Block-native mappers

Order:
1. Text blocks.
2. Image blocks (`contain/cover`, focus).
3. Table blocks (header/body styles, dense/normal modes).
4. Card blocks (value formatting, adaptive typography rules).
5. Chart blocks (supported subset to native chart object).

For each mapper:
1. Snapshot-like parity test vs preview geometry.
2. Editability test in generated PPTX.
3. Warning path for unsupported options.

Deliverable:
- editable core block set in PPTX.

## Phase 5. Theme and decor native mapping

1. Map theme primitives natively:
- canvas background,
- text colors,
- chart/table palettes,
- borders/radius where representable.
2. Map decor primitives:
- logo badge,
- line/triangle/blob safe shapes.
3. For non-native effects (blend/glow/shadow variants), apply per-layer raster fallback with warning.

Deliverable:
- themed editable decks without layout drift.

## Phase 6. Hybrid fallback engine

1. Implement per-block fallback decision engine.
2. Support mixed slides:
- native text/table/chart + raster-only decor fragment if needed.
3. Ensure fallback is deterministic and repeatable.

Deliverable:
- hybrid slide composition with explicit warnings.

## Phase 7. QA, regression barrier, and docs sync

1. Automated:
- `frontend:build`,
- `api:verify`,
- `api:smoke`,
- new `pptx-editable-smoke`.
2. Manual:
- open PPTX in PowerPoint,
- edit text/table/chart/image on sample deck,
- ensure save/reopen retains edits.
3. Update docs and checklist with supported/unsupported matrix.

Deliverable:
- sign-off package for switching default mode from raster to hybrid-native.

## Suggested commit slicing

1. `stage10: lock editable-pptx matrix and warning contract`
2. `stage10: add export mode orchestration and metadata`
3. `stage10: implement coordinate and rich text run mapper`
4. `stage10: map native text/image/table/card blocks`
5. `stage10: add native chart subset and fallback warnings`
6. `stage10: map theme/decor primitives with hybrid fallback`
7. `stage10: add editable smoke checks and manual checklist`
8. `docs(stage10): sync status limits and rollout gates`
