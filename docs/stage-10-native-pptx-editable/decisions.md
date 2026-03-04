# Stage 10 Decisions

Status: approved

## 1. Native-first export strategy

Decision:
- Default mapper strategy is `native`.
- Rasterization is used only when feature is outside declared editable subset.

## 2. Geometry source of truth

Decision:
- Geometry is derived from existing resolved render model (`1920x1080`) and transformed into PPTX units.
- No independent PPTX layout engine.

## 3. Explicit degradation policy

Decision:
- Every fallback adds structured warning:
  - `slideIndex`,
  - `blockId` (if applicable),
  - `code`,
  - `message`.

## 4. Editability over pixel-perfect effects

Decision:
- If visual effect conflicts with editability, prefer editable native primitive for default mode.
- Optional future mode may prioritize fidelity over editability.

## 5. Chart subset freeze

Decision:
- Stage 10 maps only supported chart kinds to native PPTX charts.
- Unsupported chart configs are rasterized per-block with warning.

## 6. Typography stability contract

Decision:
- Use tokenized typography only; no ad-hoc CSS extraction.
- Text run style mapping supports the approved rich-text subset.

## 7. Backward compatibility

Decision:
- Keep Stage 9 raster mode available as fallback route/flag until Stage 10 reaches parity sign-off.
