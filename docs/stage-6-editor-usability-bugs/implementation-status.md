# Stage 6 Implementation Status

## Current state

Implementation in progress.

Completed in current iteration:

1. Slide type in properties panel is rendered as static read-only text.
2. Chart `Limit` field removed from frontend chart block settings.
3. Shared custom file upload control introduced and wired to:
   - image block upload;
   - dataset CSV upload.
4. Text block switched from plain textarea to dual-mode editor:
   - `Visual` mode (TipTap toolbar);
   - `HTML` mode with manual source editing and apply action.
5. Theme color quick swatches added to visual text color controls.
6. KPI block rendering switched to auto-grid classes with theme CSS updates for full-slot grid stretching.
7. Card cluster alignment adjusted to centered placement in slot (no forced edge-to-edge stretching).
8. Large card values now compact-format to `млн/млрд/трлн`; thousands remain full-formatted.
9. Deprecated `layout-single-column` preset removed from system layout catalog.
10. QA demo seed updated to avoid deprecated stacked single-column pattern.

## Planned items

1. Manual QA validation pass for card behavior across all dense layout presets.
2. Manual QA validation pass for visual/code mode sync edge-cases.
3. Sync `docs/manual-test-checklist.md` with finalized Stage 6 expected behavior.

## Risks to watch

1. Visual/HTML synchronization edge cases in rich text mode switching.
2. KPI auto-grid behavior across very narrow/wide slot geometries.
3. Browser-specific file input behavior while wrapping native input in custom UI.

## Exit condition

All planned items shipped and reflected in `docs/manual-test-checklist.md` with updated manual QA steps.
