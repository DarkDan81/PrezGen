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
      accentSecondary: '#39a8ff',
      success: '#37d67a',
      warn: '#ff626f',
      info: '#55b8ff',
    },
    typography: {
      titleSize: 64,
      subtitleSize: 30,
      bodySize: 28,
      lineHeight: 1.38,
      profile: 'technical',
      fontPreset: 'sans',
    },
    spacing: {
      radius: 8,
      borderWidth: 1,
    },
    chart: {
      palette: ['#39a8ff', '#ff7b1f', '#69bcff', '#ff9a4d'],
      mode: 'contrast',
      axisLabelSize: 22,
      dataLabelSize: 20,
      lineWidth: 8,
      pointRadius: 6,
    },
    table: {
      headerBg: '#152135',
      headerText: '#f2f7ff',
      mode: 'normal',
    },
    decor: {
      presetPack: 'balanced',
      intensity: 2,
      safeZoneAlpha: 0.08,
      titleMultiplier: 1.25,
      contentMultiplier: 1,
      gridEnabled: true,
      textGlowEnabled: true,
      cardShadowEnabled: true,
      tableShadowEnabled: true,
      chartShadowEnabled: true,
      imageShadowEnabled: true,
      logoEnabled: true,
      logoText: 'DARKDAN',
      logoImageUrl: '',
      serviceTag: 'SYSTEM v1.0',
      logoAnchor: 'top-right',
      logoSize: 14,
      logoOpacity: 0.95,
      badgeVariant: 'outlined',
      badgeOnTitle: true,
      badgeOnContent: true,
      shapeLeftLineEnabled: true,
      shapeLeftLineAnchor: 'left',
      shapeLeftLineSize: 1,
      shapeLeftLineOpacity: 1,
      shapeTriangleEnabled: true,
      shapeTriangleAnchor: 'bottom-right',
      shapeTriangleSize: 1,
      shapeTriangleOpacity: 1,
      shapeBlobEnabled: true,
      shapeBlobAnchor: 'top-right',
      shapeBlobSize: 1,
      shapeBlobOpacity: 1,
      shapeStyle: 'soft',
    },
  };
}

function normalizeTokens(input?: ThemeTokens): ThemeTokens {
  type DecorTokens = NonNullable<ThemeTokens['decor']>;
  const base = defaultTokens();
  const baseChart = base.chart || {};
  const next = input && typeof input === 'object' ? input : ({} as ThemeTokens);
  const baseDecor = (base.decor || {}) as DecorTokens;
  const nextDecor = ((next.decor && typeof next.decor === 'object') ? next.decor : {}) as DecorTokens;
  const normalizedDecor: ThemeTokens['decor'] = {
    presetPack: (nextDecor.presetPack as DecorTokens['presetPack']) || baseDecor.presetPack,
    intensity: typeof nextDecor.intensity === 'number' ? nextDecor.intensity : baseDecor.intensity,
    safeZoneAlpha: typeof nextDecor.safeZoneAlpha === 'number' ? nextDecor.safeZoneAlpha : baseDecor.safeZoneAlpha,
    titleMultiplier: typeof nextDecor.titleMultiplier === 'number' ? nextDecor.titleMultiplier : baseDecor.titleMultiplier,
    contentMultiplier: typeof nextDecor.contentMultiplier === 'number' ? nextDecor.contentMultiplier : baseDecor.contentMultiplier,
    gridEnabled: typeof nextDecor.gridEnabled === 'boolean' ? nextDecor.gridEnabled : baseDecor.gridEnabled,
    textGlowEnabled: typeof nextDecor.textGlowEnabled === 'boolean' ? nextDecor.textGlowEnabled : baseDecor.textGlowEnabled,
    cardShadowEnabled: typeof nextDecor.cardShadowEnabled === 'boolean' ? nextDecor.cardShadowEnabled : baseDecor.cardShadowEnabled,
    tableShadowEnabled: typeof nextDecor.tableShadowEnabled === 'boolean' ? nextDecor.tableShadowEnabled : baseDecor.tableShadowEnabled,
    chartShadowEnabled: typeof nextDecor.chartShadowEnabled === 'boolean' ? nextDecor.chartShadowEnabled : baseDecor.chartShadowEnabled,
    imageShadowEnabled: typeof nextDecor.imageShadowEnabled === 'boolean' ? nextDecor.imageShadowEnabled : baseDecor.imageShadowEnabled,
    logoEnabled: typeof nextDecor.logoEnabled === 'boolean' ? nextDecor.logoEnabled : baseDecor.logoEnabled,
    logoText: typeof nextDecor.logoText === 'string' ? nextDecor.logoText : baseDecor.logoText,
    logoImageUrl: typeof nextDecor.logoImageUrl === 'string' ? nextDecor.logoImageUrl : baseDecor.logoImageUrl,
    serviceTag: typeof nextDecor.serviceTag === 'string' ? nextDecor.serviceTag : baseDecor.serviceTag,
    logoAnchor: (nextDecor.logoAnchor as DecorTokens['logoAnchor']) || baseDecor.logoAnchor,
    logoSize: typeof nextDecor.logoSize === 'number' ? nextDecor.logoSize : baseDecor.logoSize,
    logoOpacity: typeof nextDecor.logoOpacity === 'number' ? nextDecor.logoOpacity : baseDecor.logoOpacity,
    badgeVariant: (nextDecor.badgeVariant as DecorTokens['badgeVariant']) || baseDecor.badgeVariant,
    badgeOnTitle: typeof nextDecor.badgeOnTitle === 'boolean' ? nextDecor.badgeOnTitle : baseDecor.badgeOnTitle,
    badgeOnContent: typeof nextDecor.badgeOnContent === 'boolean' ? nextDecor.badgeOnContent : baseDecor.badgeOnContent,
    shapeLeftLineEnabled: typeof nextDecor.shapeLeftLineEnabled === 'boolean'
      ? nextDecor.shapeLeftLineEnabled
      : baseDecor.shapeLeftLineEnabled,
    shapeLeftLineAnchor: (nextDecor.shapeLeftLineAnchor as DecorTokens['shapeLeftLineAnchor']) || baseDecor.shapeLeftLineAnchor,
    shapeLeftLineSize: typeof nextDecor.shapeLeftLineSize === 'number' ? nextDecor.shapeLeftLineSize : baseDecor.shapeLeftLineSize,
    shapeLeftLineOpacity: typeof nextDecor.shapeLeftLineOpacity === 'number'
      ? nextDecor.shapeLeftLineOpacity
      : baseDecor.shapeLeftLineOpacity,
    shapeTriangleEnabled: typeof nextDecor.shapeTriangleEnabled === 'boolean'
      ? nextDecor.shapeTriangleEnabled
      : baseDecor.shapeTriangleEnabled,
    shapeTriangleAnchor: (nextDecor.shapeTriangleAnchor as DecorTokens['shapeTriangleAnchor']) || baseDecor.shapeTriangleAnchor,
    shapeTriangleSize: typeof nextDecor.shapeTriangleSize === 'number' ? nextDecor.shapeTriangleSize : baseDecor.shapeTriangleSize,
    shapeTriangleOpacity: typeof nextDecor.shapeTriangleOpacity === 'number'
      ? nextDecor.shapeTriangleOpacity
      : baseDecor.shapeTriangleOpacity,
    shapeBlobEnabled: typeof nextDecor.shapeBlobEnabled === 'boolean' ? nextDecor.shapeBlobEnabled : baseDecor.shapeBlobEnabled,
    shapeBlobAnchor: (nextDecor.shapeBlobAnchor as DecorTokens['shapeBlobAnchor']) || baseDecor.shapeBlobAnchor,
    shapeBlobSize: typeof nextDecor.shapeBlobSize === 'number' ? nextDecor.shapeBlobSize : baseDecor.shapeBlobSize,
    shapeBlobOpacity: typeof nextDecor.shapeBlobOpacity === 'number' ? nextDecor.shapeBlobOpacity : baseDecor.shapeBlobOpacity,
    shapeStyle: (nextDecor.shapeStyle as DecorTokens['shapeStyle']) || baseDecor.shapeStyle,
  };

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
      fontPreset:
        typeof next.typography?.fontPreset === 'string'
          ? (next.typography.fontPreset as 'sans' | 'modern' | 'industrial')
          : base.typography.fontPreset,
    },
    spacing: {
      ...base.spacing,
      ...(next.spacing || {}),
    },
    chart: {
      ...base.chart,
      ...(next.chart || {}),
      axisLabelSize: typeof next.chart?.axisLabelSize === 'number' ? next.chart.axisLabelSize : baseChart.axisLabelSize,
      dataLabelSize: typeof next.chart?.dataLabelSize === 'number' ? next.chart.dataLabelSize : baseChart.dataLabelSize,
      lineWidth: typeof next.chart?.lineWidth === 'number' ? next.chart.lineWidth : baseChart.lineWidth,
      pointRadius: typeof next.chart?.pointRadius === 'number' ? next.chart.pointRadius : baseChart.pointRadius,
    },
    table: {
      ...base.table,
      ...(next.table || {}),
    },
    decor: normalizedDecor,
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

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function normalizeColorForPicker(value: string): string {
  const raw = String(value || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-fA-F]{8}$/.test(raw)) return `#${raw.slice(1, 7)}`;
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const [r, g, b] = raw.slice(1).split('');
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return '#000000';
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <Field label={label}>
      <div className="color-input-row">
        <input
          className="ui-color-picker"
          type="color"
          value={normalizeColorForPicker(value)}
          onChange={(e) => onChange(e.target.value)}
        />
        <input className="ui-input" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  );
}

function PreviewPane({ title, preview, isLoading, sceneId, paneClassName }: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const html = preview?.html || '';
  const sceneRef = useRef(sceneId);
  const scrollRetryRef = useRef<number | null>(null);
  sceneRef.current = sceneId;

  const clearRetry = () => {
    if (scrollRetryRef.current !== null) {
      window.clearTimeout(scrollRetryRef.current);
      scrollRetryRef.current = null;
    }
  };

  const scrollToScene = (attemptsLeft = 0) => {
    const frame = iframeRef.current;
    if (!frame) return;
    try {
      const sceneIndex = GOLDEN_SCENE_INDEX[sceneRef.current] ?? 0;
      const target = frame.contentWindow?.document.getElementById(`slide-${sceneIndex}`);
      if (target) {
        target.scrollIntoView({ block: 'start' });
        clearRetry();
        return;
      }
      if (attemptsLeft > 0) {
        clearRetry();
        scrollRetryRef.current = window.setTimeout(() => scrollToScene(attemptsLeft - 1), 70);
      }
    } catch {
      if (attemptsLeft > 0) {
        clearRetry();
        scrollRetryRef.current = window.setTimeout(() => scrollToScene(attemptsLeft - 1), 70);
      }
    }
  };

  useEffect(() => {
    if (!html || !sceneId) return;
    clearRetry();
    const timeout = window.setTimeout(() => scrollToScene(6), 80);
    return () => {
      window.clearTimeout(timeout);
      clearRetry();
    };
  }, [html, sceneId]);

  return (
    <div className={`themes-preview-pane ${paneClassName || ''}`.trim()}>
      <div className="themes-preview-pane-header">{title}</div>
      {isLoading ? (
        <div className="themes-preview-loading">Loading preview...</div>
      ) : (
        <div className="themes-preview-viewport">
          <div className="themes-preview-canvas">
            <iframe
              ref={iframeRef}
              className="themes-preview-iframe"
              srcDoc={html}
              title={title}
              onLoad={() => scrollToScene(8)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function ThemesPage() {
  const { locale, setLocale, t } = useI18n();
  const isRu = locale === 'ru';
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
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const logoImageInputRef = useRef<HTMLInputElement | null>(null);

  const themesQuery = useQuery({ queryKey: ['themes'], queryFn: client.listThemes });
  const presentationsQuery = useQuery({ queryKey: ['presentations'], queryFn: client.listPresentations });

  const selectedTheme = useMemo(
    () => (themesQuery.data || []).find((theme) => theme.id === selectedThemeId) || null,
    [selectedThemeId, themesQuery.data],
  );
  const systemThemes = useMemo(() => (themesQuery.data || []).filter((theme) => theme.isSystem), [themesQuery.data]);

  const loadThemeToEditor = (themeId: string) => {
    const theme = (themesQuery.data || []).find((item) => item.id === themeId);
    if (!theme) return;
    const normalized = normalizeTokens(theme.tokens as ThemeTokens);
    setSelectedThemeId(theme.id);
    setName(theme.name);
    setTokens(normalized);
    setBaselineTokens(normalized);
    setBaseThemeId(theme.baseThemeId || (theme.isSystem ? theme.id : 'theme-factory-blueprint'));
    setWarnings([]);
    setError('');
  };

  useEffect(() => {
    if (selectedThemeId) return;
    const first = themesQuery.data?.[0];
    if (first) {
      loadThemeToEditor(first.id);
    }
  }, [selectedThemeId, themesQuery.data]);

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

  const importThemeMutation = useMutation({
    mutationFn: (payload: { schemaVersion: number; theme: { name: string; tokens: ThemeTokens; baseThemeId?: string } }) =>
      client.importTheme(payload),
    onSuccess: async (created) => {
      setSelectedThemeId(created.id);
      setName(created.name);
      const next = normalizeTokens(created.tokens as ThemeTokens);
      setTokens(next);
      setBaselineTokens(next);
      setBaseThemeId(created.baseThemeId || 'theme-factory-blueprint');
      await refreshThemes();
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

  useEffect(() => {
    const onWheelCapture = (event: WheelEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.type !== 'number') return;
      if (document.activeElement === target) target.blur();
    };
    window.addEventListener('wheel', onWheelCapture, { capture: true, passive: true });
    return () => window.removeEventListener('wheel', onWheelCapture, true);
  }, []);

  const safeState = warnings.length === 0 ? t('themes.safeState') : t('themes.warnState');
  const withRange = (label: string, min: string | number, max: string | number) => `${label} (${min}-${max})`;
  const sceneLabels = {
    title: t('themes.sceneTitle'),
    content: t('themes.sceneContent'),
    table: t('themes.sceneTable'),
    chart: t('themes.sceneChart'),
    cards: t('themes.sceneCards'),
  };

  const handleExportTheme = async () => {
    if (!selectedThemeId) return;
    try {
      const data = await client.exportTheme(selectedThemeId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedTheme?.name || 'theme'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleImportThemeFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { schemaVersion: number; theme: { name: string; tokens: ThemeTokens; baseThemeId?: string } };
      if (!parsed?.theme?.tokens) throw new Error('Invalid theme file');
      await importThemeMutation.mutateAsync(parsed);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleLogoImageFile = async (file: File) => {
    try {
      const hasImageMime = file.type.startsWith('image/');
      const hasImageExt = /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name || '');
      const isImage = hasImageMime || (!file.type && hasImageExt);
      if (!isImage) {
        setError('Logo file must be an image');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError('Logo file is too large (max 20 MB)');
        return;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read logo file'));
        reader.readAsDataURL(file);
      });
      setTokens((prev) => ({
        ...prev,
        decor: {
          ...(prev.decor || {}),
          logoEnabled: true,
          logoImageUrl: dataUrl,
        },
      }));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="themes-page">
      <header className="themes-header">
        <div className="themes-header-row themes-header-row-main">
          <Button variant="ghost" onClick={() => navigate('/')}>
            {t('themes.backToList')}
          </Button>
          <h1>{t('themes.title')}</h1>
        </div>
        <div className="themes-header-row">
          <select
            className="ui-select themes-select-inline"
            value={selectedThemeId}
            aria-label={t('themes.listTitle')}
            onChange={(e) => loadThemeToEditor(e.target.value)}
          >
            {(themesQuery.data || []).map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name} {theme.isSystem ? `(${t('themes.system')})` : `(${t('themes.custom')})`}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
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
          <Button variant="secondary" onClick={() => importInputRef.current?.click()}>
            {t('themes.importTheme')}
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="themes-file-input-hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportThemeFile(file);
              e.currentTarget.value = '';
            }}
          />
          <select
            className="ui-select lang-select-inline"
            value={locale}
            aria-label={t('lang.label')}
            onChange={(e) => setLocale(e.target.value as 'ru' | 'en')}
          >
            <option value="ru">RU {t('lang.ru')}</option>
            <option value="en">EN {t('lang.en')}</option>
          </select>
        </div>
      </header>

      <div className="themes-grid">
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

              <details className="theme-accordion">
                <summary>{isRu ? 'Основные настройки (всегда на слайде)' : 'Core settings (always visible)'}</summary>
                <div className="token-grid token-grid-single">
                <div className="theme-token-group">
                  <h3>{t('themes.groupPalette')}</h3>
                <ColorField
                  label={t('themes.canvasBg')}
                  value={tokens.color.bgCanvas}
                  onChange={(value) => setTokens((prev) => ({ ...prev, color: { ...prev.color, bgCanvas: value } }))}
                />
                <ColorField
                  label={t('themes.primaryText')}
                  value={tokens.color.textPrimary}
                  onChange={(value) => setTokens((prev) => ({ ...prev, color: { ...prev.color, textPrimary: value } }))}
                />
                <ColorField
                  label={t('themes.accentColor')}
                  value={tokens.color.accent}
                  onChange={(value) => setTokens((prev) => ({ ...prev, color: { ...prev.color, accent: value } }))}
                />
                <ColorField
                  label={t('themes.accentSecondaryColor')}
                  value={tokens.color.accentSecondary || '#39a8ff'}
                  onChange={(value) => setTokens((prev) => ({ ...prev, color: { ...prev.color, accentSecondary: value } }))}
                />
                <ColorField
                  label={t('themes.successColor')}
                  value={tokens.color.success || '#37d67a'}
                  onChange={(value) => setTokens((prev) => ({ ...prev, color: { ...prev.color, success: value } }))}
                />
                <ColorField
                  label={t('themes.warnColor')}
                  value={tokens.color.warn || '#ff626f'}
                  onChange={(value) => setTokens((prev) => ({ ...prev, color: { ...prev.color, warn: value } }))}
                />
                <ColorField
                  label={t('themes.infoColor')}
                  value={tokens.color.info || '#55b8ff'}
                  onChange={(value) => setTokens((prev) => ({ ...prev, color: { ...prev.color, info: value } }))}
                />
                </div>
                <div className="theme-token-group">
                  <h3>{t('themes.groupTypographySurface')}</h3>
                <Field label={withRange(t('themes.titleSize'), 18, 96)}>
                  <input
                    className="ui-input"
                    type="number"
                    min={18}
                    max={96}
                    value={tokens.typography.titleSize}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, typography: { ...prev.typography, titleSize: Number(e.target.value || 0) } }))
                    }
                  />
                </Field>
                <Field label={withRange(t('themes.subtitleSize'), 12, 72)}>
                  <input
                    className="ui-input"
                    type="number"
                    min={12}
                    max={72}
                    value={tokens.typography.subtitleSize}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, typography: { ...prev.typography, subtitleSize: Number(e.target.value || 0) } }))
                    }
                  />
                </Field>
                <Field label={withRange(t('themes.bodySize'), 10, 48)}>
                  <input
                    className="ui-input"
                    type="number"
                    min={10}
                    max={48}
                    value={tokens.typography.bodySize}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, typography: { ...prev.typography, bodySize: Number(e.target.value || 0) } }))
                    }
                  />
                </Field>
                <Field label={withRange(t('themes.lineHeight'), 1, 2.2)}>
                  <input
                    className="ui-input"
                    type="number"
                    min={1}
                    max={2.2}
                    step={0.01}
                    value={tokens.typography.lineHeight}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, typography: { ...prev.typography, lineHeight: Number(e.target.value || 1) } }))
                    }
                  />
                </Field>
                <Field label={t('themes.typographyProfile')}>
                  <select
                    className="ui-select"
                    value={tokens.typography.profile || 'technical'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        typography: {
                          ...prev.typography,
                          profile: e.target.value as 'executive' | 'technical' | 'sales',
                        },
                      }))
                    }
                  >
                    <option value="executive">{t('themes.profileExecutive')}</option>
                    <option value="technical">{t('themes.profileTechnical')}</option>
                    <option value="sales">{t('themes.profileSales')}</option>
                  </select>
                </Field>
                <Field label={t('themes.fontPreset')}>
                  <select
                    className="ui-select"
                    value={tokens.typography.fontPreset || 'sans'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        typography: {
                          ...prev.typography,
                          fontPreset: e.target.value as 'sans' | 'modern' | 'industrial',
                        },
                      }))
                    }
                  >
                    <option value="sans">{t('themes.fontPresetSans')}</option>
                    <option value="modern">{t('themes.fontPresetModern')}</option>
                    <option value="industrial">{t('themes.fontPresetIndustrial')}</option>
                  </select>
                </Field>
                <Field label={withRange(t('themes.radius'), 0, 48)}>
                  <input
                    className="ui-input"
                    type="number"
                    min={0}
                    max={48}
                    value={tokens.spacing.radius}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, spacing: { ...prev.spacing, radius: Number(e.target.value || 0) } }))
                    }
                  />
                </Field>
                <Field label={withRange(t('themes.borderWidth'), 0, 12)}>
                  <input
                    className="ui-input"
                    type="number"
                    min={0}
                    max={12}
                    value={tokens.spacing.borderWidth}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, spacing: { ...prev.spacing, borderWidth: Number(e.target.value || 0) } }))
                    }
                  />
                </Field>
                </div>
                <div className="theme-token-group">
                  <h3>{t('themes.groupChart')}</h3>
                <ColorField
                  label={t('themes.chart1')}
                  value={tokens.chart?.palette?.[0] || '#39a8ff'}
                  onChange={(value) =>
                    setTokens((prev) => {
                      const palette = [...(prev.chart?.palette || ['#39a8ff', '#ff7b1f', '#69bcff', '#ff9a4d'])];
                      palette[0] = value;
                      return { ...prev, chart: { ...prev.chart, palette } };
                    })
                  }
                />
                <ColorField
                  label={t('themes.chart2')}
                  value={tokens.chart?.palette?.[1] || '#ff7b1f'}
                  onChange={(value) =>
                    setTokens((prev) => {
                      const palette = [...(prev.chart?.palette || ['#39a8ff', '#ff7b1f', '#69bcff', '#ff9a4d'])];
                      palette[1] = value;
                      return { ...prev, chart: { ...prev.chart, palette } };
                    })
                  }
                />
                <ColorField
                  label={t('themes.chart3')}
                  value={tokens.chart?.palette?.[2] || '#69bcff'}
                  onChange={(value) =>
                    setTokens((prev) => {
                      const palette = [...(prev.chart?.palette || ['#39a8ff', '#ff7b1f', '#69bcff', '#ff9a4d'])];
                      palette[2] = value;
                      return { ...prev, chart: { ...prev.chart, palette } };
                    })
                  }
                />
                <ColorField
                  label={t('themes.chart4')}
                  value={tokens.chart?.palette?.[3] || '#ff9a4d'}
                  onChange={(value) =>
                    setTokens((prev) => {
                      const palette = [...(prev.chart?.palette || ['#39a8ff', '#ff7b1f', '#69bcff', '#ff9a4d'])];
                      palette[3] = value;
                      return { ...prev, chart: { ...prev.chart, palette } };
                    })
                  }
                />
                <Field label={t('themes.chartMode')}>
                  <select
                    className="ui-select"
                    value={tokens.chart?.mode || 'contrast'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        chart: {
                          ...prev.chart,
                          mode: e.target.value as 'contrast' | 'minimal' | 'dashboard',
                        },
                      }))
                    }
                  >
                    <option value="contrast">{t('themes.chartModeContrast')}</option>
                    <option value="minimal">{t('themes.chartModeMinimal')}</option>
                    <option value="dashboard">{t('themes.chartModeDashboard')}</option>
                  </select>
                </Field>
                <Field label={withRange(t('themes.chartAxisLabelSize'), 12, 32)}>
                  <input
                    className="ui-input"
                    type="number"
                    min={12}
                    max={32}
                    value={typeof tokens.chart?.axisLabelSize === 'number' ? tokens.chart.axisLabelSize : 22}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        chart: { ...prev.chart, axisLabelSize: Number(e.target.value || 22) },
                      }))
                    }
                  />
                </Field>
                <Field label={withRange(t('themes.chartDataLabelSize'), 12, 32)}>
                  <input
                    className="ui-input"
                    type="number"
                    min={12}
                    max={32}
                    value={typeof tokens.chart?.dataLabelSize === 'number' ? tokens.chart.dataLabelSize : 20}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        chart: { ...prev.chart, dataLabelSize: Number(e.target.value || 20) },
                      }))
                    }
                  />
                </Field>
                <Field label={withRange(t('themes.chartLineWidth'), 1, 16)}>
                  <input
                    className="ui-input"
                    type="number"
                    min={1}
                    max={16}
                    step={0.5}
                    value={typeof tokens.chart?.lineWidth === 'number' ? tokens.chart.lineWidth : 8}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        chart: { ...prev.chart, lineWidth: Number(e.target.value || 8) },
                      }))
                    }
                  />
                </Field>
                <Field label={withRange(t('themes.chartPointRadius'), 0, 16)}>
                  <input
                    className="ui-input"
                    type="number"
                    min={0}
                    max={16}
                    step={0.5}
                    value={typeof tokens.chart?.pointRadius === 'number' ? tokens.chart.pointRadius : 6}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        chart: { ...prev.chart, pointRadius: Number(e.target.value || 6) },
                      }))
                    }
                  />
                </Field>
                </div>
                <div className="theme-token-group">
                  <h3>{t('themes.groupTable')}</h3>
                <ColorField
                  label={t('themes.tableHeaderBg')}
                  value={tokens.table?.headerBg ? String(tokens.table.headerBg) : '#152135'}
                  onChange={(value) => setTokens((prev) => ({ ...prev, table: { ...prev.table, headerBg: value } }))}
                />
                <ColorField
                  label={t('themes.tableHeaderText')}
                  value={tokens.table?.headerText ? String(tokens.table.headerText) : '#f2f7ff'}
                  onChange={(value) => setTokens((prev) => ({ ...prev, table: { ...prev.table, headerText: value } }))}
                />
                <Field label={t('themes.tableMode')}>
                  <select
                    className="ui-select"
                    value={tokens.table?.mode || 'normal'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        table: {
                          ...prev.table,
                          mode: e.target.value as 'dense' | 'normal' | 'boardroom',
                        },
                      }))
                    }
                  >
                    <option value="dense">{t('themes.tableModeDense')}</option>
                    <option value="normal">{t('themes.tableModeNormal')}</option>
                    <option value="boardroom">{t('themes.tableModeBoardroom')}</option>
                  </select>
                </Field>
                </div>
                </div>
              </details>

              <details className="theme-accordion">
                <summary>{isRu ? 'Опциональный декор (можно отключать)' : 'Optional decor (toggleable)'}</summary>
                <div className="token-grid token-grid-single">
                <div className="theme-token-group">
                  <h3>{t('themes.groupDecorCore')}</h3>
                <Field label={t('themes.presetPack')}>
                  <select
                    className="ui-select"
                    value={tokens.decor?.presetPack || 'balanced'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: {
                          ...(prev.decor || {}),
                          presetPack: e.target.value as 'compact' | 'balanced' | 'bold',
                        },
                      }))
                    }
                  >
                    <option value="compact">{t('themes.packCompact')}</option>
                    <option value="balanced">{t('themes.packBalanced')}</option>
                    <option value="bold">{t('themes.packBold')}</option>
                  </select>
                </Field>
                <Field label={withRange(t('themes.decorIntensity'), 1, 3)}>
                  <input
                    className="ui-input"
                    type="number"
                    min={1}
                    max={3}
                    step={0.1}
                    value={typeof tokens.decor?.intensity === 'number' ? tokens.decor.intensity : 2}
                    onChange={(e) =>
                      setTokens((prev) => {
                        return {
                          ...prev,
                          decor: { ...(prev.decor || {}), intensity: Number(e.target.value || 2) },
                        };
                      })
                    }
                  />
                </Field>
                <Field label={withRange(t('themes.safeZoneAlpha'), 0, 0.35)}>
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
                <Field label={withRange(t('themes.titleDecorBoost'), 0.8, 2)}>
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
                <Field label={withRange(t('themes.contentDecorBoost'), 0.6, 1.6)}>
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
                <Field label={t('themes.shapeStyle')}>
                  <select
                    className="ui-select"
                    value={tokens.decor?.shapeStyle || 'soft'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: {
                          ...(prev.decor || {}),
                          shapeStyle: e.target.value as 'soft' | 'crisp' | 'glow',
                        },
                      }))
                    }
                  >
                    <option value="soft">{t('themes.shapeStyleSoft')}</option>
                    <option value="crisp">{t('themes.shapeStyleCrisp')}</option>
                    <option value="glow">{t('themes.shapeStyleGlow')}</option>
                  </select>
                </Field>
                </div>
                <div className="theme-token-group">
                  <h3>{t('themes.groupGridEffects')}</h3>
                  <Field label={t('themes.gridEnabled')}>
                    <select
                      className="ui-select"
                      value={tokens.decor?.gridEnabled === false ? '0' : '1'}
                      onChange={(e) =>
                        setTokens((prev) => ({
                          ...prev,
                          decor: { ...(prev.decor || {}), gridEnabled: e.target.value === '1' },
                        }))
                      }
                    >
                      <option value="1">{t('themes.yes')}</option>
                      <option value="0">{t('themes.no')}</option>
                    </select>
                  </Field>
                  <Field label={t('themes.textGlowEnabled')}>
                    <select
                      className="ui-select"
                      value={tokens.decor?.textGlowEnabled === false ? '0' : '1'}
                      onChange={(e) =>
                        setTokens((prev) => ({
                          ...prev,
                          decor: { ...(prev.decor || {}), textGlowEnabled: e.target.value === '1' },
                        }))
                      }
                    >
                      <option value="1">{t('themes.yes')}</option>
                      <option value="0">{t('themes.no')}</option>
                    </select>
                  </Field>
                  <Field label={t('themes.cardShadowEnabled')}>
                    <select
                      className="ui-select"
                      value={tokens.decor?.cardShadowEnabled === false ? '0' : '1'}
                      onChange={(e) =>
                        setTokens((prev) => ({
                          ...prev,
                          decor: { ...(prev.decor || {}), cardShadowEnabled: e.target.value === '1' },
                        }))
                      }
                    >
                      <option value="1">{t('themes.yes')}</option>
                      <option value="0">{t('themes.no')}</option>
                    </select>
                  </Field>
                  <Field label={t('themes.tableShadowEnabled')}>
                    <select
                      className="ui-select"
                      value={tokens.decor?.tableShadowEnabled === false ? '0' : '1'}
                      onChange={(e) =>
                        setTokens((prev) => ({
                          ...prev,
                          decor: { ...(prev.decor || {}), tableShadowEnabled: e.target.value === '1' },
                        }))
                      }
                    >
                      <option value="1">{t('themes.yes')}</option>
                      <option value="0">{t('themes.no')}</option>
                    </select>
                  </Field>
                  <Field label={t('themes.chartShadowEnabled')}>
                    <select
                      className="ui-select"
                      value={tokens.decor?.chartShadowEnabled === false ? '0' : '1'}
                      onChange={(e) =>
                        setTokens((prev) => ({
                          ...prev,
                          decor: { ...(prev.decor || {}), chartShadowEnabled: e.target.value === '1' },
                        }))
                      }
                    >
                      <option value="1">{t('themes.yes')}</option>
                      <option value="0">{t('themes.no')}</option>
                    </select>
                  </Field>
                  <Field label={t('themes.imageShadowEnabled')}>
                    <select
                      className="ui-select"
                      value={tokens.decor?.imageShadowEnabled === false ? '0' : '1'}
                      onChange={(e) =>
                        setTokens((prev) => ({
                          ...prev,
                          decor: { ...(prev.decor || {}), imageShadowEnabled: e.target.value === '1' },
                        }))
                      }
                    >
                      <option value="1">{t('themes.yes')}</option>
                      <option value="0">{t('themes.no')}</option>
                    </select>
                  </Field>
                </div>
                <div className="theme-token-group">
                  <h3>{t('themes.groupBadgeLogo')}</h3>
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
                <Field label={t('themes.logoImageUrl')}>
                  <input
                    className="ui-input"
                    placeholder="https://... or data:image/..."
                    value={tokens.decor?.logoImageUrl ? String(tokens.decor.logoImageUrl) : ''}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), logoImageUrl: e.target.value },
                      }))
                    }
                  />
                </Field>
                <div className="themes-actions">
                  <Button size="small" variant="secondary" onClick={() => logoImageInputRef.current?.click()}>
                    {t('themes.uploadLogoImage')}
                  </Button>
                  <Button
                    size="small"
                    variant="ghost"
                    onClick={() =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), logoImageUrl: '' },
                      }))
                    }
                  >
                    {t('themes.clearLogoImage')}
                  </Button>
                  <input
                    ref={logoImageInputRef}
                    type="file"
                    accept="image/*"
                    className="themes-file-input-hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleLogoImageFile(file);
                      e.currentTarget.value = '';
                    }}
                  />
                </div>
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
                <Field label={withRange(t('themes.logoSize'), 10, 36)}>
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
                <Field label={withRange(t('themes.logoOpacity'), 0.2, 1)}>
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
                <Field label={t('themes.badgeVariant')}>
                  <select
                    className="ui-select"
                    value={tokens.decor?.badgeVariant ? String(tokens.decor.badgeVariant) : 'outlined'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: {
                          ...(prev.decor || {}),
                          badgeVariant: e.target.value as 'minimal' | 'outlined' | 'signal',
                        },
                      }))
                    }
                  >
                    <option value="minimal">{t('themes.badgeMinimal')}</option>
                    <option value="outlined">{t('themes.badgeOutlined')}</option>
                    <option value="signal">{t('themes.badgeSignal')}</option>
                  </select>
                </Field>
                <Field label={t('themes.badgeOnTitle')}>
                  <select
                    className="ui-select"
                    value={tokens.decor?.badgeOnTitle === false ? '0' : '1'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), badgeOnTitle: e.target.value === '1' },
                      }))
                    }
                  >
                    <option value="1">{t('themes.yes')}</option>
                    <option value="0">{t('themes.no')}</option>
                  </select>
                </Field>
                <Field label={t('themes.badgeOnContent')}>
                  <select
                    className="ui-select"
                    value={tokens.decor?.badgeOnContent === false ? '0' : '1'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), badgeOnContent: e.target.value === '1' },
                      }))
                    }
                  >
                    <option value="1">{t('themes.yes')}</option>
                    <option value="0">{t('themes.no')}</option>
                  </select>
                </Field>
                </div>
                <div className="theme-token-group">
                  <h3>{t('themes.shapeLeftLine')}</h3>
                <Field label={t('themes.shapeLeftLineEnabled')}>
                  <select
                    className="ui-select"
                    value={tokens.decor?.shapeLeftLineEnabled === false ? '0' : '1'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), shapeLeftLineEnabled: e.target.value === '1' },
                      }))
                    }
                  >
                    <option value="1">{t('themes.yes')}</option>
                    <option value="0">{t('themes.no')}</option>
                  </select>
                </Field>
                <Field label={t('themes.shapeLeftLineAnchor')}>
                  <select
                    className="ui-select"
                    value={tokens.decor?.shapeLeftLineAnchor || 'left'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), shapeLeftLineAnchor: e.target.value as 'left' | 'right' },
                      }))
                    }
                  >
                    <option value="left">{t('themes.anchorLeft')}</option>
                    <option value="right">{t('themes.anchorRight')}</option>
                  </select>
                </Field>
                <Field label={withRange(t('themes.shapeLeftLineSize'), 0.4, 1.8)}>
                  <input
                    className="ui-input"
                    type="number"
                    min={0.4}
                    max={1.8}
                    step={0.05}
                    value={typeof tokens.decor?.shapeLeftLineSize === 'number' ? tokens.decor.shapeLeftLineSize : 1}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), shapeLeftLineSize: Number(e.target.value || 1) },
                      }))
                    }
                  />
                </Field>
                <Field label={withRange(t('themes.shapeLeftLineOpacity'), 0, 1)}>
                  <input
                    className="ui-input"
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={typeof tokens.decor?.shapeLeftLineOpacity === 'number' ? tokens.decor.shapeLeftLineOpacity : 1}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), shapeLeftLineOpacity: Number(e.target.value || 1) },
                      }))
                    }
                  />
                </Field>
                </div>

                <div className="theme-token-group">
                  <h3>{t('themes.shapeTriangle')}</h3>
                <Field label={t('themes.shapeTriangleEnabled')}>
                  <select
                    className="ui-select"
                    value={tokens.decor?.shapeTriangleEnabled === false ? '0' : '1'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), shapeTriangleEnabled: e.target.value === '1' },
                      }))
                    }
                  >
                    <option value="1">{t('themes.yes')}</option>
                    <option value="0">{t('themes.no')}</option>
                  </select>
                </Field>
                <Field label={t('themes.shapeTriangleAnchor')}>
                  <select
                    className="ui-select"
                    value={tokens.decor?.shapeTriangleAnchor || 'bottom-right'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: {
                          ...(prev.decor || {}),
                          shapeTriangleAnchor: e.target.value as 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left',
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
                <Field label={withRange(t('themes.shapeTriangleSize'), 0.4, 1.8)}>
                  <input
                    className="ui-input"
                    type="number"
                    min={0.4}
                    max={1.8}
                    step={0.05}
                    value={typeof tokens.decor?.shapeTriangleSize === 'number' ? tokens.decor.shapeTriangleSize : 1}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), shapeTriangleSize: Number(e.target.value || 1) },
                      }))
                    }
                  />
                </Field>
                <Field label={withRange(t('themes.shapeTriangleOpacity'), 0, 1)}>
                  <input
                    className="ui-input"
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={typeof tokens.decor?.shapeTriangleOpacity === 'number' ? tokens.decor.shapeTriangleOpacity : 1}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), shapeTriangleOpacity: Number(e.target.value || 1) },
                      }))
                    }
                  />
                </Field>
                </div>

                <div className="theme-token-group">
                  <h3>{t('themes.shapeBlob')}</h3>
                <Field label={t('themes.shapeBlobEnabled')}>
                  <select
                    className="ui-select"
                    value={tokens.decor?.shapeBlobEnabled === false ? '0' : '1'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), shapeBlobEnabled: e.target.value === '1' },
                      }))
                    }
                  >
                    <option value="1">{t('themes.yes')}</option>
                    <option value="0">{t('themes.no')}</option>
                  </select>
                </Field>
                <Field label={t('themes.shapeBlobAnchor')}>
                  <select
                    className="ui-select"
                    value={tokens.decor?.shapeBlobAnchor || 'top-right'}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: {
                          ...(prev.decor || {}),
                          shapeBlobAnchor: e.target.value as 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left',
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
                <Field label={withRange(t('themes.shapeBlobSize'), 0.4, 1.8)}>
                  <input
                    className="ui-input"
                    type="number"
                    min={0.4}
                    max={1.8}
                    step={0.05}
                    value={typeof tokens.decor?.shapeBlobSize === 'number' ? tokens.decor.shapeBlobSize : 1}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), shapeBlobSize: Number(e.target.value || 1) },
                      }))
                    }
                  />
                </Field>
                <Field label={withRange(t('themes.shapeBlobOpacity'), 0, 1)}>
                  <input
                    className="ui-input"
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={typeof tokens.decor?.shapeBlobOpacity === 'number' ? tokens.decor.shapeBlobOpacity : 1}
                    onChange={(e) =>
                      setTokens((prev) => ({
                        ...prev,
                        decor: { ...(prev.decor || {}), shapeBlobOpacity: Number(e.target.value || 1) },
                      }))
                    }
                  />
                </Field>
                </div>
                </div>
              </details>

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
                {selectedThemeId ? (
                  <Button variant="secondary" onClick={handleExportTheme}>
                    {t('themes.exportTheme')}
                  </Button>
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
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => setCompareMode((prev) => !prev)}
                >
                  {compareMode ? t('themes.previewAfter') : t('themes.compareMode')}
                </Button>
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

              <div className={`themes-preview-stack ${compareMode ? 'is-row' : 'is-single'}`.trim()}>
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
