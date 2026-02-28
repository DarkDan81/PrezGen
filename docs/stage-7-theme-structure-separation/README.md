# Stage 7 - Theme vs Structure Separation

## Goal

Make themes purely visual (`Skin`) and make layout/spacing behavior purely structural (`Structure`), so any theme can be applied without breaking slide geometry.

Scope baseline for this stage:
- only `eurofoods` is considered canonical;
- `cyberpunk` is out of scope and ignored for implementation decisions.

## Target model

1. `Structure` layer (theme-independent):
- slide/grid/slot geometry;
- block spacing, internal paddings, min/max sizing;
- overflow/wrapping/scaling behavior;
- deterministic block render rules.

2. `Skin` layer (theme-dependent):
- colors and contrast sets;
- font families/weights (within validated ranges);
- decorative visual effects (shadows, gradients, borders, radii);
- chart/table visual palettes.

Themes must not alter structural CSS properties such as:
- `display`, `grid-*`, `flex-*`, `position`,
- `width/height/min/max`,
- `margin/padding/gap`,
- layout-affecting transforms.

## Acceptance criteria

1. Changing theme cannot alter slot geometry, block footprint, or content flow behavior.
2. All spacing and layout rules are sourced from shared structural styles, not theme CSS.
3. Theme editor controls only visual tokens (colors, typography, decorative geometry, palettes).
4. Theme save/apply path validates token ranges and rejects layout-affecting payload.
5. Preview and export remain visually consistent for the same structure with different themes.

## Out of scope

1. Rebuilding `cyberpunk` theme parity.
2. New layout preset families.
3. Rewriting rendering engine architecture from scratch.

