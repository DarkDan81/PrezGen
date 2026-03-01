# Stage 8 Implementation Status

## Current state

Implementation in progress.

Completed:

1. Created Stage 8 documentation package (`README`, `decisions`, `implementation-plan`, `pptx-safe-matrix`).
2. Added runtime token-to-CSS-variable bridge in render engine:
- theme tokens are now injected as CSS variables during preview render.
3. Added initial decor token group support (`decor.intensity`, `decor.safeZoneAlpha`, `decor.titleMultiplier`, `decor.contentMultiplier`):
- backend validation ranges added;
- frontend types extended;
- theme editor fields added;
- `factory-blueprint` consumes these tokens in CSS.
4. Preserved Stage 7 boundary: structural layout remains outside theme control.

## Planned deliverables

1. Freeze theme schema v2 as explicit whitelist (no implicit pass-through keys).
2. Add token normalization layer (clamp + defaults + deprecation warnings) for create/patch/import theme flows.
3. Expand decor tokens to PPTX-safe set:
- logo options (url, anchor, size, opacity),
- primitive shape presets (kind, anchor, size, opacity),
- intensity presets (1/2/3) mapped to deterministic variable bundles.
4. Expand theme editor UI for full PPTX-safe decor controls:
- structured sections,
- clear safe/blocked hints,
- preview-safe indicator.
5. Add integrated live preview on `/themes`:
- immediate token updates,
- golden scenes,
- before/after compare,
- safety overlays.
6. Add migration/compatibility behavior for existing custom themes with unsupported keys.
7. Update manual QA checklist with Stage 8 token persistence + warning + determinism scenarios.
8. Add architecture note for future PPTX exporter mapping (native vs raster fallback per token group).

## Remaining execution order (next steps)

1. Backend: implement strict whitelist + normalization for theme token payload.
2. Frontend: align theme editor form with schema v2 sections (`surfaces`, `decor`, `chart`, `table`).
3. Frontend: implement integrated live preview (golden scenes + compare mode + safety indicators).
4. Theme assets: add logo/decor primitive controls for `factory-blueprint` via tokens (without hardcoded values).
5. QA/docs: add Stage 8 regression checks and expected outcomes.

## Risks

1. Over-restricting theme expressiveness and reducing design flexibility.
2. Under-restricting and re-introducing non-exportable visuals into contract.
3. Asset handling complexity for logo/decor references.
4. Inconsistent behavior between preview and future PPTX mapping assumptions.

## Exit condition

Any theme created or edited through UI is guaranteed to use only PPTX-safe tokens and has deterministic mapping path for future PPTX export without structural regressions.
