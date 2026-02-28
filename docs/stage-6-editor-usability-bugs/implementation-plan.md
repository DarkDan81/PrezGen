# Stage 6 Implementation Plan

## Sequence

1. UI semantics cleanup
- Slide type field -> static text.
- Remove chart `Limit` field from frontend form.

2. Shared upload control
- Create shared upload trigger component (button + dropzone wrapper pattern).
- Migrate image upload UI.
- Migrate dataset upload UI.

3. KPI adaptive grid
- Introduce adaptive KPI layout algorithm by slot dimensions + item count.
- Tune min/max card width and gap rules.
- Keep cluster centered when free space remains.
- Validate across common layouts (2x2, image/content mixed layouts).

4. Rich text editor foundation
- Add TipTap dependencies and wrapper component.
- Implement toolbar with practical defaults (headings, bold, italic, lists, link, colors, undo/redo).
- Add `Visual/HTML` switch and two-way sync.

5. Theme-aware color UX
- Pull active theme colors for quick swatches in text editor.
- Keep full custom color picker available.

6. Sanitization and regression pass
- Verify sanitizer compatibility with new editor output.
- Validate preview and PDF parity on updated text samples.

7. Layout preset cleanup
- Drop deprecated `layout-single-column` from seeded system preset list.
- Update QA seed and manual checks accordingly.

## Technical notes

1. Keep existing HTML schema compatibility with render engine.
2. Avoid introducing non-sanitized styles outside approved whitelist.
3. Keep backend safety limits unchanged for chart/query operations.

## Suggested commit slicing

1. `refactor(editor): make slide type read-only label and remove chart limit input`
2. `feat(ui): unify custom upload controls for image and dataset`
3. `feat(kpi): adaptive card grid filling slot space`
4. `feat(text): add tiptap visual editor with html toggle`
5. `feat(text): add theme palette swatches and sanitizer compatibility fixes`
6. `docs(stage-6): update status and manual checks`
