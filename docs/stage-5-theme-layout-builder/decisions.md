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
