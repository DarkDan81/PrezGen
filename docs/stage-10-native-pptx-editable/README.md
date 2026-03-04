# Stage 10 - Native Editable PPTX Export

## Goal

Move from Stage 9 raster PPTX output to hybrid/native PPTX export where core slide content is editable in PowerPoint while keeping preview/PDF parity and deterministic geometry.

## Why this stage exists

Stage 9 solved reliability with `safe-raster` slides, but output is image-based and not editable in PPTX.
Stage 10 introduces native PPTX primitives for supported blocks and keeps raster fallback only for non-portable visuals.

## Scope

In scope:

1. Hybrid export architecture (`native-first`, `raster-fallback`).
2. Native mapping for:
- text blocks,
- image blocks,
- table blocks,
- card blocks,
- chart blocks (supported subset),
- theme background/color/typography primitives.
3. Stable coordinate mapper and line-break strategy.
4. Structured warning model per slide/block for degraded features.
5. Validation suite for:
- openability,
- editability,
- geometry/parity tolerance.

Out of scope:

1. Animation timelines and interactive web-only effects.
2. Full CSS parity in PowerPoint engine.
3. Arbitrary custom SVG filters/blends as editable PPT objects.

## Acceptance criteria

1. PPTX export supports native editable output for declared block/token subset.
2. For supported subset, text/table/chart/image/card are editable in PowerPoint.
3. Fallbacks are explicit in API/UI warnings (no silent downgrade).
4. Existing PDF export stays unchanged.
5. Preview layout geometry does not regress.
6. Manual QA checklist covers editability checks in PowerPoint.

## Deliverables

1. Stage docs:
- `decisions.md`
- `implementation-plan.md`
- `execution-order.md`
- `implementation-status.md`
2. Export capability matrix update (`native/raster/blocked`).
3. Automated checks and manual checklist extension for editable PPTX.
