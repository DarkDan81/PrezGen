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
- Prioritize readability first, then maximal area fill.
- Cards should occupy full available slot footprint with even gaps and no obvious dead strip.

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

