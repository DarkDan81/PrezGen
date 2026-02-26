# Entity Model

## Core Entities

## Presentation

Top-level document that groups slides, theme, and publication state.

Fields:

- `id` (string, UUID)
- `name` (string, required)
- `description` (string, optional)
- `themeId` (string, required)
- `themeOverrides` (object, optional)
- `status` (enum: `draft`, `published`, `archived`)
- `schemaVersion` (string, required, example: `1.0`)
- `createdAt` (ISO datetime)
- `updatedAt` (ISO datetime)

## Slide

Ordered presentation unit.

Fields:

- `id` (string, UUID)
- `presentationId` (string, UUID)
- `order` (integer, >= 0)
- `type` (enum: `title`, `content`)
- `title` (string, optional)
- `subtitle` (string, optional)
- `notes` (string, optional)
- `createdAt` (ISO datetime)
- `updatedAt` (ISO datetime)

## Block

Typed content unit inside slide.

Fields:

- `id` (string, UUID)
- `presentationId` (string, UUID)
- `slideId` (string, UUID)
- `order` (integer, >= 0)
- `type` (enum: `chart`, `table`, `kpi`, `text`, `image`)
- `layout` (object, optional)
- `config` (object, required, type-specific)
- `createdAt` (ISO datetime)
- `updatedAt` (ISO datetime)

Notes:

- `layout` is relative and auto-layout-oriented, not pixel absolute.
- `config` validation depends on `type`.

## Dataset

Tabular source available to blocks.

Fields:

- `id` (string, UUID)
- `presentationId` (string, UUID)
- `name` (string, required)
- `sourceType` (enum: `upload_csv`, `manual_table`, `api_future`)
- `columns` (array of column descriptors)
- `rows` (array of row objects)
- `meta` (object, optional)
- `createdAt` (ISO datetime)
- `updatedAt` (ISO datetime)

Column descriptor:

- `key` (string)
- `label` (string)
- `type` (enum: `string`, `number`, `date`, `boolean`)
- `nullable` (boolean, default true)

## Theme

Reusable visual preset.

Fields:

- `id` (string, UUID)
- `name` (string, required)
- `baseCssPath` (string, required)
- `tokens` (object, required)
- `isSystem` (boolean, default false)
- `createdAt` (ISO datetime)
- `updatedAt` (ISO datetime)

Token examples:

- `fontFamilyBase`
- `fontFamilyHeading`
- `fontSizeBase`
- `colorTextPrimary`
- `colorTextSecondary`
- `colorBackground`
- `colorAccent`
- `spacingScale`
- `borderRadiusBase`

## RenderJob

Asynchronous render task for preview/export.

Fields:

- `id` (string, UUID)
- `presentationId` (string, UUID)
- `type` (enum: `preview_html`, `export_pdf`, `export_pptx_future`)
- `status` (enum: `queued`, `running`, `done`, `failed`)
- `result` (object, optional)
- `error` (object, optional)
- `createdAt` (ISO datetime)
- `updatedAt` (ISO datetime)

## Relations

- One `Presentation` has many `Slides`.
- One `Slide` has many `Blocks`.
- One `Presentation` has many `Datasets`.
- One `Presentation` references one active `Theme`.
- One `Presentation` has many `RenderJobs`.
- `Block` may reference one `Dataset` inside its `config`.

## Lifecycle Rules

1. New presentation starts as `draft`.
2. Publishing requires contract-valid slides and blocks.
3. Any edit on published presentation can:
   - create new draft revision, or
   - unpublish and return to `draft` (policy decision for Stage 2).
4. Render jobs must be immutable history records.

## MVP Layout Constraints

- Auto-layout only.
- Reordering slides and blocks is allowed.
- Block width hints allowed (for example `layout.widthRatio`), but final layout is engine-controlled.
- No free drag-and-drop pixel positioning.

