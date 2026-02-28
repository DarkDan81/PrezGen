# Stage 8 Decisions

Status: approved

## 1. Export-first theme contract

Decision:
- Theme editor contract is designed from PPTX compatibility backward.
- If a visual option cannot be represented reliably in PPTX, it is not exposed as a first-class token.

## 2. Safe/unsafe capability split

Decision:
- Introduce explicit capability matrix:
  - `safe-native`: can map to PPTX native primitives;
  - `safe-raster`: can be exported as image layer with deterministic quality;
  - `unsafe`: blocked from editor contract for now.

## 3. No structural coupling

Decision:
- Stage 7 boundary remains strict:
  - themes cannot alter structure/geometry,
  - layout remains engine-level.
- Stage 8 extends only visual capabilities inside that boundary.

## 4. Decor layer model

Decision:
- Add dedicated `decor` token group:
  - `logo`,
  - `backgroundShapes[]`,
  - simple visual effects presets.
- Decor always renders in non-interactive background layer under content.

## 5. Animation policy

Decision:
- No general animation tokens in PPTX-safe editor.
- Future web-only animation profile may be added separately and explicitly marked non-PPTX.

## 6. Migration policy

Decision:
- Existing themes are normalized to new schema:
  - unsupported fields ignored + warning,
  - supported fields preserved.
- No silent structural overrides are allowed.
