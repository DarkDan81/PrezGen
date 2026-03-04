import { apiDelete, apiGet, apiPatch, apiPost, apiPostForm } from './http';
import type {
  Block,
  Dataset,
  LayoutPreset,
  Presentation,
  RenderJob,
  Slide,
  Theme,
  ThemePreviewResponse,
  ThemeTokens,
  ValidationWarning,
} from './types';

export const client = {
  listPresentations: () => apiGet<Presentation[]>('/api/v1/presentations'),
  createPresentation: (payload: { name: string; themeId: string; description?: string }) =>
    apiPost<Presentation, typeof payload>('/api/v1/presentations', payload),
  getPresentation: (id: string) => apiGet<Presentation>(`/api/v1/presentations/${id}`),
  patchPresentation: (id: string, payload: Partial<Pick<Presentation, 'name' | 'description' | 'themeId'>>) =>
    apiPatch<Presentation, typeof payload>(`/api/v1/presentations/${id}`, payload),
  deletePresentation: (id: string) => apiDelete(`/api/v1/presentations/${id}`),

  listSlides: (presentationId: string) => apiGet<Slide[]>(`/api/v1/presentations/${presentationId}/slides`),
  createSlide: (presentationId: string, payload: { type: 'title' | 'content'; title?: string }) =>
    apiPost<Slide, typeof payload>(`/api/v1/presentations/${presentationId}/slides`, payload),
  patchSlide: (slideId: string, payload: Partial<Pick<Slide, 'type' | 'title' | 'subtitle' | 'notes'>>) =>
    apiPatch<Slide, typeof payload>(`/api/v1/slides/${slideId}`, payload),
  patchSlideLayout: (
    slideId: string,
    payload: { layoutPresetId: string; slotAssignments: Array<{ slotId: string; blockId: string }> },
  ) => apiPatch<Slide, typeof payload>(`/api/v1/slides/${slideId}/layout`, payload),
  deleteSlide: (slideId: string) => apiDelete(`/api/v1/slides/${slideId}`),
  reorderSlides: (presentationId: string, slideIds: string[]) =>
    apiPost<Slide[], { slideIds: string[] }>(`/api/v1/presentations/${presentationId}/slides/reorder`, { slideIds }),

  listBlocks: (slideId: string) => apiGet<Block[]>(`/api/v1/slides/${slideId}/blocks`),
  createBlock: (
    slideId: string,
    payload: { type: Block['type']; config: Record<string, unknown>; layout?: Record<string, unknown> },
  ) => apiPost<Block, typeof payload>(`/api/v1/slides/${slideId}/blocks`, payload),
  patchBlock: (blockId: string, payload: Partial<Pick<Block, 'type' | 'config' | 'layout'>>) =>
    apiPatch<Block, typeof payload>(`/api/v1/blocks/${blockId}`, payload),
  deleteBlock: (blockId: string) => apiDelete(`/api/v1/blocks/${blockId}`),
  reorderBlocks: (slideId: string, blockIds: string[]) =>
    apiPost<Block[], { blockIds: string[] }>(`/api/v1/slides/${slideId}/blocks/reorder`, { blockIds }),

  listThemes: () => apiGet<Theme[]>('/api/v1/themes'),
  getTheme: (themeId: string) => apiGet<Theme>(`/api/v1/themes/${themeId}`),
  createTheme: (payload: { name: string; baseThemeId?: string; tokens: ThemeTokens }) =>
    apiPost<Theme & { warnings?: ValidationWarning[] }, typeof payload>('/api/v1/themes', payload),
  patchTheme: (themeId: string, payload: { name?: string; tokens?: ThemeTokens }) =>
    apiPatch<Theme & { warnings?: ValidationWarning[] }, typeof payload>(`/api/v1/themes/${themeId}`, payload),
  deleteTheme: (themeId: string) => apiDelete(`/api/v1/themes/${themeId}`),
  duplicateTheme: (themeId: string) =>
    apiPost<Theme, Record<string, never>>(`/api/v1/themes/${themeId}/duplicate`, {}),
  exportTheme: (themeId: string) =>
    apiGet<{ schemaVersion: number; theme: Theme }>(`/api/v1/themes/${themeId}/export`),
  importTheme: (payload: { schemaVersion: number; theme: { name: string; tokens: ThemeTokens; baseThemeId?: string } }) =>
    apiPost<Theme & { warnings?: ValidationWarning[] }, typeof payload>('/api/v1/themes/import', payload),
  previewTheme: (payload: { themeId?: string; baseThemeId?: string; tokens: ThemeTokens }) =>
    apiPost<ThemePreviewResponse, typeof payload>('/api/v1/themes/preview', payload),

  listLayoutPresets: () => apiGet<LayoutPreset[]>('/api/v1/layout-presets'),
  getLayoutPreset: (layoutPresetId: string) => apiGet<LayoutPreset>(`/api/v1/layout-presets/${layoutPresetId}`),

  listDatasets: (presentationId: string) => apiGet<Dataset[]>(`/api/v1/presentations/${presentationId}/datasets`),
  createDataset: (
    presentationId: string,
    payload: {
      name: string;
      sourceType: 'manual_table';
      columns: Array<{ key: string; label: string; type: string; nullable?: boolean }>;
      rows: Array<Record<string, unknown>>;
    },
  ) => apiPost<Dataset, typeof payload>(`/api/v1/presentations/${presentationId}/datasets`, payload),
  uploadCsvDataset: (presentationId: string, formData: FormData) =>
    apiPostForm<Dataset>(`/api/v1/presentations/${presentationId}/datasets/upload-csv`, formData),
  patchDataset: (
    datasetId: string,
    payload: Partial<Pick<Dataset, 'name' | 'columns' | 'rows' | 'meta'>>,
  ) => apiPatch<Dataset, typeof payload>(`/api/v1/datasets/${datasetId}`, payload),
  deleteDataset: (datasetId: string) => apiDelete(`/api/v1/datasets/${datasetId}`),

  uploadPresentationImage: (presentationId: string, formData: FormData) =>
    apiPostForm<{ fileName: string; url: string }>(`/api/v1/presentations/${presentationId}/assets/upload-image`, formData),

  buildPreview: (presentationId: string) =>
    apiPost<{ previewUrl: string }, { mode: string }>(`/api/v1/presentations/${presentationId}/render/preview`, {
      mode: 'latest_draft',
    }),
  startPdf: (presentationId: string) =>
    apiPost<RenderJob, Record<string, never>>(`/api/v1/presentations/${presentationId}/render/pdf`, {}),
  startPptx: (presentationId: string, mode: 'hybrid_native' | 'hybrid_blocks' | 'raster' = 'hybrid_blocks') =>
    apiPost<RenderJob, { mode: 'hybrid_native' | 'hybrid_blocks' | 'raster' }>(`/api/v1/presentations/${presentationId}/render/pptx`, { mode }),
  getRenderJob: (jobId: string) => apiGet<RenderJob>(`/api/v1/render-jobs/${jobId}`),
};
