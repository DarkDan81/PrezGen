import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './shared/auth/AuthProvider';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { EditorPage } from './pages/EditorPage';
import { LoginPage } from './pages/LoginPage';
import { PresentationsPage } from './pages/PresentationsPage';
import { ThemesPage } from './pages/ThemesPage';

function App() {
  const { ready, user } = useAuth();
  if (!ready) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={user ? <PresentationsPage /> : <Navigate to="/login" replace />} />
      <Route path="/themes" element={user ? <ThemesPage /> : <Navigate to="/login" replace />} />
      <Route path="/presentations/:id" element={user ? <EditorPage /> : <Navigate to="/login" replace />} />
      <Route path="/admin/users" element={user?.role === 'admin' ? <AdminUsersPage /> : <Navigate to={user ? '/' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  );
}

export default App;
