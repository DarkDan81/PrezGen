# Stage 9 Decisions

Status: approved

## 1. Single source render model

Decision:
- Preview, PDF, and PPTX must consume the same resolved render model.
- No PPTX-only data shaping that bypasses model-builder contracts.

## 2. Export consistency over visual gimmicks

Decision:
- If browser visual cannot be represented in PPTX natively, use declared fallback:
  - `safe-native` where possible,
  - `safe-raster` only for bounded fragments,
  - otherwise emit warning.

## 3. Asynchronous export jobs only

Decision:
- PPTX follows existing async job pattern (`queued|running|done|failed`).
- No synchronous large-file export endpoints.

## 4. Strict regression gate for existing features

Decision:
- Any PPTX work must not break:
  - current PDF export,
  - preview rendering,
  - editor layout/theme interactions.

## 5. Deterministic fallback policy

Decision:
- Fallback mapping is deterministic and documented.
- Same input presentation must produce byte-variant but visually equivalent outputs.

## 6. Warning-first transparency

Decision:
- Degraded mappings are explicit:
  - structured warning payload in API response/job result,
  - optional UI warning surface in export status panel.

## 7. No animation in Stage 9

Decision:
- Animation export remains excluded.
- Tokens/features marked non-PPTX stay blocked or ignored with warning.
