# Stage 4 Implementation Status

Date: 2026-02-27
Branch: current working tree

## Completed in this pass

1. Stage 4 documentation baseline:
   - Added approved decisions file (`decisions.md`).
   - Added UI inconsistency inventory (`ui-inventory.md`).
   - Updated stage docs index references.
2. Shared UI foundation:
   - Added primitives:
     - `frontend/src/shared/ui/Button.tsx`
     - `frontend/src/shared/ui/Field.tsx`
     - `frontend/src/shared/ui/SectionCard.tsx`
   - Added shared UI style layer:
     - `frontend/src/shared/ui/ui.css`
   - Connected shared UI stylesheet in app bootstrap (`main.tsx`).
3. Presentations screen consistency pass:
   - Replaced mixed link-like list actions with consistent button pattern.
   - Applied shared field and card wrappers for create/list sections.
4. Editor screen consistency pass:
   - Replaced header `Back` text link with button control.
   - Normalized action buttons to explicit variants.
   - Right panel split into section cards:
     - `Slide Settings`
     - `Block Settings`
     - `Datasets`
   - Block labels normalized to Title Case (`Text`, `Image`, `Chart`, `Table`, `KPI`).
5. Global save-state indicator:
   - Added top-level save state in editor header with statuses:
     - `Saving...`
     - `Saved`
     - `Error`
   - Wired to slide autosave, block autosave, and presentation theme save mutation lifecycle.
6. Copy consistency pass:
   - Normalized action/label casing across editor and block form controls.
   - Standardized block and dataset wording in modal/list actions (`Add Block`, `Edit Dataset`, `Remove Column`, `Remove Row`).
7. Accessibility baseline pass:
   - Added keyboard selection support for sortable list rows (`Enter`/`Space`).
   - Added focus-visible styling for sortable items.
   - Added ARIA labels for drag handles and polite live-region announcements for save and PDF status text.
8. i18n foundation and RU-default rollout:
   - Added centralized dictionary-driven i18n layer with `t('key')` API:
     - `frontend/src/shared/i18n/dictionaries.ts`
     - `frontend/src/shared/i18n/I18nProvider.tsx`
   - Connected i18n provider in frontend bootstrap (`main.tsx`).
   - Migrated user-facing strings in main constructor screens/forms to dictionary keys:
     - presentations page;
     - editor page;
     - block config form.
   - Added language switch scaffold (`RU`/`EN`) in header areas.
   - Set default constructor locale to Russian (`ru`) with localStorage persistence.

## Verification

1. `npm run frontend:build` passes after i18n migration.

## Notes

1. No backend contract or render-model changes were introduced.
2. i18n extraction and RU-default switch are now implemented as the final Stage 4 step.
