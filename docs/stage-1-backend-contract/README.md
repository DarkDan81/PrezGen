# Stage 1 - Backend Contract

## Goal

Define a stable contract between frontend constructor UI and backend rendering engine before implementation changes.

This stage does not include feature implementation. It defines:

- domain entities and their relations;
- JSON data contracts for all core objects;
- REST API contracts (request/response/error);
- known constraints for MVP and non-goals.
- approved implementation decisions in `decisions.md`.

## Why this stage exists

The current code is optimized for one hardcoded presentation (`presentation.yaml` + one CSV + static paths).
To support a universal builder, frontend needs predictable contracts that are independent from rendering internals.

## Stage 1 Deliverables

1. Domain model and lifecycle states.
2. Object schemas for:
   - Presentation
   - Slide
   - Block (common + per-type config)
   - Dataset
   - Theme
   - RenderJob
3. API endpoint catalog for CRUD, preview, and export.
4. Validation and error format.
5. Explicit MVP limitations.

## Out of Scope

- UI implementation.
- Database schema/migrations.
- Runtime renderer refactor.
- PPTX exporter implementation.

## Acceptance Criteria

1. A frontend engineer can build forms and editor flows from this contract only.
2. A backend engineer can implement endpoints with no ambiguity about payload shape.
3. MVP limitations are explicit (for example, auto layout only, no free pixel drag).
4. Contract includes versioning rules for future backward compatibility.
5. Storage/runtime choices are explicit (SQLite, DB-backed datasets, async PDF jobs).
