import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { client } from '../api/client';
import type { Block, Dataset, Slide } from '../api/types';
import { BlockConfigForm, getDefaultConfig } from '../components/BlockConfigForm';
import { useDebouncedEffect } from '../hooks/useDebouncedEffect';
import './editor.css';

function DragItem({
  id,
  label,
  active,
  onClick,
}: {
  id: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`drag-item ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <button className="drag-handle" {...attributes} {...listeners} title="Drag">
        ::
      </button>
      <span>{label}</span>
    </div>
  );
}

function validateConfig(type: Block['type'], config: Record<string, unknown>): string {
  if (type === 'text' && typeof config.html !== 'string') return 'text requires {"html": "..."}';
  if (type === 'image' && typeof config.url !== 'string' && typeof config.src !== 'string') {
    return 'image requires {"url": "..."} or {"src": "..."}';
  }
  if (type === 'chart') {
    if (typeof config.datasetId !== 'string' || typeof config.kind !== 'string') {
      return 'chart requires datasetId and kind';
    }
  }
  if (type === 'table' && typeof config.datasetId !== 'string') return 'table requires datasetId';
  if (type === 'kpi' && config.mode !== 'manual' && typeof config.datasetId !== 'string') return 'kpi dataset mode requires datasetId';
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

function getCreateBlockConfig(type: Block['type'], datasets: Dataset[]) {
  const base = getDefaultConfig(type);
  const primaryDataset = datasets[0];

  if (type === 'table') {
    if (!primaryDataset) {
      throw new Error('Create or upload a dataset before adding a table block');
    }
    return {
      ...base,
      datasetId: primaryDataset.id,
    };
  }

  if (type === 'chart') {
    if (!primaryDataset) {
      throw new Error('Create or upload a dataset before adding a chart block');
    }
    const keys = (primaryDataset.columns || []).map((c) => c.key).filter(Boolean);
    if (keys.length < 2) {
      throw new Error('Chart requires dataset with at least 2 columns');
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

export function EditorPage() {
  const { id: presentationId = '' } = useParams();
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['slides', presentationId] }),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks', selectedSlideId] });
      buildPreviewMutation.mutate();
    },
  });

  useDebouncedEffect(
    () => {
      if (!selectedBlockId) return;
      const error = validateConfig(blockType, blockConfig);
      setBlockError(error);
      if (error) return;
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

  const createBlockMutation = useMutation({
    mutationFn: (type: Block['type']) =>
      client.createBlock(selectedSlideId, { type, config: getCreateBlockConfig(type, datasetsQuery.data || []) }),
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
      setDatasetError('Dataset name is required');
      return;
    }
    if (!datasetDraftColumns.length) {
      setDatasetError('At least one column is required');
      return;
    }

    const keys = datasetDraftColumns.map((column) => column.key.trim()).filter(Boolean);
    if (keys.length !== datasetDraftColumns.length || new Set(keys).size !== keys.length) {
      setDatasetError('Column keys must be non-empty and unique');
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
    const discard = window.confirm('Discard unsaved dataset changes?');
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
        <Link to="/">Back</Link>
        <strong>{presentationQuery.data?.name || 'Editor'}</strong>
        <select
          value={presentationQuery.data?.themeId || 'theme-eurofoods'}
          onChange={(e) => {
            client.patchPresentation(presentationId, { themeId: e.target.value }).then(() => {
              queryClient.invalidateQueries({ queryKey: ['presentation', presentationId] });
            });
          }}
        >
          {(themesQuery.data || []).map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>
        <button onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}>
          {themeMode === 'light' ? 'Dark UI' : 'Light UI'}
        </button>
        <button
          onClick={() => buildPreviewMutation.mutate()}
        >
          Refresh Preview
        </button>
        <button onClick={() => startPdfMutation.mutate()}>Export PDF</button>
        <span>{renderJobQuery.data ? `PDF: ${renderJobQuery.data.status}` : ''}</span>
      </header>

      <div className="editor-grid">
        <aside className="panel left">
          <div className="panel-row">
            <h3>Slides</h3>
            <button onClick={() => createSlideMutation.mutate()}>+ Slide</button>
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
                  label={slide.title || 'Untitled'}
                  active={selectedSlideId === slide.id}
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
                <h3>Blocks</h3>
              </div>
              <div className="panel-row">
                <select value={newBlockType} onChange={(e) => setNewBlockType(e.target.value as Block['type'])}>
                  <option value="text">text</option>
                  <option value="image">image</option>
                  <option value="chart">chart</option>
                  <option value="table">table</option>
                  <option value="kpi">kpi</option>
                </select>
                <button
                  onClick={() => {
                    setBlockError('');
                    createBlockMutation.mutate(newBlockType);
                  }}
                >
                  Add block
                </button>
              </div>
              <p className="hint">Select type and click Add block</p>
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
                      label={block.type}
                      active={selectedBlockId === block.id}
                      onClick={() => setSelectedBlockId(block.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </>
          )}
        </aside>

        <main className="panel center">
          <h3>Preview</h3>
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
          <h3>Properties</h3>
          {selectedSlide && (
            <div className="properties">
              <label>
                Slide title
                <input value={slideTitle} onChange={(e) => setSlideTitle(e.target.value)} />
              </label>
              <label>
                Slide subtitle
                <input value={slideSubtitle} onChange={(e) => setSlideSubtitle(e.target.value)} />
              </label>
            </div>
          )}

          {selectedBlock && (
            <div className="properties mt">
              <BlockConfigForm
                presentationId={presentationId}
                type={blockType}
                config={blockConfig}
                datasets={datasetsQuery.data || []}
                onTypeChange={setBlockType}
                onConfigChange={setBlockConfig}
                onImageUpload={uploadImageAndGetUrl}
              />
              {blockError && <p className="error">{blockError}</p>}
              <button
                className="danger"
                onClick={() => {
                  client.deleteBlock(selectedBlock.id).then(() => {
                    setSelectedBlockId('');
                    queryClient.invalidateQueries({ queryKey: ['blocks', selectedSlideId] });
                  });
                }}
              >
                Delete block
              </button>
            </div>
          )}

          <div className="properties mt">
            <h4>Datasets</h4>
            <p>Existing: {(datasetsQuery.data || []).length}</p>
            <div className="panel-row">
              <select value={selectedDatasetId} onChange={(e) => setSelectedDatasetId(e.target.value)}>
                <option value="">New manual dataset</option>
                {(datasetsQuery.data || []).map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.name}
                  </option>
                ))}
              </select>
              <button onClick={createManualDatasetDraft}>New</button>
            </div>
            <div className="panel-row">
              <button onClick={openDatasetEditor}>{selectedDatasetId ? 'Edit dataset' : 'Create & edit'}</button>
              {selectedDatasetId && (
                <button className="danger" onClick={() => void deleteSelectedDataset()}>
                  Delete
                </button>
              )}
            </div>
            {datasetError && <p className="error">{datasetError}</p>}

            <label>
              Upload CSV
              <input type="file" accept=".csv,text/csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
            </label>
            <button
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
              Upload
            </button>
          </div>
        </aside>
      </div>
      {datasetModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="panel-row">
              <h3>{selectedDatasetId ? 'Edit dataset' : 'Create dataset'}</h3>
              <button onClick={requestCloseDatasetModal}>Close</button>
            </div>
            <label>
              Dataset name
              <input value={datasetDraftName} onChange={(e) => setDatasetDraftName(e.target.value)} />
            </label>
            <div className="panel-row mt">
              <strong>Columns</strong>
              <div className="panel-row">
                <button onClick={addColumn}>+ Column</button>
                <button onClick={addRow}>+ Row</button>
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
                            placeholder={`Column ${idx + 1}`}
                            value={column.label}
                            onChange={(e) => updateColumn(idx, { label: e.target.value })}
                          />
                          <button className="soft-danger" onClick={() => removeColumn(idx)}>
                            Remove column
                          </button>
                        </div>
                      </th>
                    ))}
                    <th>Row actions</th>
                  </tr>
                </thead>
                <tbody>
                  {datasetDraftRows.map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                      <td>{rowIndex + 1}</td>
                      {datasetDraftColumns.map((column) => (
                        <td key={`cell-${rowIndex}-${column.key}`}>
                          <input
                            value={String(row[column.key] ?? '')}
                            onChange={(e) => updateCell(rowIndex, column.key, e.target.value)}
                          />
                        </td>
                      ))}
                      <td>
                        <button className="soft-danger" onClick={() => removeRow(rowIndex)}>
                          Remove row
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="panel-row mt">
              <button onClick={() => void saveDataset()}>{selectedDatasetId ? 'Save dataset' : 'Create dataset'}</button>
              <button onClick={requestCloseDatasetModal}>Cancel</button>
            </div>
            {datasetError && <p className="error">{datasetError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
