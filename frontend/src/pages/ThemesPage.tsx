import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import type { ThemePreviewResponse, ThemeTokens } from '../api/types';
import { useI18n } from '../shared/i18n/I18nProvider';
import { Button } from '../shared/ui/Button';
import { Field } from '../shared/ui/Field';
import { SectionCard } from '../shared/ui/SectionCard';
import './themes.css';

const GOLDEN_SCENE_INDEX: Record<string, number> = {
  title: 0,
  content: 1,
  table: 2,
  chart: 3,
  cards: 4,
};

function defaultTokens(): ThemeTokens {
  return {
    color: {
      bgCanvas: '#05080d',
      textPrimary: '#e7edf6',
      accent: '#ff7b1f',
    },
    typography: {
      titleSize: 64,
      subtitleSize: 30,
      bodySize: 28,
      lineHeight: 1.38,
    },
    spacing: {
      radius: 8,
      borderWidth: 1,
    },
    chart: {
      palette: ['#39a8ff', '#ff7b1f', '#69bcff', '#ff9a4d'],
    },
    table: {
      headerBg: '#152135',
      headerText: '#f2f7ff',
    },
    decor: {
      intensity: 2,
      safeZoneAlpha: 0.08,
      titleMultiplier: 1.25,
      contentMultiplier: 1,
      logoEnabled: true,
      logoText: 'DARKDAN',
      logoAnchor: 'top-right',
      logoSize: 14,
      logoOpacity: 0.95,
      shapePreset: 'both',
    },
  };
}

function normalizeTokens(input?: ThemeTokens): ThemeTokens {
  const base = defaultTokens();
  const next = input && typeof input === 'object' ? input : ({} as ThemeTokens);
  return {
    ...base,
    ...next,
    color: {
      ...base.color,
      ...(next.color || {}),
    },
    typography: {
      ...base.typography,
      ...(next.typography || {}),
    },
    spacing: {
      ...base.spacing,
      ...(next.spacing || {}),
    },
    chart: {
      ...base.chart,
      ...(next.chart || {}),
    },
    table: {
      ...base.table,
      ...(next.table || {}),
    },
    decor: {
      ...(base.decor || {}),
      ...((next.decor as ThemeTokens['decor']) || {}),
    },
  };
}

function sceneTitle(
  sceneId: string,
  labels: {
    title: string;
    content: string;
    table: string;
    chart: string;
    cards: string;
  },
) {
  if (sceneId === 'title') return labels.title;
  if (sceneId === 'content') return labels.content;
  if (sceneId === 'table') return labels.table;
  if (sceneId === 'chart') return labels.chart;
  if (sceneId === 'cards') return labels.cards;
  return sceneId;
}

type PreviewPaneProps = {
  title: string;
  preview: ThemePreviewResponse | null;
  isLoading: boolean;
  sceneId: string;
  paneClassName?: string;
};

function PreviewPane({ title, preview, isLoading, sceneId, paneClassName }: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const html = preview?.html || '';

  useEffect(() => {
    if (!html || !sceneId) return;
    const frame = iframeRef.current;
    if (!frame) return;
    const go = () => {
      try {
        const sceneIndex = GOLDEN_SCENE_INDEX[sceneId] ?? 0;
        const target = frame.contentWindow?.document.getElementById(`slide-${sceneIndex}`);
        if (target) target.scrollIntoView({ block: 'start' });
      } catch {
        // no-op
      }
    };
    const timeout = window.setTimeout(go, 80);
    return () => window.clearTimeout(timeout);
  }, [html, sceneId]);

  return (
    <div className={`themes-preview-pane ${paneClassName || ''}`.trim()}>
      <div className="themes-preview-pane-header">{title}</div>
      {isLoading ? (
        <div className="themes-preview-loading">Loading preview...</div>
      ) : (
        <iframe ref={iframeRef} className="themes-preview-iframe" srcDoc={html} title={title} />
      )}
    </div>
  );
}

export function ThemesPage() {
  const { locale, setLocale, t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [baseThemeId, setBaseThemeId] = useState('theme-factory-blueprint');
  const [name, setName] = useState('Custom Theme');
  const [tokens, setTokens] = useState<ThemeTokens>(defaultTokens());
  const [baselineTokens, setBaselineTokens] = useState<ThemeTokens>(defaultTokens());
  const [selectedPresentationId, setSelectedPresentationId] = useState('');
  const [warnings, setWarnings] = useState<Array<{ path: string; message: string }>>([]);
  const [error, setError] = useState('');
  const [selectedSceneId, setSelectedSceneId] = useState('title');
  const [compareMode, setCompareMode] = useState(true);

  const previewDebounceRef = useRef<number | null>(null);
  const [previewDraft, setPreviewDraft] = useState<ThemePreviewResponse | null>(null);
  const [previewBaseline, setPreviewBaseline] = useState<ThemePreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const themesQuery = useQuery({ queryKey: ['themes'], queryFn: client.listThemes });
  const presentationsQuery = useQuery({ queryKey: ['presentations'], queryFn: client.listPresentations });

  const selectedTheme = useMemo(
    () => (themesQuery.data || []).find((theme) => theme.id === selectedThemeId) || null,
    [selectedThemeId, themesQuery.data],
  );
  const systemThemes = useMemo(() => (themesQuery.data || []).filter((theme) => theme.isSystem), [themesQuery.data]);

  const refreshThemes = async () => {
    await queryClient.invalidateQueries({ queryKey: ['themes'] });
  };

  const createThemeMutation = useMutation({
    mutationFn: () => client.createTheme({ name: name.trim(), tokens, baseThemeId }),
    onSuccess: async (created) => {
      setWarnings((created.warnings || []).map((w) => ({ path: w.path, message: w.message })));
      setSelectedThemeId(created.id);
      setBaselineTokens(normalizeTokens(created.tokens as ThemeTokens));
      await refreshThemes();
      setError('');
    },
    onError: (e) => setError((e as Error).message),
  });

  const patchThemeMutation = useMutation({
    mutationFn: (themeId: string) => client.patchTheme(themeId, { name: name.trim(), tokens }),
    onSuccess: async (updated) => {
      setWarnings((updated.warnings || []).map((w) => ({ path: w.path, message: w.message })));
      setBaselineTokens(normalizeTokens(updated.tokens as ThemeTokens));
      await refreshThemes();
      setError('');
    },
    onError: (e) => setError((e as Error).message),
  });

  const duplicateThemeMutation = useMutation({
    mutationFn: (themeId: string) => client.duplicateTheme(themeId),
    onSuccess: async (duplicated) => {
      setSelectedThemeId(duplicated.id);
      setName(duplicated.name);
      const next = normalizeTokens(duplicated.tokens as ThemeTokens);
      setTokens(next);
      setBaselineTokens(next);
      setBaseThemeId(duplicated.baseThemeId || 'theme-factory-blueprint');
      await refreshThemes();
      setError('');
    },
    onError: (e) => setError((e as Error).message),
  });

  const deleteThemeMutation = useMutation({
    mutationFn: (themeId: string) => client.deleteTheme(themeId),
    onSuccess: async () => {
      setSelectedThemeId('');
      setName('Custom Theme');
      const base = defaultTokens();
      setTokens(base);
      setBaselineTokens(base);
      setBaseThemeId('theme-factory-blueprint');
      await refreshThemes();
      setError('');
    },
    onError: (e) => setError((e as Error).message),
  });

  const applyThemeMutation = useMutation({
    mutationFn: ({ presentationId, themeId }: { presentationId: string; themeId: string }) =>
      client.patchPresentation(presentationId, { themeId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['presentations'] });
      setError('');
    },
    onError: (e) => setError((e as Error).message),
  });

  useEffect(() => {
    if (previewDebounceRef.current) {
      window.clearTimeout(previewDebounceRef.current);
    }
    previewDebounceRef.current = window.setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const [draft, baseline] = await Promise.all([
          client.previewTheme({
            themeId: selectedThemeId || undefined,
            baseThemeId,
            tokens,
          }),
          client.previewTheme({
            themeId: selectedThemeId || undefined,
            baseThemeId,
            tokens: baselineTokens,
          }),
        ]);
        setPreviewDraft(draft);
        setPreviewBaseline(baseline);
        setWarnings((draft.warnings || []).map((w) => ({ path: w.path, message: w.message })));
        setError('');
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setPreviewLoading(false);
      }
    }, 220);

    return () => {
      if (previewDebounceRef.current) window.clearTimeout(previewDebounceRef.current);
    };
  }, [selectedThemeId, baseThemeId, tokens, baselineTokens]);

  const safeState = warnings.length === 0 ? t('themes.safeState') : t('themes.warnState');
  const sceneLabels = {
    title: t('themes.sceneTitle'),
    content: t('themes.sceneContent'),
    table: t('themes.sceneTable'),
    chart: t('themes.sceneChart'),
    cards: t('themes.sceneCards'),
  };

  return (
    <div className="themes-page">
      <header className="themes-header">
        <div className="themes-header-row">
          <Button variant="ghost" onClick={() => navigate('/')}>
            {t('themes.backToList')}
          </Button>
          <h1>{t('themes.title')}</h1>
        </div>
        <select
          className="ui-select lang-select-inline"
          value={locale}
          aria-label={t('lang.label')}
          onChange={(e) => setLocale(e.target.value as 'ru' | 'en')}
        >
          <option value="ru">RU {t('lang.ru')}</option>
          <option value="en">EN {t('lang.en')}</option>
        </select>
      </header>

      <div className="themes-grid">
        <SectionCard title={t('themes.listTitle')}>
          <div className="themes-actions">
            <Button
              variant="primary"
              onClick={() => {
                setSelectedThemeId('');
                setName('Custom Theme');
                setBaseThemeId('theme-factory-blueprint');
                const base = defaultTokens();
                setTokens(base);
                setBaselineTokens(base);
                setWarnings([]);
                setError('');
              }}
            >
              {t('themes.createFromScratch')}
            </Button>
          </div>

          <ul className="themes-list">
            {(themesQuery.data || []).map((theme) => (
              <li key={theme.id}>
                <Button
                  variant={selectedThemeId === theme.id ? 'primary' : 'ghost'}
                  className="theme-row"
                  onClick={() => {
                    const normalized = normalizeTokens(theme.tokens as ThemeTokens);
                    setSelectedThemeId(theme.id);
                    setName(theme.name);
                    setTokens(normalized);
                    setBaselineTokens(normalized);
                    setBaseThemeId(theme.baseThemeId || (theme.isSystem ? theme.id : 'theme-factory-blueprint'));
                    setWarnings([]);
                    setError('');
                  }}
                >
                  <span>{theme.name}</span>
                  <small>{theme.isSystem ? t('themes.system') : t('themes.custom')}</small>
                </Button>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title={t('themes.editorTitle')} className="themes-editor-card">
          <div className="themes-editor-grid">
            <div className="themes-editor-controls">
              <Field label={t('themes.themeName')}>
                <input className="ui-input" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>

              {!selectedTheme || !selectedTheme.isSystem ? (
                <Field label={t('themes.baseTheme')}>
                  <select className="ui-select" value={baseThemeId} onChange={(e) => setBaseThemeId(e.target.value)}>
                    {systemThemes.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              <div className="token-grid token-grid-single">
                <Field label={t('themes.canvasBg')}>
                  <input
                    className="ui-input"
                    value={tokens.color.bgCanvas}
                    onChange={(e) => setTokens((prev) => ({ ...prev, color: { ...prev.color, bgCanvas: e.target.value } }))}
                  />
                </Field>
                <Field label={t('themes.primaryText')}>
                  <input
                    className="ui-input"
                    value={tokens.color.textPrimary}
                    onChange={(e) => setTokens((prev) => ({ ...prev, color: { ...prev.color, textPrimary: e.target.value } }))}
                  />
                </Field>
                <Field label={t('themes.accentColor')}>
                  <input
                    className="ui-input"
                    value={tokens.color.accent}
                    onChange={(e) => setTokens((prev) => ({ ...prev, color: { ...prev.color, accent: e.target.value } }))}
                  />
                </Field>
                <Field label={t('themes.titleSize')}>
                  <input
                    className="ui-input"
                    type="number"
                    value={tokens.typography.titleSize}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, typography: { ...prev.typography, titleSize: Number(e.target.value || 0) } }))
                    }
                  />
                </Field>
                <Field label={t('themes.subtitleSize')}>
                  <input
                    className="ui-input"
                    type="number"
                    value={tokens.typography.subtitleSize}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, typography: { ...prev.typography, subtitleSize: Number(e.target.value || 0) } }))
                    }
                  />
                </Field>
                <Field label={t('themes.bodySize')}>
                  <input
                    className="ui-input"
                    type="number"
                    value={tokens.typography.bodySize}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, typography: { ...prev.typography, bodySize: Number(e.target.value || 0) } }))
                    }
                  />
                </Field>
                <Field label={t('themes.lineHeight')}>
                  <input
                    className="ui-input"
                    type="number"
                    step={0.01}
                    value={tokens.typography.lineHeight}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, typography: { ...prev.typography, lineHeight: Number(e.target.value || 1) } }))
                    }
                  />
                </Field>
                <Field label={t('themes.radius')}>
                  <input
                    className="ui-input"
                    type="number"
                    value={tokens.spacing.radius}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, spacing: { ...prev.spacing, radius: Number(e.target.value || 0) } }))
                    }
                  />
                </Field>
                <Field label={t('themes.borderWidth')}>
                  <input
                    className="ui-input"
                    type="number"
                    value={tokens.spacing.borderWidth}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, spacing: { ...prev.spacing, borderWidth: Number(e.target.value || 0) } }))
                    }
                  />
                </Field>
                <Field label={t('themes.chart1')}>
                  <input
                    className="ui-input"
                    value={tokens.chart?.palette?.[0] || ''}
                    onChange={(e) =>
                      setTokens((prev) => {
                        const palette = [...(prev.chart?.palette || ['#39a8ff', '#ff7b1f', '#69bcff', '#ff9a4d'])];
                        palette[0] = e.target.value;
                        return { ...prev, chart: { ...prev.chart, palette } };
                      })
                    }
                  />
                </Field>
                <Field label={t('themes.chart2')}>
                  <input
                    className="ui-input"
                    value={tokens.chart?.palette?.[1] || ''}
                    onChange={(e) =>
                      setTokens((prev) => {
                        const palette = [...(prev.chart?.palette || ['#39a8ff', '#ff7b1f', '#69bcff', '#ff9a4d'])];
                        palette[1] = e.target.value;
                        return { ...prev, chart: { ...prev.chart, palette } };
                      })
                    }
                  />
                </Field>
                <Field label={t('themes.chart3')}>
                  <input
                    className="ui-input"
                    value={tokens.chart?.palette?.[2] || ''}
                    onChange={(e) =>
                      setTokens((prev) => {
                        const palette = [...(prev.chart?.palette || ['#39a8ff', '#ff7b1f', '#69bcff', '#ff9a4d'])];
                        palette[2] = e.target.value;
                        return { ...prev, chart: { ...prev.chart, palette } };
                      })
                    }
                  />
                </Field>
                <Field label={t('themes.chart4')}>
                  <input
                    className="ui-input"
                    value={tokens.chart?.palette?.[3] || ''}
                    onChange={(e) =>
                      setTokens((prev) => {
                        const palette = [...(prev.chart?.palette || ['#39a8ff', '#ff7b1f', '#69bcff', '#ff9a4d'])];
                        palette[3] = e.target.value;
                        return { ...prev, chart: { ...prev.chart, palette } };
                      })
                    }
                  />
                </Field>
                <Field label={t('themes.tableHeaderBg')}>
                  <input
                    className="ui-input"
                    value={tokens.table?.headerBg ? String(tokens.table.headerBg) : ''}
                    onChange={(e) => setTokens((prev) => ({ ...prev, table: { ...prev.table, headerBg: e.target.value } }))}
                  />
                </Field>
                <Field label={t('themes.tableHeaderText')}>
                  <input
                    className="ui-input"
                    value={tokens.table?.headerText ? String(tokens.table.headerText) : ''}
                    onChange={(e) => setTokens((prev) => ({ ...prev, table: { ...prev.table, headerText: e.target.value } }))}
                  />
                </Field>
                <Field label={t('themes.decorIntensity')}>
                  <input
                    className="ui-input"
                    type="number"
                    min={1}
                    max={3}
                    step={0.1}
                    value={typeof tokens.decor?.intensity === 'number' ? tokens.decor.intensity : 2}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), intensity: Number(e.target.value || 2) },
                      }))
                    }
                  />
                </Field>
                <Field label={t('themes.safeZoneAlpha')}>
                  <input
                    className="ui-input"
                    type="number"
                    min={0}
                    max={0.35}
                    step={0.01}
                    value={typeof tokens.decor?.safeZoneAlpha === 'number' ? tokens.decor.safeZoneAlpha : 0.08}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), safeZoneAlpha: Number(e.target.value || 0) },
                      }))
                    }
                  />
                </Field>
                <Field label={t('themes.titleDecorBoost')}>
                  <input
                    className="ui-input"
                    type="number"
                    min={0.8}
                    max={2}
                    step={0.05}
                    value={typeof tokens.decor?.titleMultiplier === 'number' ? tokens.decor.titleMultiplier : 1.25}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), titleMultiplier: Number(e.target.value || 1) },
                      }))
                    }
                  />
                </Field>
                <Field label={t('themes.contentDecorBoost')}>
                  <input
                    className="ui-input"
                    type="number"
                    min={0.6}
                    max={1.6}
                    step={0.05}
                    value={typeof tokens.decor?.contentMultiplier === 'number' ? tokens.decor.contentMultiplier : 1}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), contentMultiplier: Number(e.target.value || 1) },
                      }))
                    }
                  />
                </Field>
                <Field label={t('themes.logoEnabled')}>
                  <select
                    className="ui-select"
                    value={tokens.decor?.logoEnabled === false ? '0' : '1'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), logoEnabled: e.target.value === '1' },
                      }))
                    }
                  >
                    <option value="1">{t('themes.yes')}</option>
                    <option value="0">{t('themes.no')}</option>
                  </select>
                </Field>
                <Field label={t('themes.logoText')}>
                  <input
                    className="ui-input"
                    value={tokens.decor?.logoText ? String(tokens.decor.logoText) : 'DARKDAN'}
                    onChange={(e) => setTokens((prev) => ({ ...prev, decor: { ...(prev.decor || {}), logoText: e.target.value } }))}
                  />
                </Field>
                <Field label={t('themes.logoAnchor')}>
                  <select
                    className="ui-select"
                    value={tokens.decor?.logoAnchor ? String(tokens.decor.logoAnchor) : 'top-right'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: {
                          ...(prev.decor || {}),
                          logoAnchor: e.target.value as 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left',
                        },
                      }))
                    }
                  >
                    <option value="top-right">{t('themes.anchorTopRight')}</option>
                    <option value="top-left">{t('themes.anchorTopLeft')}</option>
                    <option value="bottom-right">{t('themes.anchorBottomRight')}</option>
                    <option value="bottom-left">{t('themes.anchorBottomLeft')}</option>
                  </select>
                </Field>
                <Field label={t('themes.logoSize')}>
                  <input
                    className="ui-input"
                    type="number"
                    min={10}
                    max={36}
                    value={typeof tokens.decor?.logoSize === 'number' ? tokens.decor.logoSize : 14}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), logoSize: Number(e.target.value || 14) },
                      }))
                    }
                  />
                </Field>
                <Field label={t('themes.logoOpacity')}>
                  <input
                    className="ui-input"
                    type="number"
                    min={0.2}
                    max={1}
                    step={0.05}
                    value={typeof tokens.decor?.logoOpacity === 'number' ? tokens.decor.logoOpacity : 0.95}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), logoOpacity: Number(e.target.value || 0.95) },
                      }))
                    }
                  />
                </Field>
                <Field label={t('themes.shapePreset')}>
                  <select
                    className="ui-select"
                    value={tokens.decor?.shapePreset ? String(tokens.decor.shapePreset) : 'both'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: {
                          ...(prev.decor || {}),
                          shapePreset: e.target.value as 'none' | 'left-line' | 'triangle' | 'blob' | 'both',
                        },
                      }))
                    }
                  >
                    <option value="both">{t('themes.shapeBoth')}</option>
                    <option value="left-line">{t('themes.shapeLeftLine')}</option>
                    <option value="triangle">{t('themes.shapeTriangle')}</option>
                    <option value="blob">{t('themes.shapeBlob')}</option>
                    <option value="none">{t('themes.shapeNone')}</option>
                  </select>
                </Field>
              </div>

              <div className="themes-actions">
                {!selectedTheme || selectedTheme.isSystem ? (
                  <Button
                    variant="secondary"
                    disabled={!selectedTheme}
                    onClick={() => selectedTheme && duplicateThemeMutation.mutate(selectedTheme.id)}
                  >
                    {t('themes.duplicateSelected')}
                  </Button>
                ) : null}
                {!selectedTheme ? (
                  <Button variant="primary" onClick={() => createThemeMutation.mutate()}>
                    {t('themes.saveNewTheme')}
                  </Button>
                ) : !selectedTheme.isSystem ? (
                  <>
                    <Button variant="primary" onClick={() => patchThemeMutation.mutate(selectedTheme.id)}>
                      {t('themes.saveChanges')}
                    </Button>
                    <Button variant="danger" onClick={() => deleteThemeMutation.mutate(selectedTheme.id)}>
                      {t('themes.deleteTheme')}
                    </Button>
                  </>
                ) : null}
              </div>

              <Field label={t('themes.applyToPresentation')}>
                <div className="apply-row">
                  <select
                    className="ui-select"
                    value={selectedPresentationId}
                    onChange={(e) => setSelectedPresentationId(e.target.value)}
                  >
                    <option value="">{t('themes.selectPresentation')}</option>
                    {(presentationsQuery.data || []).map((presentation) => (
                      <option key={presentation.id} value={presentation.id}>
                        {presentation.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    disabled={!selectedPresentationId || !selectedThemeId}
                    onClick={() => applyThemeMutation.mutate({ presentationId: selectedPresentationId, themeId: selectedThemeId })}
                  >
                    {t('themes.apply')}
                  </Button>
                </div>
              </Field>

              {warnings.length > 0 && (
                <div className="warnings-box">
                  <strong>{t('themes.warnings')}</strong>
                  <ul>
                    {warnings.map((warning, index) => (
                      <li key={`${warning.path}-${index}`}>
                        {warning.path}: {warning.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {error && <p className="ui-error">{error}</p>}
            </div>

            <div className="themes-preview-panel">
              <div className="themes-preview-toolbar">
                <span className={`themes-safe-badge ${warnings.length ? 'is-warning' : 'is-safe'}`}>{safeState}</span>
                <label className="themes-compare-toggle">
                  <input
                    type="checkbox"
                    checked={compareMode}
                    onChange={(e) => setCompareMode(e.target.checked)}
                  />
                  <span>{t('themes.compareMode')}</span>
                </label>
              </div>

              <div className="themes-scenes">
                {(previewDraft?.sceneIds || ['title', 'content', 'table', 'chart', 'cards']).map((sceneId) => (
                  <Button
                    key={sceneId}
                    size="small"
                    variant={selectedSceneId === sceneId ? 'primary' : 'ghost'}
                    onClick={() => setSelectedSceneId(sceneId)}
                  >
                    {sceneTitle(sceneId, sceneLabels)}
                  </Button>
                ))}
              </div>

              <div className={`themes-preview-stack ${compareMode ? 'is-compare' : ''}`.trim()}>
                {compareMode ? (
                  <>
                    <PreviewPane
                      title={t('themes.previewBefore')}
                      preview={previewBaseline}
                      isLoading={previewLoading}
                      sceneId={selectedSceneId}
                    />
                    <PreviewPane
                      title={t('themes.previewAfter')}
                      preview={previewDraft}
                      isLoading={previewLoading}
                      sceneId={selectedSceneId}
                    />
                  </>
                ) : (
                  <PreviewPane
                    title={t('themes.previewAfter')}
                    preview={previewDraft}
                    isLoading={previewLoading}
                    sceneId={selectedSceneId}
                    paneClassName="is-single"
                  />
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
