# Stage 6 Decisions

Status: approved

## 1. Rich text engine

Decision:
- Use `TipTap` for visual rich text editing in text blocks.

Why:
- Good control over allowed marks/nodes.
- Easy dual-mode UX (`Visual` + `HTML`).
- Cleaner long-term extension path than textarea-only workflow.

## 2. Text editing modes

Decision:
- Provide two modes:
1. `Visual` (toolbar formatting).
2. `HTML` (manual source editing).

Behavior:
- User can input any HTML in code mode.
- Output still passes sanitizer before render/export persistence path.

## 3. Color workflow in text editor

Decision:
- Support full color selection.
- Also show theme palette swatches as quick choices.

Why:
- Fast selection of design-consistent colors.
- No need to manually pick/enter hex each time.

## 4. KPI auto-layout priority

Decision:
- Prioritize readability and overflow safety.
- If free space remains, keep the card cluster centered in slot (no one-sided dead strip).

## 5. Chart limit setting

Decision:
- Remove `Limit` input from chart block UI.
- Keep backend guardrail limit.

## 6. Upload controls consistency

Decision:
- Replace exposed native file inputs with one shared custom upload trigger style.
- Apply to image block upload and dataset upload.

## 7. Slide type presentation

Decision:
- Show slide type as static text label in properties panel.
- No interactive control for type switching.

## 8. Deprecated layout preset

Decision:
- Remove `layout-single-column` from system presets and stop using it in QA seed decks.

## 9. Card numeric formatting

Decision:
- Compact large card numbers starting from millions (`млн/млрд/трлн`).
- Keep thousands as full value with separators (no `тыс.` suffix).
