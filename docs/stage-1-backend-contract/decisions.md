# Stage 1 Decisions (Approved)

Date: 2026-02-26

This file captures agreed decisions before implementation.

## Platform and Storage

1. Database for MVP: `SQLite`.
2. Dataset data is stored in the database (not in CSV files at runtime).

## Content Model

3. Text block content format: sanitized HTML.
4. WYSIWYG-friendly editor can be added later, while transport remains HTML.

## Theme Strategy

5. MVP supports system themes + presentation-level `themeOverrides`.
6. Full theme editor is deferred to later stage.

## Versioning and Publishing

7. Presentation lifecycle includes versions/states (`draft`, `published`).

## Rendering

8. PDF export is asynchronous through `RenderJob`.

## Security / Auth

9. MVP ships without authentication.
10. API/module boundaries must allow non-breaking auth integration later.

## Layout

11. Auto-layout only for MVP.
12. Reorder slides/blocks is supported.
13. Free pixel drag positioning is out of scope.

