# Stage 10 Execution Order (Strict)

Date: 2026-03-03  
Status: approved sequence

Rule:
1. Do not skip steps.
2. If gate fails, stop and fix before next step.
3. Any regression in preview/PDF blocks stage progress.

## 0. Baseline freeze

1. Capture Stage 9 baseline:
- `npm run frontend:build`
- `npm run api:verify`
- `npm run api:smoke`
2. Save one known-good raster PPTX output for reference.

Gate:
- all checks pass.

## 1. Contract and matrix lock

1. Freeze editable matrix by block/token/option.
2. Freeze warning payload schema.
3. Define export mode switch behavior.

Gate:
- docs approved and referenced in implementation tasks.

## 2. Core infrastructure

1. Add mode-aware PPTX pipeline (`raster` + `hybrid_native`).
2. Add mapper versioning and metadata in job result.
3. Keep current endpoint compatibility.

Gate:
- both modes produce valid PPTX asynchronously.

## 3. Native text and coordinate mapper

1. Implement pixel-to-PPT transform core.
2. Implement rich-text run mapping.
3. Add overflow guards.

Gate:
- text slides open editable and match expected geometry tolerance.

## 4. Native block mappers (sequential)

Order:
1. image,
2. table,
3. cards,
4. chart subset.

For each:
1. mapper implementation,
2. warning path for unsupported configs,
3. smoke test updates.

Gate:
- mapper green before next mapper.

## 5. Theme/decor mapping

1. Map native-safe theme tokens.
2. Add decor shape mapping.
3. Add per-layer fallback for unsupported effects.

Gate:
- theme switching changes appearance without layout drift.

## 6. Hybrid fallback validation

1. Force unsupported cases and validate warnings.
2. Ensure output remains openable.
3. Ensure unsupported feature does not break editable parts.

Gate:
- deterministic warning + valid output in all negative scenarios.

## 7. Regression barrier

1. Re-run:
- `npm run frontend:build`
- `npm run api:verify`
- `npm run api:smoke`
2. Run editable PPTX smoke suite.
3. Manual QA on demo deck:
- edit text,
- edit table cell,
- edit chart title/series,
- replace image,
- save/reopen.

Gate:
- no critical regressions.

## 8. Rollout

1. Keep raster mode as fallback behind config flag.
2. Enable hybrid-native by default after acceptance sign-off.
3. Record known limitations in stage status.

Gate:
- user-facing release note ready and docs synced.
