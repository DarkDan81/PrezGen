# Stage 8 Implementation Status

## Current state

Stage created. Implementation not started.

## Planned deliverables

1. PPTX-safe token capability matrix and blocked token list.
2. Theme schema v2 with explicit safe groups (`color`, `typography`, `surfaces`, `decor`, `chart`, `table`).
3. Backend whitelist validation + normalization for safe token payload.
4. Theme editor UI sections for safe decor controls (logo/shapes/surface presets).
5. Migration notes for existing themes and warning model for dropped fields.
6. Manual QA additions for deterministic safe preview behavior.

## Risks

1. Over-restricting theme expressiveness and reducing design flexibility.
2. Under-restricting and re-introducing non-exportable visuals into contract.
3. Asset handling complexity for logo/decor references.
4. Inconsistent behavior between preview and future PPTX mapping assumptions.

## Exit condition

Any theme created or edited through UI is guaranteed to use only PPTX-safe tokens and has deterministic mapping path for future PPTX export without structural regressions.
