# Stage 6 Implementation Status

## Current state

Stage created, scope fixed, implementation not started.

## Planned items

1. Slide type shown as static text in properties panel.
2. Chart `Limit` removed from frontend block settings (backend cap retained).
3. KPI adaptive layout (readability-first, full-slot occupation).
4. Unified custom upload controls for image and dataset flows.
5. TipTap-based visual text editor with `Visual/HTML` switch.
6. Theme swatches in text color picker + custom color support.
7. Sanitizer regression validation for text editor output.

## Risks to watch

1. Visual/HTML synchronization edge cases in rich text mode switching.
2. KPI auto-grid behavior across very narrow/wide slot geometries.
3. Browser-specific file input behavior while wrapping native input in custom UI.

## Exit condition

All planned items shipped and reflected in `docs/manual-test-checklist.md` with updated manual QA steps.

