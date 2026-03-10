# Stage 12 - UI Control Normalization

Date: 2026-03-10
Status: planned

Related:

- `decisions.md` - approved constraints for button/select normalization.
- `implementation-status.md` - implementation progress and manual QA notes.

## Goal

Normalize the sizing and typography of action controls across the main user-facing screens so the product stops looking uneven and improvised.

This stage is focused on visible consistency only:

1. same control height for buttons and dropdowns inside one action row;
2. same font size, weight, and line-height for action labels;
3. no text wrapping inside primary action controls;
4. consistent horizontal padding and border radius;
5. predictable alignment across headers and top toolbars.

## Scope

In scope:

1. Main screen (`PrezGen Конструктор`):
   - align top-right actions (`Запустить демо`, `Темы`, language switcher);
   - align controls in the `Создать презентацию` row;
   - make the theme dropdown visually equal to adjacent buttons by size.
2. Presentation constructor top bar:
   - normalize top header controls (`К списку`, preview refresh, theme mode switch, language switcher, theme select, export buttons);
   - remove multi-line buttons in export actions;
   - ensure all toolbar controls share one height system.
3. Theme editor header:
   - normalize top header controls (`К списку`, theme selector, `Создать с нуля`, `Импорт темы`, language switcher);
   - keep dropdowns visually equivalent to buttons in size and typography.
4. Shared UI primitives and tokens:
   - centralize control heights, font sizing, paddings, and radius values;
   - reuse one action-control style contract instead of screen-specific overrides.

Out of scope:

1. New user flows or feature additions.
2. Reworking side panels, cards, or editor canvas layout beyond what is needed for header/control alignment.
3. Copy rewrite unrelated to control labels.
4. Backend, API, export, or render-model changes.

## Problem Statement

Current screenshots show the same class of defect on several screens:

1. buttons in the same row have different heights;
2. dropdowns look smaller or taller than adjacent buttons;
3. font sizing and visual weight vary between controls;
4. long labels wrap to a second line, breaking toolbar rhythm;
5. top bars look assembled from unrelated components instead of one system.

This makes the UI look unfinished even when functionality works correctly.

## UI Targets

1. Every top-level action row must read as a single control system.
2. Buttons and selects placed side by side must share:
   - height,
   - font size,
   - line-height,
   - vertical alignment,
   - border radius.
3. Action labels must stay on one line.
4. If a label is too long, the control should expand horizontally or use safe internal spacing before any wrap is allowed.
5. Shared controls must be driven by reusable tokens or variants, not one-off CSS patches per page.

## Acceptance Criteria

1. On the main screen, all header actions have equal visual height and aligned text baselines.
2. On the main screen create row, the theme dropdown and `Создать` button match in height and typography.
3. In the presentation constructor header, all action controls use one height scale and export buttons do not wrap.
4. In the theme editor header, buttons and selects match by height and text treatment.
5. No top toolbar action shown in current screenshots breaks into two lines at standard desktop width.
6. Shared styling is implemented through centralized UI primitives or tokens, so future screens inherit the same sizing rules.

## Risks and Mitigations

1. Risk: fixing one toolbar with ad-hoc CSS creates more divergence elsewhere.
   - Mitigation: normalize through shared button/select primitives first.
2. Risk: forcing no-wrap can cause overflow on narrow screens.
   - Mitigation: define explicit responsive behavior for compact widths instead of allowing random line wraps.
3. Risk: different existing components use different internal paddings and line-heights.
   - Mitigation: audit control variants before refactor and consolidate onto one sizing contract.

## Handoff Notes

1. This stage starts after Stage 11 and should be treated as a new UI cleanup pass, not a continuation of Stage 4.
2. The first confirmed defects are based on the current screenshots for:
   - main screen,
   - presentation constructor header,
   - theme editor header.
3. Additional UI issues can be appended here as they are identified during review.
