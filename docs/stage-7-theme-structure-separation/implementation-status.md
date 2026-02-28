# Stage 7 Implementation Status

## Current state

Stage created. Implementation not started.

## Planned deliverables

1. Structural CSS layer extracted from `eurofoods` theme-dependent rules.
2. Theme CSS limited to visual skin properties.
3. Theme editor reduced to visual-only token controls.
4. Backend theme validation aligned with visual-only contract.
5. Manual QA checklist updated for no-geometry-drift validation.

## Risks

1. Hidden coupling between old theme CSS and block render behavior.
2. Visual regressions while extracting mixed rules.
3. Token compatibility issues for already saved custom themes.

## Exit condition

Applying any valid theme changes only visual appearance and never changes:
- layout preset geometry,
- block spacing behavior,
- content flow footprint.

