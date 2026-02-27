# Stage 5 Decisions (Approved)

Date: 2026-02-27

## Domain Split

1. Theme and layout are separate entities.
2. Theme controls visual tokens only.
3. Layout preset controls geometry only.

## Theme Lifecycle

4. System themes are read-only.
5. User can duplicate any system theme and edit duplicate.
6. User can create a custom theme from scratch.
7. Save behavior is direct create/update (no version history in MVP).

## Typography and Components

8. Font families are selected from a fixed allowlist in MVP.
9. Theme includes styling tokens for charts and tables (not only generic colors).
10. Constructor should validate and warn on extreme token values (sizes, spacing, contrast).

## Apply Model

11. Theme is applied to presentation immediately after selection/save action.
12. Theme editor is a dedicated screen, not embedded into current editor right panel.

## Persistence

13. Themes are stored in database as primary source of truth.
14. Import/export should be prepared at contract/backend level, even if full UI flow is postponed.
15. JSON theme format must remain stable enough for future file-based exchange.

## Rendering Consistency

16. Preview and PDF must use the same final theme/layout model resolution path.
17. Any adapter-specific fallback should be deterministic and documented.

## Layout UX v2

18. Layout preset labels must be localized according to selected constructor language.
19. Layout selection must support visual cards (mini slide schematic), not only plain dropdown text.
20. Preset catalog must include additional image-oriented layouts (hero + side stacks, left/right mirrored variants).
21. Slot assignment UI should guide block-type compatibility and hide invalid block options per slot.

## Section Title Slide

22. Add user-facing slide option `Section Title` (title + subtitle centered, no content blocks).
23. `Section Title` slide is intended for topic separators (start/end of sections).
24. `Section Title` slide must reject block creation by API and UI constraints.
