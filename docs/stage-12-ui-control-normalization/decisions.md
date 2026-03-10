# Stage 12 Decisions

## 1. Normalize from shared primitives, not per-screen CSS

Decision:

1. Button-like controls and dropdowns must follow one shared sizing contract.
2. Screen-level overrides are allowed only for width and layout placement, not for base typography or height.

Reason:

- prevents repeated visual drift between screens;
- reduces the chance that future buttons become inconsistent again.

## 2. Desktop action controls must not wrap text

Decision:

1. Toolbar and header actions shown in the current screenshots must keep labels on a single line at standard desktop widths.
2. Export buttons and similar long-label actions should size horizontally before wrapping is considered.

Reason:

- wrapped labels immediately make the toolbar look broken;
- multi-line actions destroy vertical rhythm and perceived polish.

## 3. Dropdowns are first-class action controls

Decision:

1. `select` controls placed in action rows must match adjacent buttons in height, font sizing, and radius.
2. Dropdowns should not look like secondary-form leftovers when used as toolbar actions.

Reason:

- users perceive them as part of one command bar;
- current mismatch is one of the clearest visible defects.

## 4. Responsive fallback must be explicit

Decision:

1. On narrow widths, action rows may reflow by layout rules, but individual controls should still preserve single-line labels.
2. Responsive behavior must be intentional and consistent, not the result of uncontrolled wrapping.

Reason:

- preserves readability on smaller screens;
- avoids trading one alignment problem for another.
