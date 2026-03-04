# Stage 9 Execution Order (Strict)

Date: 2026-03-03  
Status: approved sequence

Rule:
1. Do not skip steps.
2. If gate fails, stop and fix before next step.
3. Any regression in preview/PDF blocks PPTX rollout.

## 0. Branch and baseline lock

1. Create dedicated stage branch from current stable branch.
2. Capture baseline:
- `npm run frontend:build`
- `npm run api:verify`
- `npm run api:smoke`
3. Record baseline artifacts:
- one preview HTML snapshot,
- one PDF export snapshot,
- current manual checklist result.

Gate:
- all three commands pass,
- baseline notes saved.

## 1. Contract lock before coding

1. Freeze endpoint contract for PPTX:
- `POST /api/v1/presentations/:presentationId/render/pptx`
- `GET /api/v1/render-jobs/:jobId`
2. Define warning payload shape.
3. Lock mapping matrix version reference.

Gate:
- contract documented in docs and referenced by implementation tasks.

## 2. Job layer extension

1. Add `export_pptx` to render job domain.
2. Implement queue scheduling and worker dispatch.
3. Add artifact metadata (`fileName`, `path`, warnings).

Gate:
- synthetic PPTX job can run and move through full status lifecycle.

## 3. PPTX shell and coordinate mapper

1. Build deck writer abstraction.
2. Implement slide size and coordinate transform from render model canvas.
3. Render title/content shells without blocks.

Gate:
- exported PPTX opens and contains correct number/order of slides.

## 4. Block mapping in safe sequence

Order:
1. Text blocks.
2. Image blocks.
3. Table blocks.
4. KPI/card blocks.
5. Chart blocks.

For each block type:
1. Add mapper.
2. Add at least one smoke test.
3. Validate parity on QA deck.

Gate:
- each block type green before moving to next.

## 5. Theme token application

1. Apply color/typography/spacing tokens to PPTX primitives.
2. Apply table/chart modes and supported visual presets.
3. Map logo/badge and decor primitives under Stage 8 safe rules.

Gate:
- same presentation with different themes produces expected visual delta without geometry drift.

## 6. Fallback and warning model

1. Implement deterministic fallback decisions (`safe-raster` where allowed).
2. Attach warnings to job result.
3. Ensure unsupported features never fail silently.

Gate:
- forced unsupported sample produces warning and valid PPTX.

## 7. Regression barrier

1. Re-run:
- `npm run frontend:build`
- `npm run api:verify`
- `npm run api:smoke`
2. Manual regression on checklist:
- preview unchanged,
- PDF unchanged,
- PPTX expected and readable.

Gate:
- no critical regressions.

## 8. UI release slice

1. Add PPTX export action in editor.
2. Reuse existing async status UX pattern.
3. Show warning summary on completed job.

Gate:
- user can export PPTX end-to-end from UI without API tools.

## 9. Docs and close-out

1. Update:
- stage status,
- manual checklist,
- known limitations section.
2. Record final test run IDs.

Gate:
- docs and code match.

## Stop conditions

Stop implementation and fix immediately if:
1. Preview geometry diverges from current baseline.
2. PDF export regresses visually or functionally.
3. PPTX output becomes non-openable in target viewers.
