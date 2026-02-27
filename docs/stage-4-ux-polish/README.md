# Stage 4 - UX Polish and UI Consistency

Date: 2026-02-27
Status: planned (no implementation in this stage doc yet)

## Goal

Improve constructor usability and visual consistency without changing core backend contracts or render model.

## Scope

1. Visual consistency of controls:
   - unify all button styles (`primary`, `secondary`, `danger`, `ghost`);
   - replace mixed link/button patterns (for example `Back`) with consistent button-like controls;
   - align form controls (`input/select/textarea`) to one style system.
2. Right panel information architecture:
   - split into clearly separated sections/cards:
     - `Slide Settings`
     - `Block Settings`
     - `Datasets`
   - improve visual grouping using borders, section headers, spacing, and hierarchy.
3. Slides/blocks list readability:
   - rework list items in constructor style (not browser-default look);
   - normalize block naming and labels in Title Case:
     - `Text`, `Image`, `Chart`, `Table`, `KPI`.
4. Text and terminology cleanup:
   - unify labels/placeholders/messages to one tone and naming pattern;
   - remove mixed wording and inconsistent casing.
5. Save-state clarity:
   - show explicit status in header/panel:
     - `Saving...`
     - `Saved`
     - `Error`.
6. Localization preparation (implementation-final step):
   - introduce dictionary-driven text layer (`t('key')` style API);
   - keep translations centralized to allow full RU/EN switch later.

## Explicitly Out of Scope

1. New rendering logic or layout algorithm changes.
2. New backend entities or API contract redesign.
3. Free drag-and-drop pixel positioning.
4. New visual theme builder for presentation themes.

## Implementation Strategy

1. Iteration 1 (foundation):
   - base UI primitives (`Button`, `Field`, `SectionCard`);
   - apply to editor header + right panel + list rows;
   - keep behavior unchanged.
2. Iteration 2 (UX refinement):
   - naming/labels cleanup;
   - save status indicators;
   - accessibility pass (focus, keyboard, contrast).
3. Iteration 3 (i18n prep):
   - move strings to dictionary;
   - add language switch scaffold (default RU or current locale decision later).

## Acceptance Criteria

1. No mixed link/button patterns in main editor actions.
2. Slide/block/dataset settings are visually separated and scan-friendly.
3. Block/slide labels are consistent in style and naming.
4. Save status is visible and reliable during autosave actions.
5. UI copy is centralized and ready for full translation rollout.

## Risks and Mitigations

1. Risk: visual refactor introduces behavior regressions.
   - Mitigation: keep logic/hooks untouched and refactor mostly at component/style layer.
2. Risk: large CSS changes break preview/editor responsiveness.
   - Mitigation: incremental rollout with desktop/mobile sanity checks each iteration.
3. Risk: i18n added too early creates churn.
   - Mitigation: complete wording cleanup first, then dictionary extraction.

## Handoff Notes for Next Chat

1. Functional MVP flows are already implemented and verified.
2. Stage 4 is UX-focused; avoid backend/render churn unless bug is discovered.
3. Prioritize consistency and clarity over adding new features.
