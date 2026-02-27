# Stage 4 UI Inventory

Date: 2026-02-27
Status: baseline before UX polish implementation

## Screen Coverage

1. Presentations list/create screen (`/`).
2. Editor screen (`/presentations/:id`) including dataset modal.

## Key Inconsistencies Found

1. Mixed action patterns:
   - Text link used for primary navigation (`Back`) in editor header.
   - Link-like button pattern in presentations list (`.linklike`) coexists with regular buttons.
2. Global style conflicts:
   - Legacy Vite defaults in `frontend/src/index.css` define global `button`, `a`, `body`, `h1`.
   - Feature-level styles (`presentations.css`, `editor.css`) also define controls, causing inconsistent look and precedence risk.
3. Control style fragmentation:
   - Button variants are implicit (`primary`, `danger`, `soft-danger`) and incomplete across screens.
   - Form controls are styled in `presentations.css` but not standardized as shared primitives.
4. Information architecture gaps:
   - Right panel uses one generic `Properties` block instead of clear section cards (`Slide Settings`, `Block Settings`, `Datasets`).
5. Terminology/casing inconsistency:
   - Block type labels shown in lowercase (`text`, `image`, `chart`, `table`, `kpi`).
   - UI copy mixes terse and descriptive patterns.
6. Save-state visibility:
   - No explicit global autosave state in header (`Saving...`, `Saved`, `Error`).

## Temporary Visual Baseline (No External Reference)

1. Keep existing palette tokens from `frontend/src/styles.css`.
2. Normalize controls with shared primitive classes:
   - button variants: `primary`, `secondary`, `danger`, `ghost`;
   - shared field wrappers for label + control spacing;
   - section-card layout for right panel and list groups.
3. Avoid logic/API changes in foundation pass.
4. Keep responsive behavior for desktop/mobile.

## Stage 4 Foundation Targets

1. Introduce shared UI primitives:
   - `Button`
   - `Field`
   - `SectionCard`
2. Migrate `PresentationsPage` and `EditorPage` to primitives.
3. Keep `BlockConfigForm` behavior unchanged while normalizing visual wrappers.
