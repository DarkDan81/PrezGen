# Stage 3 - Frontend MVP

## Goal

Build a constructor UI on top of existing backend API without coupling visual layout to business logic.

Primary requirement:

- We must be able to redesign the constructor UI later (including dark mode and full visual restyle) without rewriting API/business flows.

## Product Scope (MVP)

## What users will be able to do

1. Create and open presentations.
2. Manage slides (create, reorder, update, delete).
3. Manage blocks in each slide (create, edit, reorder, delete).
4. Manage datasets:
   - create manual table datasets;
   - upload CSV datasets.
5. Select theme for presentation.
6. Open preview.
7. Run PDF export and see async job status.

## What is intentionally out of scope in MVP

1. Free pixel drag-and-drop layout like PowerPoint/Figma.
2. Per-element absolute positioning/overlap timeline.
3. Full visual CSS theme builder for presentation themes.
4. Real-time multi-user collaboration.

## Key Non-Functional Requirements

1. UI composability:
   - controls can move around in layout without touching API logic.
2. Design flexibility:
   - light/dark constructor theme support via design tokens.
3. Reliability:
   - explicit API error handling and recoverable UX states.
4. Maintainability:
   - typed API contracts and isolated state logic.

## Recommended Frontend Stack

1. `React + TypeScript + Vite`
2. `React Router`
3. `TanStack Query` for server-state and job polling
4. `React Hook Form + Zod` for form handling/validation
5. `dnd-kit` for slide/block reorder
6. `CSS Modules + CSS Variables` (or token-based styling layer)

Why this stack:

- Strong separation between UI composition and API behavior.
- Easy redesign later (same hooks/state, different component layout/style).
- Good fit for form-heavy editor with async operations.

## Frontend Architecture

## Layers

1. `api/`:
   - typed HTTP client and endpoint functions.
2. `features/`:
   - presentation list, editor, datasets, preview/export.
3. `shared/ui/`:
   - reusable visual components.
4. `shared/theme/`:
   - constructor design tokens and light/dark switch.
5. `app/`:
   - routing, providers, app shell.

## Rule: Compose UI, reuse logic

- Business logic and server interactions live in hooks/services.
- Visual placement (panels, buttons, sections) is only layout code.
- Re-layout or full redesign must not require API layer rewrites.

## Target MVP Screens

1. Presentations List
2. Editor
3. Datasets Manager
4. Preview/Export controls (in editor top bar)

## Editor Composition (initial)

1. Left panel: slides + block tree.
2. Center panel: selected context info and actions.
3. Right panel: property form (slide or block config).
4. Top bar: theme picker, preview, export PDF.

Note:

- This composition is not fixed forever; it is initial only.
- Any later layout change should preserve same hooks/API contracts.

## Theming the Constructor Itself

The constructor UI theme (not presentation theme) will use:

1. CSS variables for color, radius, spacing, typography.
2. theme modes: `light`, `dark`.
3. optional `system` mode in future.

This allows:

- easy visual redesign;
- dark mode with minimal refactor;
- custom styling expansion later.

## Risks and Mitigations

1. Risk: block forms become hardcoded and brittle.
   - Mitigation: schema-driven form sections per block type.
2. Risk: API errors produce broken UX.
   - Mitigation: standardized error parser and inline field messages.
3. Risk: preview/export latency confusion.
   - Mitigation: explicit statuses (`idle/running/success/failed`) and progress UI.

## Definition of Done for Stage 3 MVP

1. Full CRUD flows for presentation/slide/block/dataset are usable from UI.
2. Preview and PDF export can be triggered from UI.
3. Reordering slides/blocks works via drag-and-drop.
4. Constructor light/dark mode works.
5. Core logic remains reusable after layout changes.

