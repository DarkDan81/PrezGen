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
- Prioritize readability and full slot usage.
- Cards must fill available area from edge to edge (with consistent gaps), with no obvious empty strip on one side.

4. File upload controls (Image + Dataset):
- Remove native browser-looking file button from visible UI.
- Use unified custom UI control style for both image upload and dataset upload.

5. Text authoring UX:
- Add rich text editor in `Visual` mode.
- Keep `HTML` mode for direct code editing.
- Add mode switch `Visual <-> HTML`.
- Allow free-form HTML edits in code mode, then sanitize on save/render path.
- Support full color choice plus quick-access swatches from active theme.

## Acceptance criteria

1. Slide type is visually read-only and no longer suggests click/edit interaction.
2. Chart block has no `Limit` field in frontend settings.
3. KPI cards adapt to block size/count and consume available slot area without awkward leftover space.
4. Image and dataset uploads use the same custom-styled trigger component.
5. Text block supports both visual editing and manual HTML editing, with stable switching between modes.
6. Sanitization still protects rendering output after HTML mode edits.
7. Theme colors are immediately accessible in text color picker.

## Out of scope

1. Reworking backend chart query/aggregation logic (except existing safety cap retention).
2. Freeform drag-resize image positioning across entire slide canvas.
3. Theme versioning/history.

