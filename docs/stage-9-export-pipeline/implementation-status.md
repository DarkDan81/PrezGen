# Stage 9 Implementation Status

## Current state

Planning ready. Implementation not started.

## Baseline before implementation

1. PDF export path exists and is used in UI.
2. Stage 8 provides PPTX-safe token contract for theme editing.
3. PPTX exporter endpoint is reserved in earlier contracts but not implemented.

## Stage checklist

1. Contract lock: pending
2. Job orchestration (`export_pptx`): pending
3. PPTX shell builder: pending
4. Block mappers: pending
5. Token/decor mappers: pending
6. Warning/fallback model: pending
7. UI integration: pending
8. Regression pass + docs sync: pending

## Notes

1. Stage order is defined in `execution-order.md`.
2. Any change that regresses preview or PDF blocks stage progress until fixed.
