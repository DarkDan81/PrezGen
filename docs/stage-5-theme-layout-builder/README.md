# Stage 5 - Theme and Layout Builder

Date: 2026-02-27
Status: planned

Related:

- `decisions.md` - approved product and technical decisions.
- `schema-contract.md` - draft contracts for theme tokens and layout presets.
- `implementation-plan.md` - staged execution plan.
- `execution-order.md` - detailed step-by-step runbook with exact implementation order.

## Goal

Build a scalable presentation theming system and layout preset system where visual style and slide geometry are independent.

## Core Principle

1. `Theme` defines visual tokens (colors, typography, component styles).
2. `LayoutPreset` defines geometry (grid/areas/slots).
3. Block render styles must depend on tokens, not on a hardcoded layout structure.

## Scope

1. Add dedicated theme editor screen (separate from presentation editor).
2. Support theme lifecycle:
   - system themes (`read-only`);
   - user themes (`create`, `duplicate`, `edit`, `save`).
3. Store themes in DB (primary source of truth).
4. Add layout presets as a separate model.
5. Add validation/warnings for dangerous token values (too small/large/low contrast).
6. Ensure preview and PDF use the same final theme/layout rendering path.
7. Prepare import/export foundation without full MVP UI flow.

## Out of Scope (Stage 5 MVP)

1. Full visual versioning/rollback for themes.
2. Freeform pixel drag-and-drop layout.
3. Custom font uploads (fixed font list only).
4. Full user-facing import/export UX wizard.

## Acceptance Criteria

1. Theme tokens can be edited without touching raw CSS.
2. Layout presets can change slide geometry without rewriting block styles.
3. System themes cannot be directly overwritten.
4. Theme can be immediately applied to a presentation.
5. Preview and PDF output remain visually consistent.
6. At least one production theme (`Eurofoods`) and one alternative theme are valid in new model.

## Handoff Notes

1. Stage 4 already introduced constructor i18n and UI consistency foundation.
2. Stage 5 should reuse existing render pipeline and avoid breaking existing API flows.
3. Prioritize contract stability (tokens/layout schema) before broad UI work.
