# Stage 9 - Export Pipeline (PDF + PPTX)

## Goal

Implement a production-safe export pipeline where:

1. PDF export remains stable and visually consistent with preview.
2. PPTX export is added with deterministic output and explicit capability boundaries.
3. Existing editor/theme/layout behavior does not regress.

## Why this stage exists

Stage 8 introduced a `PPTX-safe` theme contract but did not implement PPTX export.
Stage 9 is the first implementation stage that converts presentation model into `.pptx`.

At the same time, Stage 9 must keep PDF path reliable, because PDF is already in active use.

## Scope

In scope:

1. Export architecture and job model for `export_pdf` + `export_pptx`.
2. PPTX builder implementation for supported primitives:
- slide backgrounds,
- text,
- tables,
- charts (mapped subset),
- KPI/cards,
- image blocks,
- safe decor layer (logo + supported shapes).
3. Fallback rules for non-native PPTX mappings (`safe-raster` behavior).
4. Validation and warning model for unsupported or degraded features.
5. Regression suite for preview/PDF parity and PPTX structural fidelity.

Out of scope:

1. Animation/timeline export.
2. Web-only visual effects that are explicitly non-PPTX.
3. Freeform PPT editing parity with every browser/CSS behavior.

## Acceptance criteria

1. `POST /api/v1/presentations/:presentationId/render/pptx` is implemented and documented.
2. PPTX render jobs complete asynchronously using the same job orchestration model as PDF.
3. Exported PPTX opens in PowerPoint/LibreOffice without corruption.
4. For supported token/block set, PPTX layout matches preview geometry (within declared tolerance).
5. If a feature is degraded/rasterized, warnings are surfaced in stable API/UI form.
6. PDF export path keeps current behavior and passes regression checks.
7. Docs include known gaps and exact mapping policy per block/token class.

## Deliverables

1. Stage docs:
- `decisions.md`
- `implementation-plan.md`
- `execution-order.md`
- `implementation-status.md`
2. API contract updates for PPTX render endpoints/status.
3. Automated and manual test checklist extensions for export parity.
