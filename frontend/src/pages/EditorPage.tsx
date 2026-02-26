import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { client } from '../api/client';
import type { Block, Slide } from '../api/types';
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
  const [renderJobId, setRenderJobId] = useState('');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [datasetName, setDatasetName] = useState('manual_dataset');
  const [csvFile, setCsvFile] = useState<File | null>(null);

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blocks', selectedSlideId] }),
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
    mutationFn: (type: Block['type']) => {
      return client.createBlock(selectedSlideId, { type, config: getDefaultConfig(type) });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['blocks', selectedSlideId] });
      setSelectedBlockId(created.id);
      buildPreviewMutation.mutate();
    },
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
    mutationFn: () => client.buildPreview(presentationId),
    onSuccess: (data) => setPreviewUrl(data.previewUrl),
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

  const previewSrc = previewUrl || `/api/v1/preview/${presentationId}`;

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
        <button onClick={() => buildPreviewMutation.mutate()}>Refresh Preview</button>
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
                <button onClick={() => createBlockMutation.mutate(newBlockType)}>Add block</button>
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
          <iframe title="preview" src={previewSrc} className="preview-frame" />
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
                type={blockType}
                config={blockConfig}
                datasets={datasetsQuery.data || []}
                onTypeChange={setBlockType}
                onConfigChange={setBlockConfig}
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
            <label>
              Manual dataset name
              <input value={datasetName} onChange={(e) => setDatasetName(e.target.value)} />
            </label>
            <button
              onClick={() =>
                client
                  .createDataset(presentationId, {
                    name: datasetName,
                    sourceType: 'manual_table',
                    columns: [
                      { key: 'name', label: 'name', type: 'string', nullable: false },
                      { key: 'value', label: 'value', type: 'number', nullable: true },
                    ],
                    rows: [
                      { name: 'A', value: 10 },
                      { name: 'B', value: 12 },
                    ],
                  })
                  .then(() => queryClient.invalidateQueries({ queryKey: ['datasets', presentationId] }))
              }
            >
              Create sample dataset
            </button>
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
    </div>
  );
}
