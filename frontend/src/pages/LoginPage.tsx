import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/auth/AuthProvider';
import '../shared/auth/auth.css';
import { useI18n } from '../shared/i18n/I18nProvider';
import { Button } from '../shared/ui/Button';
import { Field } from '../shared/ui/Field';
import { SectionCard } from '../shared/ui/SectionCard';

export function LoginPage() {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const { user, ready, login } = useAuth();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const copy =
    locale === 'ru'
      ? {
          title: 'Вход в PrezGen',
          subtitle: 'Вставь выданный токен доступа. После входа ты увидишь только свои презентации, темы и экспорты.',
          token: 'Токен доступа',
          placeholder: 'Вставь токен',
          submit: 'Войти',
        }
      : {
          title: 'Sign in to PrezGen',
          subtitle: 'Paste your access token. After login you will only see your own presentations, themes, and exports.',
          token: 'Access token',
          placeholder: 'Paste token',
          submit: 'Sign in',
        };

  if (ready && user) return <Navigate to="/" replace />;

  return (
    <div className="auth-page">
      <SectionCard className="auth-card" title={copy.title}>
        <p>{copy.subtitle}</p>
        <Field label={copy.token}>
          <input className="ui-input" value={token} placeholder={copy.placeholder} onChange={(e) => setToken(e.target.value)} />
        </Field>
        <Button
          variant="primary"
          onClick={async () => {
            try {
              setError('');
              await login(token);
              navigate('/', { replace: true });
            } catch (e) {
              setError((e as Error).message || '');
            }
          }}
        >
          {copy.submit}
        </Button>
        {error && <p className="ui-error">{error}</p>}
      </SectionCard>
    </div>
  );
}
