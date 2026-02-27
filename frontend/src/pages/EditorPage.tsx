import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { client } from '../api/client';
import type { Block, Dataset, Slide } from '../api/types';
import { BlockConfigForm, getDefaultConfig } from '../components/BlockConfigForm';
import { useDebouncedEffect } from '../hooks/useDebouncedEffect';
import { useI18n } from '../shared/i18n/I18nProvider';
import type { TranslationKey } from '../shared/i18n/dictionaries';
import { Button } from '../shared/ui/Button';
import { Field } from '../shared/ui/Field';
import { SectionCard } from '../shared/ui/SectionCard';
import './editor.css';

function DragItem({
  id,
  label,
  active,
  onClick,
  dragHandleLabel,
}: {
  id: string;
  label: string;
  active: boolean;
  onClick: () => void;
  dragHandleLabel: string;
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
  const [blockType, setBlockType] = useState<Block['type']>('text');
  const [blockConfig, setBlockConfig] = useState<Record<string, unknown>>({});
  const [newBlockType, setNewBlockType] = useState<Block['type']>('text');
  const [blockError, setBlockError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewNonce, setPreviewNonce] = useState(0);
  const [renderJobId, setRenderJobId] = useState('');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [datasetDraftName, setDatasetDraftName] = useState('manual_dataset');
  const [datasetDraftColumns, setDatasetDraftColumns] = useState<Dataset['columns']>([]);
  const [datasetDraftRows, setDatasetDraftRows] = useState<Array<Record<string, unknown>>>([]);
  const [datasetError, setDatasetError] = useState('');
  const [datasetModalOpen, setDatasetModalOpen] = useState(false);
  const [datasetModalSnapshot, setDatasetModalSnapshot] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const previewScrollTopRef = useRef(0);

  const presentationQuery = useQuery({
    queryKey: ['presentation', presentationId],
    queryFn: () => client.getPresentation(presentationId),
  });
  const slidesQuery = useQuery({
    queryKey: ['slides', presentationId],
    queryFn: () => client.listSlides(presentationId),
  });
  const themesQuery = useQuery({ queryKey: ['themes'], queryFn: client.listThemes });
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
    mutationFn: () => client.createSlide(presentationId, { type: 'content', title: 'New Slide' }),
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
  const reorderBlocksMutation = useMutation({
    mutationFn: (blockIds: string[]) => client.reorderBlocks(selectedSlideId, blockIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blocks', selectedSlideId] }),
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

  const renderJobQuery = useQuery({
    queryKey: ['render-job', renderJobId],
    queryFn: () => client.getRenderJob(renderJobId),
    enabled: Boolean(renderJobId),
    refetchInterval: (query) => (query.state.data?.status === 'done' || query.state.data?.status === 'failed' ? false : 1500),
  });

  const slides = slidesQuery.data || [];
  const blocks = blocksQuery.data || [];
  const slideIds = useMemo(() => slides.map((s) => s.id), [slides]);
  const blockIds = useMemo(() => blocks.map((b) => b.id), [blocks]);

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
  const datasetModalDirty = useMemo(
    () => buildDatasetDraftSignature(datasetDraftName, datasetDraftColumns, datasetDraftRows) !== datasetModalSnapshot,
    [datasetDraftColumns, datasetDraftName, datasetDraftRows, datasetModalSnapshot],
  );

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

  return (
    <div className="editor-page">
      <header className="editor-header">
        <Button variant="ghost" onClick={() => navigate('/')}>
          {t('editor.backToList')}
        </Button>
        <strong>{presentationQuery.data?.name || t('editor.titleFallback')}</strong>
        <Field label={t('lang.label')} className="lang-field compact-lang-field">
          <select className="ui-select compact-select" value={locale} onChange={(e) => setLocale(e.target.value as 'ru' | 'en')}>
            <option value="ru">{t('lang.ru')}</option>
            <option value="en">{t('lang.en')}</option>
          </select>
        </Field>
        <select
          className="ui-select compact-select"
          value={presentationQuery.data?.themeId || 'theme-eurofoods'}
          onChange={(e) => patchPresentationMutation.mutate(e.target.value)}
        >
          {(themesQuery.data || []).map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>
        <Button variant="secondary" onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}>
          {themeMode === 'light' ? t('editor.darkUi') : t('editor.lightUi')}
        </Button>
        <Button variant="secondary" onClick={() => buildPreviewMutation.mutate()}>
          {t('editor.refreshPreview')}
        </Button>
        <Button variant="primary" onClick={() => startPdfMutation.mutate()}>
          {t('editor.exportPdf')}
        </Button>
        <span className={`save-state ${saveStatusClass}`} aria-live="polite">
          {saveStatusText}
        </span>
        <span className="pdf-status" aria-live="polite">
          {renderJobQuery.data ? t('editor.pdfStatus', { status: renderJobQuery.data.status }) : ''}
        </span>
      </header>

      <div className="editor-grid">
        <aside className="panel left">
          <div className="panel-row">
            <h3>{t('editor.slides')}</h3>
            <Button size="small" onClick={() => createSlideMutation.mutate()}>
              {t('editor.addSlide')}
            </Button>
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
                  label={slide.title || t('editor.untitled')}
                  active={selectedSlideId === slide.id}
                  dragHandleLabel={t('editor.dragSlide', { name: slide.title || t('editor.untitled') })}
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
              <div className="panel-row mt">
                <h3>{t('editor.blocks')}</h3>
              </div>
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
                  {blocks.map((block) => (
                    <DragItem
                      key={block.id}
                      id={block.id}
                      label={blockTypeLabel(block.type, t)}
                      active={selectedBlockId === block.id}
                      dragHandleLabel={t('editor.dragBlock', { name: blockTypeLabel(block.type, t) })}
                      onClick={() => setSelectedBlockId(block.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
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

        <aside className="panel right">
          <h3>{t('editor.properties')}</h3>
          {selectedSlide && (
            <SectionCard title={t('editor.slideSettings')}>
              <div className="properties">
                <Field label={t('editor.slideTitle')}>
                  <input className="ui-input" value={slideTitle} onChange={(e) => setSlideTitle(e.target.value)} />
                </Field>
                <Field label={t('editor.slideSubtitle')}>
                  <input className="ui-input" value={slideSubtitle} onChange={(e) => setSlideSubtitle(e.target.value)} />
                </Field>
              </div>
            </SectionCard>
          )}

          {selectedBlock && (
            <SectionCard title={t('editor.blockSettings')} className="mt">
              <BlockConfigForm
                presentationId={presentationId}
                type={blockType}
                config={blockConfig}
                datasets={datasetsQuery.data || []}
                onTypeChange={setBlockType}
                onConfigChange={setBlockConfig}
                onImageUpload={uploadImageAndGetUrl}
              />
              {blockError && <p className="ui-error">{blockError}</p>}
              <Button
                variant="danger"
                onClick={() => {
                  client.deleteBlock(selectedBlock.id).then(() => {
                    setSelectedBlockId('');
                    queryClient.invalidateQueries({ queryKey: ['blocks', selectedSlideId] });
                  });
                }}
              >
                {t('editor.deleteBlock')}
              </Button>
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

            <Field label={t('editor.uploadCsv')}>
              <input className="ui-input" type="file" accept=".csv,text/csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
            </Field>
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
    </div>
  );
}
