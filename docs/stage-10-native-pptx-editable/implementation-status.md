# Stage 10 Implementation Status

## Current state

Implemented (v1 hybrid-native mapper) and validated.

## Baseline before implementation

1. Stage 9 provides stable PDF export.
2. Stage 9 provides stable raster PPTX export.
3. Theme system is tokenized and constrained by Stage 8 PPTX-safe model.

## Stage checklist

1. Contract and matrix lock: done
2. Mode-aware orchestration (`raster` + `hybrid_native`): done
3. Coordinate + rich-text mapper core: done
4. Native block mappers (text/image/table/cards/chart subset): done
5. Theme/decor native mapping: done
6. Deterministic fallback + warning model: done
7. Regression barrier and editable smoke suite: done
8. Docs/manual checklist sync and rollout flag: done

## Notes

1. New mode is available in PPTX endpoint payload:
- `mode: "hybrid_native"` (default),
- `mode: "hybrid_blocks"` (recommended, text native + non-text blocks as separate raster objects),
- `mode: "raster"` (Stage 9-compatible fallback).
2. Endpoint remains:
- `POST /api/v1/presentations/:presentationId/render/pptx`.
3. Job result now includes:
- `mode`,
- `warnings[]` with optional `slideIndex` and `blockId`.
4. Editor UI updates:
- PPTX export mode selector (`hybrid_blocks` / `hybrid_native` / `raster`);
- explicit `Download` action for completed export;
- browser save picker integration (`showSaveFilePicker`) where supported.
5. Implemented native mappers:
- title/content shell,
- text/image/table/cards/chart blocks,
- token-driven decor primitives (grid/line/triangle/blob/badge).
6. Implemented `hybrid_blocks` mode:
- slide decor/background captured as raster layer;
- non-text blocks exported as separate raster objects;
- text blocks exported as native editable PPT text objects.
7. Fallback behavior:
- on native mapper failure export falls back to raster and returns `NATIVE_EXPORT_FALLBACK` warning.
8. Automated checks run:
- `npm run frontend:build` -> OK
- `npm run api:verify` -> OK
- `npm run api:smoke` -> OK
