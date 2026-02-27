import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import type { ThemeTokens } from '../api/types';
import { useI18n } from '../shared/i18n/I18nProvider';
import { Button } from '../shared/ui/Button';
import { Field } from '../shared/ui/Field';
import { SectionCard } from '../shared/ui/SectionCard';
import './themes.css';

function defaultTokens(): ThemeTokens {
  return {
    color: {
      bgCanvas: '#ffffff',
      textPrimary: '#111111',
      accent: '#2563eb',
    },
    typography: {
      titleSize: 40,
      subtitleSize: 24,
      bodySize: 18,
      lineHeight: 1.4,
    },
    spacing: {
      slidePadding: 40,
      blockGap: 20,
      cardPadding: 16,
      radius: 12,
      borderWidth: 1,
    },
    chart: {
      palette: ['#2563eb', '#16a34a', '#f59e0b', '#ef4444'],
    },
    table: {
      headerBg: '#e2e8f0',
      headerText: '#0f172a',
    },
  };
}

export function ThemesPage() {
  const { locale, setLocale, t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [name, setName] = useState('Custom Theme');
  const [tokens, setTokens] = useState<ThemeTokens>(defaultTokens());
  const [selectedPresentationId, setSelectedPresentationId] = useState('');
  const [warnings, setWarnings] = useState<Array<{ path: string; message: string }>>([]);
  const [error, setError] = useState('');

  const themesQuery = useQuery({ queryKey: ['themes'], queryFn: client.listThemes });
  const presentationsQuery = useQuery({ queryKey: ['presentations'], queryFn: client.listPresentations });

  const selectedTheme = useMemo(
    () => (themesQuery.data || []).find((theme) => theme.id === selectedThemeId) || null,
    [selectedThemeId, themesQuery.data],
  );

  const refreshThemes = async () => {
    await queryClient.invalidateQueries({ queryKey: ['themes'] });
  };

  const createThemeMutation = useMutation({
    mutationFn: () => client.createTheme({ name: name.trim(), tokens }),
    onSuccess: async (created) => {
      setWarnings((created.warnings || []).map((w) => ({ path: w.path, message: w.message })));
      setSelectedThemeId(created.id);
      await refreshThemes();
      setError('');
    },
    onError: (e) => setError((e as Error).message),
  });

  const patchThemeMutation = useMutation({
    mutationFn: (themeId: string) => client.patchTheme(themeId, { name: name.trim(), tokens }),
    onSuccess: async (updated) => {
      setWarnings((updated.warnings || []).map((w) => ({ path: w.path, message: w.message })));
      await refreshThemes();
      setError('');
    },
    onError: (e) => setError((e as Error).message),
  });

  const duplicateThemeMutation = useMutation({
    mutationFn: (themeId: string) => client.duplicateTheme(themeId),
    onSuccess: async (duplicated) => {
      setSelectedThemeId(duplicated.id);
      await refreshThemes();
      setError('');
    },
    onError: (e) => setError((e as Error).message),
  });

  const deleteThemeMutation = useMutation({
    mutationFn: (themeId: string) => client.deleteTheme(themeId),
    onSuccess: async () => {
      setSelectedThemeId('');
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

  return (
    <div className="themes-page">
      <header className="themes-header">
        <div className="themes-header-row">
          <Button variant="ghost" onClick={() => navigate('/')}>
            {t('themes.backToList')}
          </Button>
          <h1>{t('themes.title')}</h1>
        </div>
        <Field label={t('lang.label')} className="lang-field">
          <select className="ui-select" value={locale} onChange={(e) => setLocale(e.target.value as 'ru' | 'en')}>
            <option value="ru">{t('lang.ru')}</option>
            <option value="en">{t('lang.en')}</option>
          </select>
        </Field>
      </header>

      <div className="themes-grid">
        <SectionCard title={t('themes.listTitle')}>
          <div className="themes-actions">
            <Button
              variant="primary"
              onClick={() => {
                setSelectedThemeId('');
                setName('Custom Theme');
                setTokens(defaultTokens());
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
                    setSelectedThemeId(theme.id);
                    setName(theme.name);
                    setTokens((theme.tokens as ThemeTokens) || defaultTokens());
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

        <SectionCard title={t('themes.editorTitle')}>
          <Field label={t('themes.themeName')}>
            <input className="ui-input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          <div className="token-grid">
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
            <Field label={t('themes.slidePadding')}>
              <input
                className="ui-input"
                type="number"
                value={tokens.spacing.slidePadding}
                onChange={(e) =>
                  setTokens((prev) => ({ ...prev, spacing: { ...prev.spacing, slidePadding: Number(e.target.value || 0) } }))
                }
              />
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
        </SectionCard>
      </div>
    </div>
  );
}
