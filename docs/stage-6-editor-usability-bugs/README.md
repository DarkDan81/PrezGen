# Stage 6 - Editor Usability and Content Authoring

## Goal

Consolidate the next UX/authoring improvements into one implementation stage so frontend behavior is predictable, consistent, and easier to test.

This stage is planning-only at the moment (no code changes in this document set).

## Scope

1. Slide type field in the right panel:
- Replace interactive-looking field with plain non-clickable text.

2. Chart block settings:
- Remove `Limit` from frontend UI.
- Keep backend-side safety limit for large datasets.

3. KPI block layout behavior:
- Replace fixed "three cards per row" behavior with adaptive layout.
- Prioritize readability and overflow safety.
- Card cluster should stay visually centered in slot when free space remains.

4. File upload controls (Image + Dataset):
- Remove native browser-looking file button from visible UI.
- Use unified custom UI control style for both image upload and dataset upload.

5. Text authoring UX:
- Add rich text editor in `Visual` mode.
- Keep `HTML` mode for direct code editing.
- Add mode switch `Visual <-> HTML`.
- Allow free-form HTML edits in code mode, then sanitize on save/render path.
- Support full color choice plus quick-access swatches from active theme.

6. Layout preset cleanup:
- Remove deprecated `layout-single-column` (stacked `main + secondary`) from available system presets.

7. Card value readability:
- Compact large numeric values in cards (`млн/млрд/трлн`), while keeping thousands unsuffixed.

## Acceptance criteria

1. Slide type is visually read-only and no longer suggests click/edit interaction.
2. Chart block has no `Limit` field in frontend settings.
3. Cards adapt to block size/count and remain readable without value overflow.
4. Image and dataset uploads use the same custom-styled trigger component.
5. Text block supports both visual editing and manual HTML editing, with stable switching between modes.
6. Sanitization still protects rendering output after HTML mode edits.
7. Theme colors are immediately accessible in text color picker.
8. `layout-single-column` is not available in layout preset catalog.

## Out of scope

1. Reworking backend chart query/aggregation logic (except existing safety cap retention).
2. Freeform drag-resize image positioning across entire slide canvas.
3. Theme versioning/history.
