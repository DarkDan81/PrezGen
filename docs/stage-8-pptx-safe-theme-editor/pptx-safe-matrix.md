# PPTX-safe Capability Matrix (Draft)

## Legend

- `safe-native`: expected native PPTX mapping.
- `safe-raster`: expected rasterized layer mapping.
- `blocked`: not allowed in theme editor contract.

## Theme areas

1. Colors
- Semantic palette (`bgCanvas`, `textPrimary`, `accent`, chart/table colors): `safe-native`

2. Typography
- Font family from approved list: `safe-native`
- Font weight/size/line-height in bounded ranges: `safe-native`

3. Surfaces
- Radius/border width/style presets: `safe-native`
- Single shadow preset (small/medium/large): `safe-native` (approximate mapping)
- Multi-layer shadow chains: `blocked`

4. Decor
- Corner logo (asset + anchor position + size + opacity): `safe-native` (image object)
- Primitive background shapes (preset list only): `safe-native`
- Arbitrary SVG filter stacks: `blocked`
- Complex procedural backgrounds: `safe-raster`

5. Charts/Tables
- Palette, header fills/text, baseline strokes: `safe-native`
- CSS-only chart effects (glow blur, blend overlays): `blocked`

6. Motion
- Any animation/transition token: `blocked` in PPTX-safe profile

## Notes

1. `safe-raster` options must include deterministic quality constraints (resolution, compression policy, scale bounds).
2. `blocked` options may be introduced later in separate `web-only` profile, explicitly marked non-PPTX-safe.
