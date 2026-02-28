# Stage 7 Implementation Plan

## Phase 1. Audit and mapping

1. Inventory all layout-affecting rules currently inside `themes/eurofoods/styles.css`.
2. Classify each rule as:
- structural (must move to shared layer),
- visual (can stay theme-driven),
- mixed (split into structural + visual parts).
3. Produce rule-to-target mapping table.

## Phase 2. Structural stylesheet extraction

1. Create shared structural stylesheet(s) for:
- slide/slot geometry helpers,
- block internal spacing contracts,
- overflow/wrapping behavior,
- card/chart/table baseline dimensions.
2. Remove equivalent structural declarations from theme CSS.
3. Keep class names stable to avoid render regressions.

## Phase 3. Theme token narrowing

1. Reduce theme-editor scope to visual-only controls.
2. Remove/disable spacing controls that affect layout behavior.
3. Align backend token validation with narrowed contract.

## Phase 4. Runtime guardrails

1. Prevent theme CSS/payload from injecting forbidden structural properties.
2. Add validation warnings/errors for out-of-contract properties.
3. Ensure preview + PDF consume same structural layer.

## Phase 5. Regression and docs sync

1. Run QA demo deck across multiple themes (same layouts).
2. Verify no geometry drift between themes.
3. Update:
- `docs/manual-test-checklist.md`,
- stage status docs,
- architecture notes for theme system.

## Suggested commit slicing

1. `stage7: audit eurofoods css into structure vs skin map`
2. `stage7: extract shared structural css and remove theme structural rules`
3. `stage7: narrow theme editor to visual-only token controls`
4. `stage7: enforce theme payload validation against structural overrides`
5. `stage7: update checklist and docs for new theme contract`

