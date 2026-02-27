# Stage 4 Decisions (Approved)

Date: 2026-02-27

## Scope and Priority

1. Stage 4 covers the whole frontend UI surface, not editor-only polish.
2. Task order is flexible; implementation can run in parallel where safe.
3. Functional behavior from Stage 3 remains baseline; Stage 4 focuses on UX consistency.

## Localization Direction

4. Current UI is English-first.
5. Final localization target default is Russian (`ru`) for constructor UI.
6. Language switch implementation is postponed to the final Step of Stage 4.
7. Before switch implementation, frontend must be prepared with centralized dictionary-driven text keys to avoid later rewrite.

## Save Status UX

8. Save status indicator is global (top-level), not duplicated per-form/section.
9. Supported statuses:
   - `Saving...`
   - `Saved`
   - `Error`

## Visual Baseline (Temporary)

10. No external visual reference (Figma/style guide) is mandatory for this stage start.
11. Temporary style baseline should be documented and applied consistently.
12. Full visual style lock can be revisited after live review.
