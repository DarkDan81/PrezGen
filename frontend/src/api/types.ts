export type ApiEnvelope<T> = {
  data: T;
  meta: { requestId: string; schemaVersion: string };
};

export type ApiErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details?: Array<{ path: string; rule: string; message: string }>;
  };
};

export type Presentation = {
  id: string;
  name: string;
  description: string | null;
  themeId: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
};

export type Slide = {
  id: string;
  presentationId: string;
  order: number;
  type: 'title' | 'content';
  title: string | null;
  subtitle: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Block = {
  id: string;
  presentationId: string;
  slideId: string;
  order: number;
  type: 'chart' | 'table' | 'kpi' | 'text' | 'image';
  layout: { widthRatio?: number } | null;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type Theme = {
  id: string;
  name: string;
  baseCssPath: string;
  isSystem: boolean;
};

export type Dataset = {
  id: string;
  presentationId: string;
  name: string;
  sourceType: 'manual_table' | 'upload_csv' | 'api_future';
  columns: Array<{ key: string; label: string; type: string; nullable?: boolean }>;
  rows: Array<Record<string, unknown>>;
  createdAt: string;
  updatedAt: string;
};

export type RenderJob = {
  id: string;
  presentationId: string;
  type: 'export_pdf';
  status: 'queued' | 'running' | 'done' | 'failed';
  result: { fileName: string; path: string } | null;
  error: { message: string } | null;
};

