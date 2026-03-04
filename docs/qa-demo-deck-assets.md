# QA Demo Deck Assets

Use this with `npm run seed:qa-demo`.

## Where to put images

Place source images into:

`data/demo-assets/`

## Required file names

The script searches these base names with extensions `.jpg`, `.jpeg`, `.png`, `.webp`:

1. `hero`
2. `side-1`
3. `side-2`
4. `side-3`
5. `grid-1`
6. `grid-2`
7. `grid-3`
8. `grid-4`
9. `alt-1`
10. `alt-2`
11. `alt-3`
12. `alt-4`

Examples:

- `data/demo-assets/hero.jpg`
- `data/demo-assets/grid-1.png`
- `data/demo-assets/alt-4.webp`

If a file is missing, script will use a placeholder image for that slot.

Orientation convention used in seeded QA deck:

1. Horizontal images: `grid-2`, `grid-3`, `grid-4`, `side-3`
2. Other listed files are treated as vertical/general images

## Run

```bash
npm run seed:qa-demo
```

Result:

1. Old presentations named `QA Demo Deck` are removed.
2. New demo presentation is created with all key layouts/slides.
3. Demo deck default theme is `factory-blueprint` (industrial dark blueprint style).
4. Found images are copied to `data/presentations/<presentationId>/assets/`.
