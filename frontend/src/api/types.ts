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
  layoutPresetId?: string | null;
  slotAssignments?: Array<{ slotId: string; blockId: string }>;
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
  kind?: 'system' | 'custom';
  baseCssPath: string | null;
  baseThemeId?: string | null;
  tokens?: ThemeTokens;
  isSystem: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ThemeTokens = {
  color: {
    bgCanvas: string;
    textPrimary: string;
    accent: string;
    [key: string]: string;
  };
  typography: {
    titleSize: number;
    subtitleSize: number;
    bodySize: number;
    lineHeight: number;
    [key: string]: number | string;
  };
  spacing: {
    radius: number;
    borderWidth: number;
    [key: string]: number;
  };
  chart?: {
    palette?: string[];
    [key: string]: unknown;
  };
  table?: {
    [key: string]: unknown;
  };
  decor?: {
    intensity?: number;
    safeZoneAlpha?: number;
    titleMultiplier?: number;
    contentMultiplier?: number;
    logoEnabled?: boolean;
    logoText?: string;
    logoAnchor?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    logoSize?: number;
    logoOpacity?: number;
    shapePreset?: 'none' | 'left-line' | 'triangle' | 'blob' | 'both';
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type ThemePreviewResponse = {
  html: string;
  warnings?: ValidationWarning[];
  mode: string;
  sceneIds: string[];
};

export type LayoutPreset = {
  id: string;
  name: string;
  nameKey?: string | null;
  kind: 'system' | 'custom';
  isSystem: boolean;
  schema: {
    grid?: {
      columns?: string;
      rows?: string;
      areas?: string[];
      gap?: number;
    };
    slots?: Array<{
      id: string;
      area: string;
      allowedBlockTypes?: Array<Block['type']>;
    }>;
  };
  createdAt?: string;
  updatedAt?: string;
};

export type ValidationWarning = {
  path: string;
  rule: string;
  message: string;
};

export type Dataset = {
  id: string;
  presentationId: string;
  name: string;
  sourceType: 'manual_table' | 'upload_csv' | 'api_future';
  columns: Array<{ key: string; label: string; type: string; nullable?: boolean }>;
  rows: Array<Record<string, unknown>>;
  meta?: Record<string, unknown> | null;
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
