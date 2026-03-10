import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { AccountToolbar } from '../shared/auth/AccountToolbar';
import { useAuth } from '../shared/auth/AuthProvider';
import '../shared/auth/auth.css';
import { useI18n } from '../shared/i18n/I18nProvider';
import { Button } from '../shared/ui/Button';
import { Field } from '../shared/ui/Field';
import { SectionCard } from '../shared/ui/SectionCard';

export function AdminUsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { locale } = useI18n();
  const [login, setLogin] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [lastIssuedToken, setLastIssuedToken] = useState('');
  const [error, setError] = useState('');

  const copy =
    locale === 'ru'
      ? {
          title: 'Пользователи',
          back: 'К презентациям',
          createTitle: 'Создать пользователя',
          login: 'Логин',
          name: 'Имя',
          role: 'Роль',
          user: 'Пользователь',
          admin: 'Админ',
          create: 'Создать',
          resetToken: 'Сбросить токен',
          disable: 'Отключить',
          enable: 'Включить',
          quotas: 'Лимиты',
          tokenTitle: 'Последний выданный токен',
          empty: 'Пользователей пока нет.',
        }
      : {
          title: 'Users',
          back: 'Back to Presentations',
          createTitle: 'Create User',
          login: 'Login',
          name: 'Name',
          role: 'Role',
          user: 'User',
          admin: 'Admin',
          create: 'Create',
          resetToken: 'Reset Token',
          disable: 'Disable',
          enable: 'Enable',
          quotas: 'Quotas',
          tokenTitle: 'Last issued token',
          empty: 'No users yet.',
        };

  const usersQuery = useQuery({ queryKey: ['admin-users'], queryFn: client.listUsers, enabled: user?.role === 'admin' });

  const refreshUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const createUserMutation = useMutation({
    mutationFn: client.createUser,
    onSuccess: async (payload) => {
      setLogin('');
      setName('');
      setRole('user');
      setLastIssuedToken(payload.token);
      setError('');
      await refreshUsers();
    },
    onError: (e) => setError((e as Error).message),
  });

  const patchUserMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) => client.patchUser(userId, { isActive }),
    onSuccess: async () => {
      setError('');
      await refreshUsers();
    },
    onError: (e) => setError((e as Error).message),
  });

  const resetTokenMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) => client.resetUserToken(userId),
    onSuccess: async (payload) => {
      setLastIssuedToken(payload.token);
      setError('');
      await refreshUsers();
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>{copy.title}</h1>
        <div className="admin-header-actions">
          <Button variant="secondary" onClick={() => navigate('/')}>
            {copy.back}
          </Button>
          <AccountToolbar compact />
        </div>
      </header>

      <SectionCard title={copy.createTitle}>
        <div className="admin-create-grid">
          <Field label={copy.login}>
            <input className="ui-input" value={login} onChange={(e) => setLogin(e.target.value)} />
          </Field>
          <Field label={copy.name}>
            <input className="ui-input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={copy.role}>
            <select className="ui-select" value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'user')}>
              <option value="user">{copy.user}</option>
              <option value="admin">{copy.admin}</option>
            </select>
          </Field>
          <Button
            variant="primary"
            onClick={() => {
              setError('');
              createUserMutation.mutate({ login, name, role });
            }}
          >
            {copy.create}
          </Button>
        </div>
        {error && <p className="ui-error">{error}</p>}
        {lastIssuedToken ? (
          <>
            <p className="ui-muted">{copy.tokenTitle}</p>
            <div className="admin-token-box">{lastIssuedToken}</div>
          </>
        ) : null}
      </SectionCard>

      <SectionCard title={copy.title}>
        <div className="admin-user-list">
          {(usersQuery.data || []).length === 0 ? <p className="ui-muted">{copy.empty}</p> : null}
          {(usersQuery.data || []).map((item) => (
            <div className="admin-user-row" key={item.id}>
              <div className="admin-user-meta">
                <div className="admin-user-title">
                  <strong>{item.name}</strong>
                  <span className="admin-role-badge">{item.role === 'admin' ? copy.admin : copy.user}</span>
                  {!item.isActive ? <span className="admin-role-badge">OFF</span> : null}
                </div>
                <div className="admin-user-subtle">@{item.login}</div>
                <div className="admin-user-subtle">
                  {copy.quotas}: {JSON.stringify(item.quotas || {})}
                </div>
                {item.tokens?.length ? (
                  <div className="admin-user-subtle">
                    token: {item.tokens[0].label} · {item.tokens[0].lastUsedAt || item.tokens[0].createdAt}
                  </div>
                ) : null}
              </div>
              <div className="admin-user-actions">
                <Button variant="secondary" size="small" onClick={() => resetTokenMutation.mutate({ userId: item.id })}>
                  {copy.resetToken}
                </Button>
                <Button
                  variant={item.isActive ? 'danger' : 'secondary'}
                  size="small"
                  onClick={() => patchUserMutation.mutate({ userId: item.id, isActive: !item.isActive })}
                >
                  {item.isActive ? copy.disable : copy.enable}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
