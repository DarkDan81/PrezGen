# Stage 8 - PPTX-safe Theme Editor Contract

## Goal

Define and implement a strict `PPTX-safe` theme editing model where every UI-exposed theme option is exportable to PPTX without content loss.

At this stage we do **not** implement PPTX export itself.
We only prepare theme architecture and editor contract for future reliable export.

## Problem statement

Current theme system can produce rich web visuals, but some web/CSS effects are not representable in PPTX 1:1.
If we allow unsupported effects in theme editor now, future PPTX export will either:
- drop visual parts,
- rasterize too much content,
- or become inconsistent between preview and export.

## Target model

1. `PPTX-safe tokens` (editable in UI):
- palette and semantic colors;
- typography (family/weights/sizes within bounded ranges);
- basic geometry visuals (radius, border width/style);
- basic shadows (single-layer preset-based);
- logo placement and size;
- decorative background shapes with fixed primitive set (rect/circle/line/polygon presets);
- chart/table visual palette options mapped to PPTX-safe equivalents.

2. `Unsafe visuals` (not editable as first-class tokens):
- CSS animations/transitions;
- backdrop/mix-blend filters;
- arbitrary clip-path/mask compositions;
- multi-layer complex gradients requiring browser-specific rendering.

3. Rendering contract:
- preview remains deterministic;
- theme visuals that are not PPTX-safe must be blocked or converted to safe presets;
- no theme token can affect structure/layout geometry.

## Acceptance criteria

1. Theme editor UI exposes only PPTX-safe visual controls.
2. Backend validation rejects non-safe/unsupported token payload.
3. Theme schema documents exact mapping target (native PPTX object vs raster fallback).
4. Each allowed token has deterministic fallback behavior.
5. Stage docs include regression checklist for future PPTX exporter implementation.

## Out of scope

1. Implementing PPTX export pipeline.
2. Full-feature animation timeline system.
3. Arbitrary freeform vector editor.
