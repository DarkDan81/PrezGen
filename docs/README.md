# PrezGen Documentation

This folder contains product and technical specifications used before implementation.

Current scope:

- Stage 1: backend contract and data model definition.
- Stage 2: backend MVP implementation slices.
- Stage 3: frontend MVP planning and implementation scope.
- Stage 4: UX polish planning for constructor consistency and localization prep.
- Stage 5: theme and layout builder planning (tokens, presets, dedicated editor).
- Stage 6: editor usability and content authoring improvements (rich text, KPI layout, upload UX unification).
- Stage 7: strict separation of theme skin from structural layout behavior.
- Stage 8: PPTX-safe theme editor contract (visual capabilities constrained to exportable model).
- Stage 9: export pipeline hardening (PDF parity) and PPTX export implementation.

Structure:

- `stage-1-backend-contract/README.md` - stage overview and acceptance criteria.
- `stage-1-backend-contract/decisions.md` - approved decisions for MVP scope.
- `stage-1-backend-contract/entity-model.md` - domain entities and relations.
- `stage-1-backend-contract/schema-catalog.md` - canonical JSON object shapes and validation rules.
- `stage-1-backend-contract/api-contract.md` - REST API contracts for frontend/backend integration.
- `stage-2-backend-mvp/README.md` - current implementation scope and run instructions.
- `stage-3-frontend-mvp/README.md` - frontend MVP architecture and boundaries.
- `stage-3-frontend-mvp/decisions.md` - approved frontend implementation decisions.
- `stage-3-frontend-mvp/open-questions.md` - implementation decisions to approve before coding.
- `stage-3-frontend-mvp/implementation-status.md` - implemented frontend slices and current gaps.
- `stage-4-ux-polish/README.md` - next-stage UX polish roadmap and acceptance criteria.
- `stage-4-ux-polish/decisions.md` - approved UX polish decisions and stage constraints.
- `stage-4-ux-polish/ui-inventory.md` - frontend UI inconsistency inventory for polish pass.
- `stage-4-ux-polish/implementation-status.md` - implemented UX polish slices and current state.
- `stage-5-theme-layout-builder/README.md` - stage overview and acceptance criteria.
- `stage-5-theme-layout-builder/decisions.md` - approved decisions for theme/layout direction.
- `stage-5-theme-layout-builder/schema-contract.md` - draft schema and API contract for implementation.
- `stage-5-theme-layout-builder/implementation-plan.md` - phased execution plan.
- `stage-5-theme-layout-builder/execution-order.md` - detailed implementation runbook and commit order.
- `stage-5-theme-layout-builder/implementation-status.md` - current implementation progress for stage 5.
- `stage-6-editor-usability-bugs/README.md` - stage overview and acceptance criteria.
- `stage-6-editor-usability-bugs/decisions.md` - approved implementation decisions for usability scope.
- `stage-6-editor-usability-bugs/implementation-plan.md` - phased implementation plan and commit slicing.
- `stage-6-editor-usability-bugs/implementation-status.md` - current implementation status for stage 6.
- `stage-7-theme-structure-separation/README.md` - stage overview and acceptance criteria.
- `stage-7-theme-structure-separation/decisions.md` - approved decisions for structure vs skin boundary.
- `stage-7-theme-structure-separation/implementation-plan.md` - phased implementation plan.
- `stage-7-theme-structure-separation/implementation-status.md` - current implementation status for stage 7.
- `stage-8-pptx-safe-theme-editor/README.md` - stage overview and acceptance criteria for PPTX-safe theme editing.
- `stage-8-pptx-safe-theme-editor/decisions.md` - approved export-first constraints and safety model.
- `stage-8-pptx-safe-theme-editor/implementation-plan.md` - phased implementation plan for schema/validation/editor.
- `stage-8-pptx-safe-theme-editor/implementation-status.md` - current implementation status for stage 8.
- `stage-8-pptx-safe-theme-editor/pptx-safe-matrix.md` - draft capability matrix (`safe-native`/`safe-raster`/`blocked`).
- `stage-9-export-pipeline/README.md` - stage overview and acceptance criteria for PDF/PPTX export pipeline.
- `stage-9-export-pipeline/decisions.md` - approved implementation decisions and output constraints.
- `stage-9-export-pipeline/implementation-plan.md` - phased implementation plan and risk gates.
- `stage-9-export-pipeline/execution-order.md` - strict step-by-step runbook for safe delivery.
- `stage-9-export-pipeline/implementation-status.md` - progress/status tracker for stage 9.
- `qa-demo-deck-assets.md` - source image naming and run instructions for QA demo deck seed script.
