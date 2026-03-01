# Stage 8 Implementation Plan

## Phase 1. PPTX-safe capability matrix

1. Define token-by-token matrix:
- token name,
- allowed value range,
- preview rendering path,
- future PPTX mapping mode (`safe-native` / `safe-raster`).
2. Mark unsupported/blocked token classes.
3. Freeze matrix as source of truth for editor and validation.

Deliverable:
- `pptx-safe-matrix.md` (new document in this stage folder).

## Phase 2. Theme schema v2 (safe contract)

1. Introduce schema version for theme tokens.
2. Add grouped sections:
- `color`,
- `typography`,
- `surfaces` (radius/border/shadow presets),
- `decor` (logo + shapes),
- `chart`,
- `table`.
3. Add deterministic defaults for each section.

Deliverable:
- schema contract draft in docs + JSON examples.

## Phase 3. Backend validation and normalization

1. Extend validation with whitelist-based schema checks.
2. Reject unsupported token groups and unsafe values.
3. Add normalization layer:
- clamp numeric ranges,
- resolve preset aliases,
- emit warnings for deprecated/ignored keys.

Deliverable:
- validation rules documented and test cases listed.

## Phase 4. Theme editor UI scope expansion (safe only)

1. Add sections in editor:
- Logo (asset + position + size + opacity),
- Background shapes (preset library + position + style),
- Surface presets (card/table/chart simple shadows and borders).
2. Hide/disable unsafe options with explicit reason tooltip.
3. Add `PPTX-safe preview mode` badge/indicator.

Deliverable:
- updated UX spec and field list.

## Phase 5. Integrated live preview (ideal target)

1. Add built-in live preview panel on `/themes` page with zero-click updates:
- token change -> immediate visual update (no manual refresh button).
2. Use fixed "golden scenes" preview set:
- title slide,
- dense content slide,
- table-heavy slide,
- chart-heavy slide,
- cards-heavy slide.
3. Add quick scene switcher to focus on specific token groups.
4. Add before/after compare mode:
- split view or toggle baseline/current.
5. Add safety indicators inside preview:
- `PPTX-safe` badge for current scene,
- warning overlays for contrast/range issues.
6. Ensure preview parity contract:
- same token pipeline as runtime render (no separate mock styling).

Deliverable:
- deterministic live preview UX and acceptance checklist.

## Phase 6. Compatibility and migration

1. Provide migration behavior for existing themes:
- read old themes,
- map known fields,
- warn on dropped unsupported fields.
2. Add dry-run validation endpoint plan for future CI checks.

Deliverable:
- migration notes + compatibility table.

## Phase 7. QA and documentation sync

1. Add manual checklist section:
- PPTX-safe token persistence,
- deterministic preview,
- warning behavior.
2. Update stage status and top-level docs index.

Deliverable:
- completed `implementation-status.md`.

## Suggested commit slicing

1. `stage8: define pptx-safe token capability matrix`
2. `stage8: add theme schema v2 and defaults`
3. `stage8: enforce backend whitelist validation and normalization`
4. `stage8: expand theme editor with safe decor controls`
5. `stage8: add integrated live preview with golden scenes and compare mode`
6. `stage8: add migration handling and docs/checklist updates`
