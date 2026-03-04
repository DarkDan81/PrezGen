# Stage 9 Implementation Status

## Current state

Implemented and validated.

## Baseline before implementation

1. PDF export path exists and is used in UI.
2. Stage 8 provides PPTX-safe token contract for theme editing.
3. PPTX exporter endpoint is reserved in earlier contracts but not implemented.

## Stage checklist

1. Contract lock: done
2. Job orchestration (`export_pptx_future` via `POST /render/pptx`): done
3. PPTX shell builder: done
4. Block mappers: done (`safe-raster` full-slide strategy)
5. Token/decor mappers: done (covered by shared preview renderer before raster capture)
6. Warning/fallback model: done (`SAFE_RASTER_EXPORT` warning in job result)
7. UI integration: done (editor button + async status + warnings counter)
8. Regression pass + docs sync: done

## Notes

1. Implemented PPTX path:
- endpoint: `POST /api/v1/presentations/:presentationId/render/pptx`;
- async job type in storage: `export_pptx_future` (existing domain value);
- artifact: `/dist/export/presentation_<presentationId>_<jobId>.pptx`.
2. PPTX generation mode in Stage 9:
- deterministic slide rasterization via Puppeteer screenshots of `.slide-frame`;
- one image per slide mapped into PPTX `LAYOUT_WIDE`.
3. Regression and validation commands executed:
- `npm run frontend:build` -> OK;
- `npm run api:verify` -> OK;
- `npm run api:smoke` -> OK.
4. Current known limitation (explicit by design in Stage 9):
- PPTX is image-based (non-editable native PPT primitives are out of this stage scope).
