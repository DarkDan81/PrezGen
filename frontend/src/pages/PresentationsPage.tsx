import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useI18n } from '../shared/i18n/I18nProvider';
import { Button } from '../shared/ui/Button';
import { Field } from '../shared/ui/Field';
import { SectionCard } from '../shared/ui/SectionCard';
import './presentations.css';

export function PresentationsPage() {
  const { locale, setLocale, t } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState(t('presentations.newName'));
  const [themeId, setThemeId] = useState('theme-eurofoods');
  const [error, setError] = useState('');

  const themesQuery = useQuery({ queryKey: ['themes'], queryFn: client.listThemes });
  const presentationsQuery = useQuery({ queryKey: ['presentations'], queryFn: client.listPresentations });

  const createMutation = useMutation({
    mutationFn: client.createPresentation,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['presentations'] });
      navigate(`/presentations/${created.id}`);
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <div className="page">
      <header className="page-header">
        <h1>{t('app.title')}</h1>
        <div className="page-header-actions">
          <Button variant="secondary" onClick={() => navigate('/themes')}>
            {t('nav.themes')}
          </Button>
          <Field label={t('lang.label')} className="lang-field">
            <select className="ui-select" value={locale} onChange={(e) => setLocale(e.target.value as 'ru' | 'en')}>
              <option value="ru">{t('lang.ru')}</option>
              <option value="en">{t('lang.en')}</option>
            </select>
          </Field>
        </div>
      </header>

      <SectionCard className="presentations-card" title={t('presentations.createTitle')}>
        <div className="grid-row">
          <Field label={t('presentations.name')}>
            <input className="ui-input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t('presentations.theme')}>
            <select className="ui-select" value={themeId} onChange={(e) => setThemeId(e.target.value)}>
              {(themesQuery.data || []).map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </Field>
          <Button
            variant="primary"
            onClick={() => {
              setError('');
              createMutation.mutate({ name, themeId });
            }}
          >
            {t('common.create')}
          </Button>
        </div>
        {error && <p className="ui-error">{error}</p>}
      </SectionCard>

      <SectionCard className="presentations-card" title={t('presentations.listTitle')}>
        <ul className="presentations-list">
          {(presentationsQuery.data || []).map((presentation) => (
            <li key={presentation.id}>
              <Button
                variant="ghost"
                className="presentation-list-button"
                onClick={() => navigate(`/presentations/${presentation.id}`)}
              >
                <span>{presentation.name}</span> <small>({presentation.status})</small>
              </Button>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
