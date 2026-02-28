# Stage 7 Decisions

Status: approved

## 1. Canonical theme baseline

Decision:
- Use `eurofoods` as the only reference theme during this stage.
- Ignore `cyberpunk` for architectural constraints and pass criteria.

## 2. Hard layer boundary

Decision:
- Introduce strict split: `Structure` vs `Skin`.
- Structure is shared/global and cannot be overridden by theme files.

## 3. Theme token contract

Decision:
- Theme tokens can manage:
  - color primitives and semantic color roles;
  - typography family/weight/size within validated limits;
  - decorative appearance (radius, border style, shadow intensity);
  - chart/table palette settings.
- Theme tokens cannot manage layout dimensions, spacing, or slot rules.

## 4. CSS governance

Decision:
- Move layout-critical rules into one structural stylesheet layer.
- Theme styles consume CSS variables only for visual properties.

## 5. Validation enforcement

Decision:
- Backend validation rejects/strips layout-affecting theme payload.
- Frontend editor hides/removes controls that touch structural spacing/layout.

