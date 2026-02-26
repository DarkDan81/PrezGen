import { apiDelete, apiGet, apiPatch, apiPost, apiPostForm } from './http';
import type { Block, Dataset, Presentation, RenderJob, Slide, Theme } from './types';

export const client = {
  listPresentations: () => apiGet<Presentation[]>('/api/v1/presentations'),
  createPresentation: (payload: { name: string; themeId: string; description?: string }) =>
    apiPost<Presentation, typeof payload>('/api/v1/presentations', payload),
  getPresentation: (id: string) => apiGet<Presentation>(`/api/v1/presentations/${id}`),
  patchPresentation: (id: string, payload: Partial<Pick<Presentation, 'name' | 'description' | 'themeId'>>) =>
    apiPatch<Presentation, typeof payload>(`/api/v1/presentations/${id}`, payload),

  listSlides: (presentationId: string) => apiGet<Slide[]>(`/api/v1/presentations/${presentationId}/slides`),
  createSlide: (presentationId: string, payload: { type: 'title' | 'content'; title?: string }) =>
    apiPost<Slide, typeof payload>(`/api/v1/presentations/${presentationId}/slides`, payload),
  patchSlide: (slideId: string, payload: Partial<Pick<Slide, 'type' | 'title' | 'subtitle' | 'notes'>>) =>
    apiPatch<Slide, typeof payload>(`/api/v1/slides/${slideId}`, payload),
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

  buildPreview: (presentationId: string) =>
    apiPost<{ previewUrl: string }, { mode: string }>(`/api/v1/presentations/${presentationId}/render/preview`, {
      mode: 'latest_draft',
    }),
  startPdf: (presentationId: string) =>
    apiPost<RenderJob, Record<string, never>>(`/api/v1/presentations/${presentationId}/render/pdf`, {}),
  getRenderJob: (jobId: string) => apiGet<RenderJob>(`/api/v1/render-jobs/${jobId}`),
};

