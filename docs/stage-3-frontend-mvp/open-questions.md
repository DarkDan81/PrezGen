# Stage 3 Open Questions

This file lists decisions required before frontend implementation starts.

## 1. UI framework details

Decision needed:

- Keep plain React + CSS Modules
- or add component primitives library (for example Radix)

Recommendation:

- Start with React + CSS Modules now.
- Add primitives later only if needed.

## 2. Router mode

Decision needed:

- single-page app routes only
- or hash routing compatibility mode

Recommendation:

- Standard browser routing.

## 3. State persistence in UI

Decision needed:

- persist last opened presentation in localStorage
- or always start from list screen

Recommendation:

- Persist last opened presentation ID for faster workflow.

## 4. Reorder UX

Decision needed:

- drag handles only
- or full-row draggable zones

Recommendation:

- Drag handles only for fewer accidental moves.

## 5. Property editor behavior

Decision needed:

- autosave on every change
- or explicit save button per panel

Recommendation:

- Autosave with 300-500ms debounce.

## 6. Preview UX

Decision needed:

- open preview in new tab
- or embedded iframe in editor

Recommendation:

- New tab in MVP (faster and simpler), iframe later.

## 7. PDF export UX

Decision needed:

- job polling by timer in UI
- or server push (SSE/WebSocket)

Recommendation:

- Timer polling in MVP.

## 8. Constructor theme mode

Decision needed:

- include dark mode in MVP
- or postpone to next stage

Recommendation:

- Include light + dark now, because architecture cost is minimal at start.

## 9. Validation UX

Decision needed:

- strict blocking submit for invalid fields
- or soft warnings with allow-save

Recommendation:

- Strict blocking for invalid API-critical fields.

## 10. Accessibility baseline

Decision needed:

- keyboard navigation and focus states in MVP
- or later

Recommendation:

- Basic keyboard and focus support in MVP.

