import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { client } from '../api/client';
import type { Block, Dataset, LayoutPreset, Slide } from '../api/types';
import { BlockConfigForm, getDefaultConfig } from '../components/BlockConfigForm';
import { DemoCoach } from '../demo/DemoCoach';
import { clearGuidedDemoState, readGuidedDemoState, writeGuidedDemoState } from '../demo/guidedDemoState';
import { useDebouncedEffect } from '../hooks/useDebouncedEffect';
import { useI18n } from '../shared/i18n/I18nProvider';
import type { TranslationKey } from '../shared/i18n/dictionaries';
import { Button } from '../shared/ui/Button';
import { Field } from '../shared/ui/Field';
import { FileUploadControl } from '../shared/ui/FileUploadControl';
import { SectionCard } from '../shared/ui/SectionCard';
import './editor.css';

function DragItem({
  id,
  label,
  active,
  onClick,
  dragHandleLabel,
  removeLabel,
  onRemove,
}: {
  id: string;
  label: string;
  active: boolean;
  onClick: () => void;
  dragHandleLabel: string;
  removeLabel?: string;
  onRemove?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`drag-item ${active ? 'active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <Button
        variant="ghost"
        size="small"
        className="drag-handle"
        {...attributes}
        {...listeners}
        title={dragHandleLabel}
        aria-label={dragHandleLabel}
      >
        ::
      </Button>
      <span>{label}</span>
      {onRemove ? (
        <Button
          variant="danger"
          size="small"
          className="drag-remove"
          title={removeLabel || ''}
          aria-label={removeLabel || ''}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ×
        </Button>
      ) : null}
    </div>
  );
}

function validateConfig(type: Block['type'], config: Record<string, unknown>): string {
  if (type === 'text' && typeof config.html !== 'string') return 'error.textConfig';
  if (type === 'image' && typeof config.url !== 'string' && typeof config.src !== 'string') {
    return 'error.imageConfig';
  }
  if (type === 'chart') {
    if (typeof config.datasetId !== 'string' || typeof config.kind !== 'string') {
      return 'error.chartConfig';
    }
  }
  if (type === 'table' && typeof config.datasetId !== 'string') return 'error.tableConfig';
  if (type === 'kpi' && config.mode !== 'manual' && typeof config.datasetId !== 'string') return 'error.kpiConfig';
  return '';
}

function emptyDatasetDraft() {
  return {
    name: 'manual_dataset',
    columns: [
      { key: 'col_1', label: 'Column 1', type: 'string' as const, nullable: true },
      { key: 'col_2', label: 'Column 2', type: 'string' as const, nullable: true },
    ],
    rows: [{ col_1: '', col_2: '' }] as Array<Record<string, unknown>>,
  };
}

function alignRowsToColumns(
  rows: Array<Record<string, unknown>>,
  columns: Array<{ key: string; label: string; type: string; nullable?: boolean }>,
) {
  return rows.map((row) => {
    const next: Record<string, unknown> = {};
    columns.forEach((column) => {
      next[column.key] = row[column.key] ?? '';
    });
    return next;
  });
}

function buildDatasetDraftSignature(
  name: string,
  columns: Array<{ key: string; label: string; type: string; nullable?: boolean }>,
  rows: Array<Record<string, unknown>>,
) {
  return JSON.stringify({
    name: name.trim(),
    columns: columns.map((c) => ({ key: c.key, label: c.label || '', type: c.type || 'string' })),
    rows,
  });
}

function getNextColumnKey(columns: Array<{ key: string }>) {
  const used = new Set(columns.map((c) => c.key));
  let index = 1;
  while (used.has(`col_${index}`)) index += 1;
  return `col_${index}`;
}

function getCreateBlockConfig(type: Block['type'], datasets: Dataset[], t: (key: 'error.createTableNeedsDataset' | 'error.createChartNeedsDataset' | 'error.chartNeedsTwoColumns') => string) {
  const base = getDefaultConfig(type);
  const primaryDataset = datasets[0];

  if (type === 'table') {
    if (!primaryDataset) {
      throw new Error(t('error.createTableNeedsDataset'));
    }
    return {
      ...base,
      datasetId: primaryDataset.id,
    };
  }

  if (type === 'chart') {
    if (!primaryDataset) {
      throw new Error(t('error.createChartNeedsDataset'));
    }
    const keys = (primaryDataset.columns || []).map((c) => c.key).filter(Boolean);
    if (keys.length < 2) {
      throw new Error(t('error.chartNeedsTwoColumns'));
    }
    return {
      ...base,
      datasetId: primaryDataset.id,
      xField: keys[0],
      valueField: keys[1],
      seriesField: '',
    };
  }

  return base;
}

function blockTypeLabel(type: Block['type'], t: (key: 'block.text' | 'block.image' | 'block.chart' | 'block.table' | 'block.kpi') => string): string {
  if (type === 'text') return t('block.text');
  if (type === 'image') return t('block.image');
  if (type === 'chart') return t('block.chart');
  if (type === 'table') return t('block.table');
  return t('block.kpi');
}

function blockDisplayLabel(block: Block, index: number, t: (key: 'block.text' | 'block.image' | 'block.chart' | 'block.table' | 'block.kpi') => string): string {
  return `${index + 1}. ${blockTypeLabel(block.type, t)}`;
}

function layoutPresetLabel(preset: LayoutPreset, t: (key: TranslationKey) => string): string {
  if (preset.nameKey) {
    return t(preset.nameKey as TranslationKey);
  }
  return preset.name;
}

function getLayoutPreviewGrid(schema: LayoutPreset['schema']) {
  const rows = Array.isArray(schema?.grid?.areas) ? schema.grid.areas : [];
  const rowCount = rows.length || 1;
  const colCount = rows.length
    ? Math.max(...rows.map((row) => String(row).trim().split(/\s+/).filter(Boolean).length), 1)
    : 1;
  const templateAreas = rows.length ? rows.map((row) => `"${row}"`).join(' ') : '';
  return { rowCount, colCount, templateAreas };
}

function slotAllowsBlock(slot: { allowedBlockTypes?: Array<Block['type']> }, blockType: Block['type']) {
  if (!Array.isArray(slot.allowedBlockTypes) || slot.allowedBlockTypes.length === 0) return true;
  return slot.allowedBlockTypes.includes(blockType);
}

function extractThemeColors(tokens: Record<string, unknown> | undefined) {
  const values: string[] = [];
  const color = (tokens?.color as Record<string, unknown> | undefined) || {};
  const chart = (tokens?.chart as Record<string, unknown> | undefined) || {};
  const palette = Array.isArray(chart.palette) ? chart.palette : [];

  Object.values(color).forEach((value) => {
    if (typeof value === 'string') values.push(value);
  });
  palette.forEach((value) => {
    if (typeof value === 'string') values.push(value);
  });

  return values.filter((item) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(item));
}

export function EditorPage() {
  const { locale, setLocale, t } = useI18n();
  const { id: presentationId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [selectedSlideId, setSelectedSlideId] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [slideTitle, setSlideTitle] = useState('');
  const [slideSubtitle, setSlideSubtitle] = useState('');
  const [slideLayoutPresetId, setSlideLayoutPresetId] = useState('');
  const [slideSlotAssignments, setSlideSlotAssignments] = useState<Array<{ slotId: string; blockId: string }>>([]);
  const [blockType, setBlockType] = useState<Block['type']>('text');
  const [blockConfig, setBlockConfig] = useState<Record<string, unknown>>({});
  const [newBlockType, setNewBlockType] = useState<Block['type']>('text');
  const [blockError, setBlockError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewNonce, setPreviewNonce] = useState(0);
  const [renderJobId, setRenderJobId] = useState('');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.localStorage.getItem('prezgen-ui-mode') === 'dark' ? 'dark' : 'light';
  });
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [datasetDraftName, setDatasetDraftName] = useState('manual_dataset');
  const [datasetDraftColumns, setDatasetDraftColumns] = useState<Dataset['columns']>([]);
  const [datasetDraftRows, setDatasetDraftRows] = useState<Array<Record<string, unknown>>>([]);
  const [datasetError, setDatasetError] = useState('');
  const [datasetModalOpen, setDatasetModalOpen] = useState(false);
  const [datasetModalSnapshot, setDatasetModalSnapshot] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [guidedStep, setGuidedStep] = useState(0);
  const [guidedBusy, setGuidedBusy] = useState(false);
  const [guidedPaused, setGuidedPaused] = useState(false);
  const [guidedStatus, setGuidedStatus] = useState('');
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const previewScrollTopRef = useRef(0);
  const guidedState = readGuidedDemoState();
  const guidedActive = Boolean(guidedState?.active && guidedState.phase === 'editor');

  const presentationQuery = useQuery({
    queryKey: ['presentation', presentationId],
    queryFn: () => client.getPresentation(presentationId),
  });
  const slidesQuery = useQuery({
    queryKey: ['slides', presentationId],
    queryFn: () => client.listSlides(presentationId),
  });
  const themesQuery = useQuery({ queryKey: ['themes'], queryFn: client.listThemes });
  const layoutPresetsQuery = useQuery({ queryKey: ['layout-presets'], queryFn: client.listLayoutPresets });
  const datasetsQuery = useQuery({
    queryKey: ['datasets', presentationId],
    queryFn: () => client.listDatasets(presentationId),
  });
  const blocksQuery = useQuery({
    queryKey: ['blocks', selectedSlideId],
    queryFn: () => client.listBlocks(selectedSlideId),
    enabled: Boolean(selectedSlideId),
  });

  const selectedSlide = (slidesQuery.data || []).find((s) => s.id === selectedSlideId) || null;
  const selectedBlock = (blocksQuery.data || []).find((b) => b.id === selectedBlockId) || null;

  useEffect(() => {
    if (!selectedSlideId && slidesQuery.data?.length) {
      setSelectedSlideId(slidesQuery.data[0].id);
    }
  }, [slidesQuery.data, selectedSlideId]);

  useEffect(() => {
    if (selectedSlide) {
      setSlideTitle(selectedSlide.title || '');
      setSlideSubtitle(selectedSlide.subtitle || '');
      setSlideLayoutPresetId(selectedSlide.layoutPresetId || '');
      setSlideSlotAssignments(Array.isArray(selectedSlide.slotAssignments) ? selectedSlide.slotAssignments : []);
    }
  }, [selectedSlide?.id]);

  useEffect(() => {
    if (selectedBlock) {
      setBlockType(selectedBlock.type);
      setBlockConfig((selectedBlock.config as Record<string, unknown>) || {});
      setBlockError('');
    }
  }, [selectedBlock?.id]);

  useEffect(() => {
    document.documentElement.dataset.mode = themeMode;
    window.localStorage.setItem('prezgen-ui-mode', themeMode);
  }, [themeMode]);

  useEffect(() => {
    const datasets = datasetsQuery.data || [];
    if (!datasets.length) {
      const empty = emptyDatasetDraft();
      setSelectedDatasetId('');
      setDatasetDraftName(empty.name);
      setDatasetDraftColumns(empty.columns);
      setDatasetDraftRows(empty.rows);
      return;
    }

    if (!selectedDatasetId || !datasets.some((d) => d.id === selectedDatasetId)) {
      setSelectedDatasetId(datasets[0].id);
    }
  }, [datasetsQuery.data, selectedDatasetId]);

  useEffect(() => {
    const selectedDataset = (datasetsQuery.data || []).find((d) => d.id === selectedDatasetId);
    if (!selectedDataset) return;
    setDatasetDraftName(selectedDataset.name);
    setDatasetDraftColumns(selectedDataset.columns);
    setDatasetDraftRows(alignRowsToColumns(selectedDataset.rows, selectedDataset.columns));
    setDatasetError('');
  }, [selectedDatasetId, datasetsQuery.data]);

  const patchSlideMutation = useMutation({
    mutationFn: (payload: { slideId: string; title: string; subtitle: string }) =>
      client.patchSlide(payload.slideId, { title: payload.title, subtitle: payload.subtitle }),
    onMutate: () => setSaveState('saving'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slides', presentationId] });
      setSaveState('saved');
    },
    onError: () => setSaveState('error'),
  });

  const patchSlideLayoutMutation = useMutation({
    mutationFn: (payload: { slideId: string; layoutPresetId: string; slotAssignments: Array<{ slotId: string; blockId: string }> }) =>
      client.patchSlideLayout(payload.slideId, {
        layoutPresetId: payload.layoutPresetId,
        slotAssignments: payload.slotAssignments,
      }),
    onMutate: () => setSaveState('saving'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slides', presentationId] });
      buildPreviewMutation.mutate();
      setSaveState('saved');
    },
    onError: () => setSaveState('error'),
  });

  useDebouncedEffect(
    () => {
      if (!selectedSlideId) return;
      patchSlideMutation.mutate({ slideId: selectedSlideId, title: slideTitle, subtitle: slideSubtitle });
    },
    500,
    [selectedSlideId, slideTitle, slideSubtitle],
  );

  const patchBlockMutation = useMutation({
    mutationFn: (payload: { blockId: string; type: Block['type']; config: Record<string, unknown> }) =>
      client.patchBlock(payload.blockId, { type: payload.type, config: payload.config }),
    onMutate: () => setSaveState('saving'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks', selectedSlideId] });
      buildPreviewMutation.mutate();
      setSaveState('saved');
    },
    onError: () => setSaveState('error'),
  });

  useDebouncedEffect(
    () => {
      if (!selectedBlockId) return;
      const errorKey = validateConfig(blockType, blockConfig);
      const errorMessage = errorKey ? t(errorKey as TranslationKey) : '';
      setBlockError(errorMessage);
      if (errorKey) return;
      patchBlockMutation.mutate({
        blockId: selectedBlockId,
        type: blockType,
        config: blockConfig,
      });
    },
    600,
    [selectedBlockId, blockType, blockConfig],
  );

  const createSlideMutation = useMutation({
    mutationFn: (payload: { type: 'content' | 'title'; title: string }) => client.createSlide(presentationId, payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['slides', presentationId] });
      setSelectedSlideId(created.id);
    },
  });

  const patchPresentationMutation = useMutation({
    mutationFn: (themeId: string) => client.patchPresentation(presentationId, { themeId }),
    onMutate: () => setSaveState('saving'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentation', presentationId] });
      setSaveState('saved');
    },
    onError: () => setSaveState('error'),
  });

  const createBlockMutation = useMutation({
    mutationFn: (type: Block['type']) =>
      client.createBlock(selectedSlideId, { type, config: getCreateBlockConfig(type, datasetsQuery.data || [], t) }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['blocks', selectedSlideId] });
      setSelectedBlockId(created.id);
      buildPreviewMutation.mutate();
      setBlockError('');
    },
    onError: (error) => setBlockError((error as Error).message),
  });

  const reorderSlidesMutation = useMutation({
    mutationFn: (slideIds: string[]) => client.reorderSlides(presentationId, slideIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['slides', presentationId] }),
  });
  const deleteSlideMutation = useMutation({
    mutationFn: (slideId: string) => client.deleteSlide(slideId),
    onMutate: () => setSaveState('saving'),
    onSuccess: async (_data, deletedSlideId) => {
      const remainingSlides = slides.filter((slide) => slide.id !== deletedSlideId);
      setSelectedSlideId((current) => (current === deletedSlideId ? (remainingSlides[0]?.id || '') : current));
      setSelectedBlockId('');
      await queryClient.invalidateQueries({ queryKey: ['slides', presentationId] });
      if (remainingSlides[0]?.id) {
        await queryClient.invalidateQueries({ queryKey: ['blocks', remainingSlides[0].id] });
      }
      buildPreviewMutation.mutate();
      setSaveState('saved');
    },
    onError: (error) => {
      setBlockError((error as Error).message);
      setSaveState('error');
    },
  });
  const reorderBlocksMutation = useMutation({
    mutationFn: (blockIds: string[]) => client.reorderBlocks(selectedSlideId, blockIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blocks', selectedSlideId] }),
  });
  const deleteBlockMutation = useMutation({
    mutationFn: (blockId: string) => client.deleteBlock(blockId),
    onMutate: () => setSaveState('saving'),
    onSuccess: async (_data, blockId) => {
      setSelectedBlockId((current) => (current === blockId ? '' : current));
      setSlideSlotAssignments((prev) => prev.filter((item) => item.blockId !== blockId));
      await queryClient.invalidateQueries({ queryKey: ['blocks', selectedSlideId] });
      buildPreviewMutation.mutate();
      setSaveState('saved');
    },
    onError: (error) => {
      setBlockError((error as Error).message);
      setSaveState('error');
    },
  });

  const buildPreviewMutation = useMutation({
    onMutate: () => {
      try {
        const y = previewFrameRef.current?.contentWindow?.scrollY ?? 0;
        previewScrollTopRef.current = Number.isFinite(y) ? y : 0;
      } catch (_e) {
        previewScrollTopRef.current = 0;
      }
    },
    mutationFn: () => client.buildPreview(presentationId),
    onSuccess: (data) => {
      setPreviewUrl(data.previewUrl);
      setPreviewNonce((v) => v + 1);
    },
  });
  const startPdfMutation = useMutation({
    mutationFn: () => client.startPdf(presentationId),
    onSuccess: (job) => setRenderJobId(job.id),
  });
  const startPptxMutation = useMutation({
    mutationFn: (mode: 'hybrid_blocks' | 'raster') => client.startPptx(presentationId, mode),
    onSuccess: (job) => setRenderJobId(job.id),
  });

  const renderJobQuery = useQuery({
    queryKey: ['render-job', renderJobId],
    queryFn: () => client.getRenderJob(renderJobId),
    enabled: Boolean(renderJobId),
    refetchInterval: (query) => (query.state.data?.status === 'done' || query.state.data?.status === 'failed' ? false : 1500),
  });

  const slides = slidesQuery.data || [];
  const blocks = blocksQuery.data || [];
  const isTitleSlide = selectedSlide?.type === 'title';
  const slideIds = useMemo(() => slides.map((s) => s.id), [slides]);
  const blockIds = useMemo(() => blocks.map((b) => b.id), [blocks]);
  const blockIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    blocks.forEach((block, index) => {
      map.set(block.id, index);
    });
    return map;
  }, [blocks]);

  const previewBase = previewUrl || `/api/v1/preview/${presentationId}`;
  const previewSrc = `${previewBase}${previewBase.includes('?') ? '&' : '?'}_t=${previewNonce}`;
  const saveStatusText =
    saveState === 'saving'
      ? t('common.saving')
      : saveState === 'saved'
        ? t('common.saved')
        : saveState === 'error'
          ? t('common.error')
          : '';
  const saveStatusClass = saveState === 'error' ? 'error' : saveState === 'saved' ? 'saved' : '';
  const headerStatusText = [
    saveStatusText,
    renderJobQuery.data
      ? t('editor.exportStatus', {
          type: renderJobQuery.data.type === 'export_pptx_future' ? 'PPTX' : 'PDF',
          status: renderJobQuery.data.status,
        })
      : '',
    renderJobQuery.data?.status === 'done' && (renderJobQuery.data.result?.warnings?.length || 0) > 0
      ? t('editor.exportWarnings', { count: renderJobQuery.data.result?.warnings?.length || 0 })
      : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const exportProgress = Math.max(
    0,
    Math.min(
      100,
      Number.isFinite(Number(renderJobQuery.data?.result?.progress))
        ? Number(renderJobQuery.data?.result?.progress)
        : renderJobQuery.data?.status === 'done'
          ? 100
          : 0,
    ),
  );
  const isExportInProgress = renderJobQuery.data?.status === 'queued' || renderJobQuery.data?.status === 'running';
  const datasetModalDirty = useMemo(
    () => buildDatasetDraftSignature(datasetDraftName, datasetDraftColumns, datasetDraftRows) !== datasetModalSnapshot,
    [datasetDraftColumns, datasetDraftName, datasetDraftRows, datasetModalSnapshot],
  );
  const selectedLayoutPreset = (layoutPresetsQuery.data || []).find((preset) => preset.id === slideLayoutPresetId) || null;
  const selectedTheme = (themesQuery.data || []).find((theme) => theme.id === (presentationQuery.data?.themeId || 'theme-universal-warm'));
  const themeColors = useMemo(() => extractThemeColors((selectedTheme?.tokens as Record<string, unknown> | undefined) || undefined), [selectedTheme]);
  const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const scrollPreviewToSlide = (slideId: string) => {
    const orderIndex = slides.findIndex((s) => s.id === slideId);
    if (orderIndex < 0) return;
    const attemptScroll = () => {
      try {
        const frameWindow = previewFrameRef.current?.contentWindow;
        const doc = frameWindow?.document;
        const target = doc?.getElementById(`slide-${orderIndex}`);
        if (!target) return false;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return true;
      } catch {
        return false;
      }
    };
    if (attemptScroll()) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const ok = attemptScroll();
      if (ok || attempts > 18) {
        window.clearInterval(timer);
      }
    }, 160);
  };
  const scrollToActiveSlideItem = () => {
    window.setTimeout(() => {
      const active = document.querySelector('.panel.left .drag-item.active');
      if (active && active instanceof HTMLElement) {
        active.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };
  const selectSlideAndFocus = async (slide: Slide | null) => {
    if (!slide) return;
    setSelectedSlideId(slide.id);
    scrollToActiveSlideItem();
    await wait(500);
    scrollPreviewToSlide(slide.id);
    await wait(500);
  };
  const guidedEditorSteps: Array<{
    selector: string;
    title: string;
    description: string;
    kind: 'info' | 'action';
    delayMs?: number;
    run?: () => Promise<void>;
  }> = [
    {
      selector: '[data-demo="editor-slides-panel"]',
      title: 'Список слайдов',
      description: 'Здесь вся структура презентации: порядок слайдов, быстрый переход и управление содержанием.',
      kind: 'info',
      delayMs: 6200,
    },
    {
      selector: '[data-demo="editor-blocks-section"]',
      title: 'Блоки выбранного слайда',
      description: 'В этом блоке добавляются и редактируются текст, таблицы, графики и карточки.',
      kind: 'info',
      delayMs: 6200,
    },
    {
      selector: '[data-demo="editor-properties-panel"]',
      title: 'Свойства и лейаут',
      description: 'Справа выбираются пресеты лейаута и распределение блоков по слотам.',
      kind: 'info',
      delayMs: 6200,
    },
    {
      selector: '[data-demo="editor-blocks-section"]',
      title: 'Сейчас покажем автосборку',
      description: 'Подсказка исчезнет, мы добавим блоки по очереди и прокрутим к нужному слайду в превью.',
      kind: 'info',
      delayMs: 6400,
    },
    {
      selector: '[data-demo="editor-blocks-section"]',
      title: 'Создаем блоки автоматически',
      description: 'Сейчас покажем добавление основных типов блоков: текст, изображение, график, таблица и карточки.',
      kind: 'action',
      run: async () => {
        const constructorSlide = (slidesQuery.data || []).find((slide) => /конструктор блоков/i.test(slide.title || ''));
        await selectSlideAndFocus(constructorSlide || null);
        if (!constructorSlide) return;

        const existing = await client.listBlocks(constructorSlide.id);
        setGuidedStatus('Очищаем слайд конструктора');
        for (const block of existing) {
          // eslint-disable-next-line no-await-in-loop
          await client.deleteBlock(block.id);
        }

        setGuidedStatus('Добавляем текстовый блок');
        const textBlock = await client.createBlock(constructorSlide.id, {
          type: 'text',
          config: { html: '<h3>Текстовый блок</h3><p>Здесь показываем базовое текстовое содержимое и форматирование.</p>' },
        });
        await queryClient.invalidateQueries({ queryKey: ['blocks', constructorSlide.id] });
        setSelectedBlockId(textBlock.id);
        scrollToActiveSlideItem();
        await wait(1700);

        setGuidedStatus('Добавляем блок изображения');
        const imageBlock = await client.createBlock(constructorSlide.id, {
          type: 'image',
          config: {
            url: 'https://picsum.photos/id/1069/1600/1000',
            fitMode: 'contain',
            focalPoint: 'center center',
            zoom: 100,
            offsetX: 0,
            offsetY: 0,
          },
        });
        await queryClient.invalidateQueries({ queryKey: ['blocks', constructorSlide.id] });
        setSelectedBlockId(imageBlock.id);
        scrollToActiveSlideItem();
        await wait(1700);

        setGuidedStatus('Добавляем график из датасета');
        const chartBlock = await client.createBlock(constructorSlide.id, {
          type: 'chart',
          config: {
            datasetId: datasetsQuery.data?.[0]?.id || '',
            kind: 'line',
            xField: 'month',
            valueField: 'revenue',
            seriesField: '',
            filterField: '',
            filterValues: [],
            showLabels: true,
          },
        });
        await queryClient.invalidateQueries({ queryKey: ['blocks', constructorSlide.id] });
        setSelectedBlockId(chartBlock.id);
        scrollToActiveSlideItem();
        await wait(1700);

        setGuidedStatus('Добавляем таблицу из датасета');
        const tableBlock = await client.createBlock(constructorSlide.id, {
          type: 'table',
          config: {
            datasetId: datasetsQuery.data?.[0]?.id || '',
            limit: 6,
            transpose: false,
          },
        });
        await queryClient.invalidateQueries({ queryKey: ['blocks', constructorSlide.id] });
        setSelectedBlockId(tableBlock.id);
        scrollToActiveSlideItem();
        await wait(1700);

        setGuidedStatus('Добавляем карточки');
        const kpiBlock = await client.createBlock(constructorSlide.id, {
          type: 'kpi',
          config: {
            mode: 'dataset',
            datasetId: datasetsQuery.data?.[0]?.id || '',
            labelField: 'month',
            valueField: 'revenue',
            growthField: 'growth',
            filterField: '',
            filterValues: [],
            limit: 4,
          },
        });
        await queryClient.invalidateQueries({ queryKey: ['blocks', constructorSlide.id] });
        setSelectedBlockId(kpiBlock.id);
        scrollToActiveSlideItem();
        await wait(1800);

        const presets = layoutPresetsQuery.data || [];
        const constructorPreset =
          presets.find((preset) => preset.nameKey === 'layout.grid2x2') ||
          presets.find((preset) => (preset.schema?.slots || []).length >= 4) ||
          null;
        if (constructorPreset) {
          setGuidedStatus('Выбираем лейаут и назначаем блоки в слоты');
          const slots = constructorPreset.schema?.slots || [];
          const assignments = [textBlock.id, imageBlock.id, chartBlock.id, tableBlock.id]
            .map((blockId, index) => {
              const slot = slots[index];
              if (!slot?.id) return null;
              return { slotId: slot.id, blockId };
            })
            .filter(Boolean) as Array<{ slotId: string; blockId: string }>;
          await client.patchSlideLayout(constructorSlide.id, {
            layoutPresetId: constructorPreset.id,
            slotAssignments: assignments,
          });
          await queryClient.invalidateQueries({ queryKey: ['slides', presentationId] });
          setSlideLayoutPresetId(constructorPreset.id);
          setSlideSlotAssignments(assignments);
          await wait(1500);
        }

        setGuidedStatus('Обновляем превью и перематываем на собранный слайд');
        await buildPreviewMutation.mutateAsync();
        await wait(700);
        scrollPreviewToSlide(constructorSlide.id);
        await wait(1100);
      },
    },
    {
      selector: '[data-demo="editor-blocks-section"]',
      title: 'Редактирование блоков',
      description: 'Теперь покажем, где меняются параметры графика, таблицы и изображения. Смотрите на правую панель свойств.',
      kind: 'info',
      delayMs: 6400,
    },
    {
      selector: '[data-demo="editor-blocks-section"]',
      title: 'Показываем настройки блоков',
      description: 'Сейчас переключим тип графика, обновим таблицу и покажем, где настраиваются изображения и датасеты.',
      kind: 'action',
      run: async () => {
        const constructorSlide = (slidesQuery.data || []).find((slide) => /конструктор блоков/i.test(slide.title || ''));
        if (!constructorSlide) return;
        const blocks = await client.listBlocks(constructorSlide.id);
        const text = blocks.find((b) => b.type === 'text');
        const chart = blocks.find((b) => b.type === 'chart');
        const table = blocks.find((b) => b.type === 'table');
        const image = blocks.find((b) => b.type === 'image');
        const kpi = blocks.find((b) => b.type === 'kpi');
        if (chart) {
          setGuidedStatus('Переключаем тип графика: линия -> столбцы');
          await client.patchBlock(chart.id, {
            type: 'chart',
            config: { ...(chart.config || {}), kind: 'bar' },
          });
          setSelectedBlockId(chart.id);
          scrollToActiveSlideItem();
          await wait(1800);
          setGuidedStatus('Переключаем тип графика: столбцы -> горизонтальные');
          await client.patchBlock(chart.id, {
            type: 'chart',
            config: { ...(chart.config || {}), kind: 'horizontalBar' },
          });
          await wait(1800);
        }
        if (table && datasetsQuery.data?.[0]) {
          setGuidedStatus('Редактируем строку датасета для таблицы');
          const dataset = datasetsQuery.data[0];
          const rows = [...dataset.rows];
          if (rows[0]) rows[0] = { ...rows[0], revenue: 333000 };
          await client.patchDataset(dataset.id, { rows });
          await queryClient.invalidateQueries({ queryKey: ['datasets', presentationId] });
          setSelectedBlockId(table.id);
          scrollToActiveSlideItem();
          await wait(1800);
        }
        if (kpi) {
          const constructorPreset =
            (layoutPresetsQuery.data || []).find((preset) => preset.nameKey === 'layout.grid2x2') ||
            (layoutPresetsQuery.data || []).find((preset) => (preset.schema?.slots || []).length >= 4) ||
            null;
          if (constructorPreset) {
            setGuidedStatus('Показываем карточки: меняем 4-й слот на блок карточек');
            const slots = constructorPreset.schema?.slots || [];
            const nextAssignments = [text?.id, image?.id, chart?.id, kpi.id]
              .map((blockId, index) => {
                const slot = slots[index];
                if (!slot?.id || !blockId) return null;
                return { slotId: slot.id, blockId };
              })
              .filter(Boolean) as Array<{ slotId: string; blockId: string }>;
            if (nextAssignments.length) {
              await client.patchSlideLayout(constructorSlide.id, {
                layoutPresetId: constructorPreset.id,
                slotAssignments: nextAssignments,
              });
              setSlideLayoutPresetId(constructorPreset.id);
              setSlideSlotAssignments(nextAssignments);
              await queryClient.invalidateQueries({ queryKey: ['slides', presentationId] });
              await wait(1700);
            }
          }
        }
        if (image) {
          setGuidedStatus('Переходим к блоку изображения: включаем кроп и показываем сдвиг');
          await client.patchBlock(image.id, {
            type: 'image',
            config: {
              ...(image.config || {}),
              fitMode: 'cover',
              focalPoint: 'right top',
              zoom: 142,
              offsetX: -56,
              offsetY: 18,
            },
          });
          setSelectedBlockId(image.id);
          scrollToActiveSlideItem();
          await wait(2000);
          await client.patchBlock(image.id, {
            type: 'image',
            config: {
              ...(image.config || {}),
              fitMode: 'cover',
              zoom: 142,
              focalPoint: 'center center',
              offsetX: 24,
              offsetY: -12,
            },
          });
          await wait(1800);
        }
        setGuidedStatus('Обновляем превью с изменениями');
        await queryClient.invalidateQueries({ queryKey: ['blocks', constructorSlide.id] });
        await buildPreviewMutation.mutateAsync();
        await wait(800);
        scrollPreviewToSlide(constructorSlide.id);
        await wait(1200);
      },
    },
    {
      selector: '[data-demo="editor-theme-select"]',
      title: 'Слайд для сравнения тем',
      description: 'Переходим на слайд 2x2 с четырьмя блоками. На нем лучше всего видно, как одна и та же структура меняет стиль от темы.',
      kind: 'info',
      delayMs: 6600,
    },
    {
      selector: '[data-demo="editor-theme-select"]',
      title: 'Подготовка слайда для сравнения тем',
      description: 'Сейчас автоматически выбираем слайд 2x2, чтобы показать визуальную разницу между темами.',
      kind: 'action',
      run: async () => {
        const preferred = (slidesQuery.data || []).find((slide) => /2x2/i.test(slide.title || ''));
        if (preferred) {
          setGuidedStatus('Переходим на слайд 2x2');
          await selectSlideAndFocus(preferred);
          await buildPreviewMutation.mutateAsync();
          await wait(700);
          scrollPreviewToSlide(preferred.id);
          await wait(1300);
        }
      },
    },
    {
      selector: '[data-demo="editor-theme-select"]',
      title: 'Смена тем в реальном времени',
      description: 'Сейчас по очереди применим несколько тем и сделаем паузы подольше, чтобы вы успели сравнить контент в одном и том же лейауте.',
      kind: 'info',
      delayMs: 6800,
    },
    {
      selector: '[data-demo="editor-theme-select"]',
      title: 'Быстрая смена темы',
      description: 'Сейчас покажем, как этот же 2x2 слайд мгновенно меняет стиль при переключении тем.',
      kind: 'action',
      run: async () => {
        const state = readGuidedDemoState();
        const ids = (state?.showcaseThemeIds || []).slice(0, 3);
        for (const themeId of ids) {
          setGuidedStatus(`Применяем тему: ${themeId}`);
          // eslint-disable-next-line no-await-in-loop
          await patchPresentationMutation.mutateAsync(themeId);
          // eslint-disable-next-line no-await-in-loop
          await buildPreviewMutation.mutateAsync();
          const preferred = (slidesQuery.data || []).find((slide) => /2x2/i.test(slide.title || ''));
          if (preferred) {
            // eslint-disable-next-line no-await-in-loop
            await wait(600);
            scrollPreviewToSlide(preferred.id);
          }
          // eslint-disable-next-line no-await-in-loop
          await wait(3400);
        }
      },
    },
    {
      selector: '[data-demo="editor-export-group"]',
      title: 'Экспорт',
      description: 'Три режима экспорта: PDF, PPTX-картинка и PPTX-блоки. В демо мы только подсвечиваем кнопки без автоскачивания.',
      kind: 'info',
      delayMs: 7600,
    },
    {
      selector: '[data-demo="editor-export-group"]',
      title: 'Демо завершено',
      description: 'Теперь можно вручную нажать любой режим экспорта и проверить результат.',
      kind: 'action',
      run: async () => {
        clearGuidedDemoState();
      },
    },
  ];

  useEffect(() => {
    if (selectedSlide?.type === 'title') {
      setSelectedBlockId('');
    }
  }, [selectedSlide?.id, selectedSlide?.type]);

  useEffect(() => {
    if (!guidedActive || !guidedState) return;
    setGuidedStep(Number.isFinite(guidedState.stepIndex) ? guidedState.stepIndex : 0);
    setGuidedPaused(Boolean(guidedState.paused));
    const constructorSlide = (slidesQuery.data || []).find((slide) => /конструктор блоков/i.test(slide.title || ''));
    if (constructorSlide) setSelectedSlideId(constructorSlide.id);
  }, [guidedActive, guidedState, slidesQuery.data]);

  const nextGuidedEditorStep = () => {
    const state = readGuidedDemoState();
    if (!state) return;
    const next = Math.min(guidedEditorSteps.length - 1, guidedStep + 1);
    setGuidedStep(next);
    writeGuidedDemoState({ ...state, stepIndex: next, paused: guidedPaused });
  };

  const prevGuidedEditorStep = () => {
    const state = readGuidedDemoState();
    if (!state) return;
    const next = Math.max(0, guidedStep - 1);
    setGuidedStep(next);
    writeGuidedDemoState({ ...state, stepIndex: next, paused: guidedPaused });
  };

  useEffect(() => {
    if (!guidedActive || guidedPaused) return;
    const step = guidedEditorSteps[Math.min(guidedStep, guidedEditorSteps.length - 1)];
    if (!step) return;
    if (step.kind === 'info') setGuidedStatus('Ознакомьтесь с подсказкой...');
    let canceled = false;
    const run = async () => {
      if (step.kind === 'info') {
        const timeout = window.setTimeout(() => {
          if (!canceled) nextGuidedEditorStep();
        }, step.delayMs || 4000);
        return () => window.clearTimeout(timeout);
      }
      try {
        setGuidedBusy(true);
        setGuidedStatus('Выполняем действие...');
        if (step.run) await step.run();
        if (!canceled) {
          const timeout = window.setTimeout(() => {
            if (!canceled) nextGuidedEditorStep();
          }, 1200);
          return () => window.clearTimeout(timeout);
        }
      } catch (e) {
        setBlockError((e as Error).message);
      } finally {
        setGuidedBusy(false);
      }
      return undefined;
    };
    let cleanup: (() => void) | undefined;
    run().then((fn) => {
      cleanup = fn;
    });
    return () => {
      canceled = true;
      if (cleanup) cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guidedActive, guidedPaused, guidedStep]);

  const handleSelectLayoutPreset = (nextPresetId: string) => {
    setSlideLayoutPresetId(nextPresetId);
    const preset = (layoutPresetsQuery.data || []).find((item) => item.id === nextPresetId);
    const slotIds = (preset?.schema?.slots || []).map((slot) => slot.id);
    setSlideSlotAssignments((prev) =>
      prev
        .filter((item) => slotIds.includes(item.slotId))
        .map((item) => ({ slotId: item.slotId, blockId: item.blockId })),
    );
  };

  const createManualDatasetDraft = () => {
    const next = emptyDatasetDraft();
    setSelectedDatasetId('');
    setDatasetDraftName(next.name);
    setDatasetDraftColumns(next.columns);
    setDatasetDraftRows(next.rows);
    setDatasetError('');
    setDatasetModalSnapshot(buildDatasetDraftSignature(next.name, next.columns, next.rows));
    setDatasetModalOpen(true);
  };

  const openDatasetEditor = () => {
    if (!selectedDatasetId) {
      createManualDatasetDraft();
      return;
    }
    const selectedDataset = (datasetsQuery.data || []).find((d) => d.id === selectedDatasetId);
    if (!selectedDataset) return;
    setDatasetDraftName(selectedDataset.name);
    setDatasetDraftColumns(selectedDataset.columns);
    const alignedRows = alignRowsToColumns(selectedDataset.rows, selectedDataset.columns);
    setDatasetDraftRows(alignedRows);
    setDatasetError('');
    setDatasetModalSnapshot(buildDatasetDraftSignature(selectedDataset.name, selectedDataset.columns, alignedRows));
    setDatasetModalOpen(true);
  };

  const updateColumn = (index: number, patch: Partial<Dataset['columns'][number]>) => {
    setDatasetDraftColumns((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const addColumn = () => {
    const nextKey = getNextColumnKey(datasetDraftColumns);
    const nextColumns = [
      ...datasetDraftColumns,
      { key: nextKey, label: `Column ${datasetDraftColumns.length + 1}`, type: 'string', nullable: true },
    ];
    setDatasetDraftColumns(nextColumns);
    setDatasetDraftRows((prev) => prev.map((row) => ({ ...row, [nextKey]: '' })));
  };

  const removeColumn = (index: number) => {
    const removedKey = datasetDraftColumns[index]?.key;
    const nextColumns = datasetDraftColumns.filter((_c, idx) => idx !== index);
    setDatasetDraftColumns(nextColumns);
    setDatasetDraftRows((prev) =>
      prev.map((row) => {
        const next = { ...row };
        if (removedKey) delete next[removedKey];
        return next;
      }),
    );
  };

  const addRow = () => {
    const row: Record<string, unknown> = {};
    datasetDraftColumns.forEach((column) => {
      row[column.key] = '';
    });
    setDatasetDraftRows((prev) => [...prev, row]);
  };

  const removeRow = (index: number) => {
    setDatasetDraftRows((prev) => prev.filter((_r, idx) => idx !== index));
  };

  const updateCell = (rowIndex: number, colKey: string, value: string) => {
    setDatasetDraftRows((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [colKey]: value };
      return next;
    });
  };

  const saveDataset = async () => {
    setDatasetError('');

    const trimmedName = datasetDraftName.trim();
    if (!trimmedName) {
      setDatasetError(t('error.datasetNameRequired'));
      return;
    }
    if (!datasetDraftColumns.length) {
      setDatasetError(t('error.datasetColumnsRequired'));
      return;
    }

    const keys = datasetDraftColumns.map((column) => column.key.trim()).filter(Boolean);
    if (keys.length !== datasetDraftColumns.length || new Set(keys).size !== keys.length) {
      setDatasetError(t('error.datasetColumnKeysUnique'));
      return;
    }

    const columns = datasetDraftColumns.map((column, idx) => ({
      key: keys[idx],
      label: column.label || keys[idx],
      type: column.type || 'string',
      nullable: column.nullable !== false,
    }));

    const rows = alignRowsToColumns(datasetDraftRows, columns);

    if (selectedDatasetId) {
      await client.patchDataset(selectedDatasetId, {
        name: trimmedName,
        columns,
        rows,
        meta: { rowCount: rows.length },
      });
    } else {
      const created = await client.createDataset(presentationId, {
        name: trimmedName,
        sourceType: 'manual_table',
        columns,
        rows,
      });
      setSelectedDatasetId(created.id);
    }

    await queryClient.invalidateQueries({ queryKey: ['datasets', presentationId] });
    setDatasetModalSnapshot(buildDatasetDraftSignature(trimmedName, columns, rows));
    setDatasetModalOpen(false);
  };

  const requestCloseDatasetModal = () => {
    if (!datasetModalOpen) return;
    if (!datasetModalDirty) {
      setDatasetModalOpen(false);
      return;
    }
    const discard = window.confirm(t('editor.discardDatasetChanges'));
    if (discard) setDatasetModalOpen(false);
  };

  useEffect(() => {
    if (!datasetModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestCloseDatasetModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [datasetModalOpen, datasetModalDirty]);

  const deleteSelectedDataset = async () => {
    if (!selectedDatasetId) return;
    await client.deleteDataset(selectedDatasetId);
    setSelectedDatasetId('');
    await queryClient.invalidateQueries({ queryKey: ['datasets', presentationId] });
  };

  const uploadImageAndGetUrl = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const uploaded = await client.uploadPresentationImage(presentationId, form);
    return uploaded.url;
  };

  const downloadRenderArtifact = async () => {
    const result = renderJobQuery.data?.result;
    if (!result?.path) return;
    const resp = await fetch(result.path);
    if (!resp.ok) throw new Error(`artifact fetch failed: ${resp.status}`);
    const blob = await resp.blob();
    const suggestedName = result.fileName || (renderJobQuery.data?.type === 'export_pptx_future' ? 'export.pptx' : 'export.pdf');
    const ext = suggestedName.toLowerCase().endsWith('.pptx') ? 'pptx' : suggestedName.toLowerCase().endsWith('.pdf') ? 'pdf' : '';

    type SavePickerWindow = Window & {
      showSaveFilePicker?: (options: {
        suggestedName?: string;
        types?: Array<{ description?: string; accept: Record<string, string[]> }>;
      }) => Promise<{
        createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
      }>;
    };

    const pickerWindow = window as SavePickerWindow;
    if (pickerWindow.showSaveFilePicker) {
      const handle = await pickerWindow.showSaveFilePicker({
        suggestedName,
        types:
          ext === 'pptx'
            ? [{ description: 'PowerPoint', accept: { 'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'] } }]
            : ext === 'pdf'
              ? [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }]
              : undefined,
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    }

    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <div className="editor-page">
      <header className="editor-header">
        <div className="editor-header-left">
          <Button variant="ghost" size="small" onClick={() => navigate('/')}>
            {t('editor.backToList')}
          </Button>
          <strong className="editor-title">{presentationQuery.data?.name || t('editor.titleFallback')}</strong>
          <Button variant="secondary" size="small" onClick={() => buildPreviewMutation.mutate()}>
            {t('editor.refreshPreview')}
          </Button>
        </div>
        <div className="editor-header-center">
          <div className="header-status-stack">
            <span className={`save-state ${saveStatusClass}`} aria-live="polite">
              {headerStatusText || '\u00A0'}
            </span>
            {isExportInProgress ? (
              <div className="export-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={exportProgress}>
                <div className="export-progress-fill" style={{ width: `${exportProgress}%` }} />
              </div>
            ) : null}
          </div>
        </div>
        <div className="editor-header-right">
          <Button variant="secondary" size="small" onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}>
            {themeMode === 'light' ? t('editor.darkUi') : t('editor.lightUi')}
          </Button>
          <select
            className="ui-select compact-header-select"
            value={locale}
            aria-label={t('lang.label')}
            onChange={(e) => setLocale(e.target.value as 'ru' | 'en')}
          >
            <option value="ru">🇷🇺 {t('lang.ru')}</option>
            <option value="en">🇺🇸 {t('lang.en')}</option>
          </select>
          <select
            className="ui-select compact-header-select"
            value={presentationQuery.data?.themeId || 'theme-universal-warm'}
            data-demo="editor-theme-select"
            onChange={(e) => patchPresentationMutation.mutate(e.target.value)}
          >
            {(themesQuery.data || []).map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
          <div className="export-group" data-demo="editor-export-group">
            <Button variant="primary" size="small" onClick={() => startPdfMutation.mutate()}>
              {t('editor.exportPdf')}
            </Button>
            <Button variant="primary" size="small" onClick={() => startPptxMutation.mutate('raster')}>
              {t('editor.exportPptxRaster')}
            </Button>
            <Button variant="primary" size="small" onClick={() => startPptxMutation.mutate('hybrid_blocks')}>
              {t('editor.exportPptxBlocks')}
            </Button>
          </div>
          {renderJobQuery.data?.status === 'done' && renderJobQuery.data?.result?.path ? (
            <Button variant="secondary" size="small" onClick={() => void downloadRenderArtifact()}>
              {t('editor.downloadExport')}
            </Button>
          ) : null}
        </div>
      </header>

      <div className="editor-grid">
        <aside className="panel left" data-demo="editor-slides-panel">
          <div className="panel-row">
            <h3>{t('editor.slides')}</h3>
            <div className="panel-row">
              <Button size="small" onClick={() => createSlideMutation.mutate({ type: 'content', title: t('editor.untitled') })}>
                {t('editor.addContentSlide')}
              </Button>
              <Button size="small" onClick={() => createSlideMutation.mutate({ type: 'title', title: t('editor.sectionTitleSlide') })}>
                {t('editor.addSectionSlide')}
              </Button>
            </div>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => {
              const { active, over } = e;
              if (!over || active.id === over.id) return;
              const oldIndex = slides.findIndex((s) => s.id === active.id);
              const newIndex = slides.findIndex((s) => s.id === over.id);
              const updated = arrayMove(slides, oldIndex, newIndex).map((s) => s.id);
              reorderSlidesMutation.mutate(updated);
            }}
          >
            <SortableContext items={slideIds} strategy={verticalListSortingStrategy}>
              {slides.map((slide: Slide) => (
                <DragItem
                  key={slide.id}
                  id={slide.id}
                  label={`${slide.order + 1}. ${slide.title || t('editor.untitled')}`}
                  active={selectedSlideId === slide.id}
                  dragHandleLabel={t('editor.dragSlide', { name: slide.title || t('editor.untitled') })}
                  removeLabel={t('common.delete')}
                  onRemove={() => deleteSlideMutation.mutate(slide.id)}
                  onClick={() => {
                    setSelectedSlideId(slide.id);
                    setSelectedBlockId('');
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>

          {selectedSlideId && (
            <>
              <div className="panel-row mt" data-demo="editor-blocks-section">
                <h3>{t('editor.blocks')}</h3>
              </div>
              {isTitleSlide ? (
                <p className="hint">{t('editor.titleSlideNoBlocks')}</p>
              ) : (
                <>
                  <p className="hint">
                    {selectedSlide ? `${t('editor.slideTitle')}: ${selectedSlide.title || t('editor.untitled')}` : ''}
                  </p>
                  <div className="panel-row">
                    <select className="ui-select compact-select" value={newBlockType} onChange={(e) => setNewBlockType(e.target.value as Block['type'])}>
                      <option value="text">{t('block.text')}</option>
                      <option value="image">{t('block.image')}</option>
                      <option value="chart">{t('block.chart')}</option>
                      <option value="table">{t('block.table')}</option>
                      <option value="kpi">{t('block.kpi')}</option>
                    </select>
                    <Button
                      size="small"
                      onClick={() => {
                        setBlockError('');
                        createBlockMutation.mutate(newBlockType);
                      }}
                    >
                      {t('editor.addBlock')}
                    </Button>
                  </div>
                  <p className="hint">{t('editor.addBlockHint')}</p>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => {
                      const { active, over } = e;
                      if (!over || active.id === over.id) return;
                      const oldIndex = blocks.findIndex((b) => b.id === active.id);
                      const newIndex = blocks.findIndex((b) => b.id === over.id);
                      const updated = arrayMove(blocks, oldIndex, newIndex).map((b) => b.id);
                      reorderBlocksMutation.mutate(updated);
                    }}
                  >
                    <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
                  {blocks.map((block, index) => (
                    <DragItem
                      key={block.id}
                      id={block.id}
                      label={blockDisplayLabel(block, index, t)}
                      active={selectedBlockId === block.id}
                      dragHandleLabel={t('editor.dragBlock', { name: blockDisplayLabel(block, index, t) })}
                      onClick={() => setSelectedBlockId(block.id)}
                      removeLabel={t('editor.deleteBlock')}
                      onRemove={() => deleteBlockMutation.mutate(block.id)}
                    />
                  ))}
                    </SortableContext>
                  </DndContext>
                  {selectedBlock && (
                    <SectionCard title={t('editor.blockSettings')} className="mt">
                      <BlockConfigForm
                        presentationId={presentationId}
                        type={blockType}
                        config={blockConfig}
                        datasets={datasetsQuery.data || []}
                        themeColors={themeColors}
                        onTypeChange={setBlockType}
                        onConfigChange={setBlockConfig}
                        onImageUpload={uploadImageAndGetUrl}
                      />
                      {blockError && <p className="ui-error">{blockError}</p>}
                      <Button
                        variant="danger"
                        onClick={() => deleteBlockMutation.mutate(selectedBlock.id)}
                      >
                        {t('editor.deleteBlock')}
                      </Button>
                    </SectionCard>
                  )}
                </>
              )}
            </>
          )}
        </aside>

        <main className="panel center">
          <h3>{t('editor.preview')}</h3>
          <iframe
            ref={previewFrameRef}
            title="preview"
            src={previewSrc}
            className="preview-frame"
            onLoad={() => {
              try {
                const frameWindow = previewFrameRef.current?.contentWindow;
                if (!frameWindow) return;
                const top = previewScrollTopRef.current || 0;
                frameWindow.scrollTo(0, top);
              } catch (_e) {
                // no-op: iframe content may be temporarily unavailable
              }
            }}
          />
        </main>

        <aside className="panel right" data-demo="editor-properties-panel">
          <h3>{t('editor.properties')}</h3>
          {selectedSlide && (
            <SectionCard title={t('editor.slideSettings')}>
              <div className="properties">
                <Field label={t('editor.slideType')}>
                  <p className="static-value">{isTitleSlide ? t('editor.sectionTitleSlide') : t('editor.contentSlide')}</p>
                </Field>
                <Field label={t('editor.slideTitle')}>
                  <input className="ui-input" value={slideTitle} onChange={(e) => setSlideTitle(e.target.value)} />
                </Field>
                <Field label={t('editor.slideSubtitle')}>
                  <input className="ui-input" value={slideSubtitle} onChange={(e) => setSlideSubtitle(e.target.value)} />
                </Field>
                {!isTitleSlide && (
                  <>
                    <Field label={t('editor.layoutPreset')}>
                      <p className="hint">{t('editor.selectLayoutPreset')}</p>
                    </Field>
                    <div className="layout-picker-grid" role="list" aria-label={t('editor.layoutPreset')}>
                      {(layoutPresetsQuery.data || []).map((preset) => {
                        const preview = getLayoutPreviewGrid(preset.schema || {});
                        const isActive = slideLayoutPresetId === preset.id;
                        return (
                          <button
                            type="button"
                            key={preset.id}
                            className={`layout-picker-card ${isActive ? 'active' : ''}`}
                            onClick={() => handleSelectLayoutPreset(preset.id)}
                            aria-pressed={isActive}
                          >
                            <div
                              className="layout-picker-thumb"
                              style={{
                                gridTemplateColumns: `repeat(${preview.colCount}, 1fr)`,
                                gridTemplateRows: `repeat(${preview.rowCount}, 1fr)`,
                                gridTemplateAreas: preview.templateAreas || undefined,
                              }}
                            >
                              {(preset.schema?.slots || []).map((slot, idx) => (
                                <div key={slot.id} className="layout-picker-slot" style={slot.area ? { gridArea: slot.area } : undefined}>
                                  {idx + 1}
                                </div>
                              ))}
                            </div>
                            <span>{layoutPresetLabel(preset, t)}</span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedLayoutPreset?.schema?.slots?.map((slot) => {
                      const selectedBlockForSlot = slideSlotAssignments.find((item) => item.slotId === slot.id)?.blockId || '';
                      const allowedBlocks = blocks.filter((block) => slotAllowsBlock(slot, block.type));
                      const imageOnlySlot =
                        Array.isArray(slot.allowedBlockTypes) &&
                        slot.allowedBlockTypes.length > 0 &&
                        slot.allowedBlockTypes.every((type) => type === 'image');
                      return (
                        <Field key={slot.id} label={`${t('editor.slot')}: ${slot.id}`}>
                          <select
                            className="ui-select"
                            value={selectedBlockForSlot}
                            onChange={(e) => {
                              const nextBlockId = e.target.value;
                              setSlideSlotAssignments((prev) => {
                                const withoutCurrent = prev.filter((item) => item.slotId !== slot.id);
                                if (!nextBlockId) return withoutCurrent;
                                return [...withoutCurrent, { slotId: slot.id, blockId: nextBlockId }];
                              });
                            }}
                          >
                            <option value="">{t('editor.unassigned')}</option>
                            {allowedBlocks.map((block) => (
                              <option key={block.id} value={block.id}>
                                {blockDisplayLabel(block, blockIndexMap.get(block.id) || 0, t)}
                              </option>
                            ))}
                          </select>
                          {imageOnlySlot && (
                            <Button
                              size="small"
                              onClick={async () => {
                                if (!selectedSlideId) return;
                                try {
                                  setSaveState('saving');
                                  setBlockError('');
                                  const created = await client.createBlock(selectedSlideId, {
                                    type: 'image',
                                    config: getDefaultConfig('image'),
                                  });
                                  await queryClient.invalidateQueries({ queryKey: ['blocks', selectedSlideId] });
                                  setSelectedBlockId(created.id);
                                  setSlideSlotAssignments((prev) => {
                                    const withoutCurrent = prev.filter((item) => item.slotId !== slot.id);
                                    return [...withoutCurrent, { slotId: slot.id, blockId: created.id }];
                                  });
                                  setSaveState('saved');
                                } catch (error) {
                                  setBlockError((error as Error).message);
                                  setSaveState('error');
                                }
                              }}
                            >
                              {t('editor.addImageToSlot')}
                            </Button>
                          )}
                        </Field>
                      );
                    })}
                    <Button
                      variant="secondary"
                      disabled={!selectedSlide?.id || !slideLayoutPresetId}
                      onClick={() => {
                        if (!selectedSlide?.id || !slideLayoutPresetId) return;
                        patchSlideLayoutMutation.mutate({
                          slideId: selectedSlide.id,
                          layoutPresetId: slideLayoutPresetId,
                          slotAssignments: slideSlotAssignments,
                        });
                      }}
                    >
                      {t('editor.saveLayout')}
                    </Button>
                  </>
                )}
              </div>
            </SectionCard>
          )}

          <SectionCard title={t('editor.datasets')} className="mt">
            <p className="dataset-meta">{t('editor.datasetsExisting', { count: (datasetsQuery.data || []).length })}</p>
            <div className="panel-row">
              <select className="ui-select compact-select" value={selectedDatasetId} onChange={(e) => setSelectedDatasetId(e.target.value)}>
                <option value="">{t('editor.newManualDataset')}</option>
                {(datasetsQuery.data || []).map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.name}
                  </option>
                ))}
              </select>
              <Button size="small" onClick={createManualDatasetDraft}>
                {t('common.new')}
              </Button>
            </div>
            <div className="panel-row">
              <Button size="small" onClick={openDatasetEditor}>
                {selectedDatasetId ? t('editor.editDataset') : t('editor.createAndEditDataset')}
              </Button>
              {selectedDatasetId && (
                <Button variant="danger" size="small" onClick={() => void deleteSelectedDataset()}>
                  {t('common.delete')}
                </Button>
              )}
            </div>
            {datasetError && <p className="ui-error">{datasetError}</p>}

            <FileUploadControl
              label={t('editor.uploadCsv')}
              buttonLabel={t('common.upload')}
              accept=".csv,text/csv"
              fileName={csvFile?.name || ''}
              onFileSelect={(file) => setCsvFile(file)}
            />
            <Button
              onClick={() => {
                if (!csvFile) return;
                const form = new FormData();
                form.append('name', csvFile.name.replace('.csv', ''));
                form.append('file', csvFile);
                client.uploadCsvDataset(presentationId, form).then(() => {
                  setCsvFile(null);
                  queryClient.invalidateQueries({ queryKey: ['datasets', presentationId] });
                });
              }}
            >
              {t('common.upload')}
            </Button>
          </SectionCard>
        </aside>
      </div>
      {datasetModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="panel-row">
              <h3>{selectedDatasetId ? t('editor.editDataset') : t('editor.createDataset')}</h3>
              <Button variant="ghost" size="small" onClick={requestCloseDatasetModal}>
                {t('common.close')}
              </Button>
            </div>
            <Field label={t('editor.datasetName')}>
              <input className="ui-input" value={datasetDraftName} onChange={(e) => setDatasetDraftName(e.target.value)} />
            </Field>
            <div className="panel-row mt">
              <strong>{t('editor.columns')}</strong>
              <div className="panel-row">
                <Button size="small" onClick={addColumn}>
                  {t('editor.addColumn')}
                </Button>
                <Button size="small" onClick={addRow}>
                  {t('editor.addRow')}
                </Button>
              </div>
            </div>
            <div className="table-modal-wrap">
              <table className="dataset-editor-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {datasetDraftColumns.map((column, idx) => (
                      <th key={`head-${idx}`}>
                        <div className="dataset-head-cell">
                          <input
                            className="ui-input"
                            placeholder={`Column ${idx + 1}`}
                            value={column.label}
                            onChange={(e) => updateColumn(idx, { label: e.target.value })}
                          />
                          <Button variant="ghost" size="small" className="soft-danger" onClick={() => removeColumn(idx)}>
                            {t('editor.removeColumn')}
                          </Button>
                        </div>
                      </th>
                    ))}
                    <th>{t('editor.rowActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {datasetDraftRows.map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                      <td>{rowIndex + 1}</td>
                      {datasetDraftColumns.map((column) => (
                        <td key={`cell-${rowIndex}-${column.key}`}>
                          <input
                            className="ui-input"
                            value={String(row[column.key] ?? '')}
                            onChange={(e) => updateCell(rowIndex, column.key, e.target.value)}
                          />
                        </td>
                      ))}
                      <td>
                        <Button variant="ghost" size="small" className="soft-danger" onClick={() => removeRow(rowIndex)}>
                          {t('editor.removeRow')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="panel-row mt">
              <Button variant="primary" onClick={() => void saveDataset()}>
                {selectedDatasetId ? t('editor.saveDataset') : t('editor.createDataset')}
              </Button>
              <Button variant="secondary" onClick={requestCloseDatasetModal}>
                {t('common.cancel')}
              </Button>
            </div>
            {datasetError && <p className="ui-error">{datasetError}</p>}
          </div>
        </div>
      )}
      {guidedActive && guidedState ? (
        <DemoCoach
          title={guidedEditorSteps[Math.min(guidedStep, guidedEditorSteps.length - 1)]?.title || 'Гид по редактору'}
          description={guidedEditorSteps[Math.min(guidedStep, guidedEditorSteps.length - 1)]?.description || ''}
          step={Math.min(guidedStep, guidedEditorSteps.length - 1)}
          total={guidedEditorSteps.length}
          selector={guidedEditorSteps[Math.min(guidedStep, guidedEditorSteps.length - 1)]?.selector}
          busy={guidedBusy}
          auto
          paused={guidedPaused}
          statusText={guidedStatus}
          hidden={guidedEditorSteps[Math.min(guidedStep, guidedEditorSteps.length - 1)]?.kind === 'action'}
          onPrev={guidedStep > 0 ? prevGuidedEditorStep : undefined}
          onNext={() => nextGuidedEditorStep()}
          onTogglePause={() => {
            const next = !guidedPaused;
            setGuidedPaused(next);
            if (guidedState) writeGuidedDemoState({ ...guidedState, paused: next });
          }}
          onSkip={() => {
            clearGuidedDemoState();
          }}
        />
      ) : null}
    </div>
  );
}
