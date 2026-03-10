import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { useAuth } from './AuthProvider';
import './auth.css';

export function AccountToolbar({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const { user, logout } = useAuth();
  if (!user) return null;

  const labels = locale === 'ru' ? { admin: 'Админ', logout: 'Выйти' } : { admin: 'Admin', logout: 'Logout' };

  return (
    <div className="account-toolbar">
      <span className="account-toolbar-name">{user.name}</span>
      {user.role === 'admin' ? (
        <Button size={compact ? 'small' : 'default'} variant="secondary" onClick={() => navigate('/admin/users')}>
          {labels.admin}
        </Button>
      ) : null}
      <Button
        size={compact ? 'small' : 'default'}
        variant="ghost"
        onClick={async () => {
          await logout();
          navigate('/login', { replace: true });
        }}
      >
        {labels.logout}
      </Button>
    </div>
  );
}
