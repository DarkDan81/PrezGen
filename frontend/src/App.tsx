import { Navigate, Route, Routes } from 'react-router-dom';
import { EditorPage } from './pages/EditorPage';
import { PresentationsPage } from './pages/PresentationsPage';
import { ThemesPage } from './pages/ThemesPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<PresentationsPage />} />
      <Route path="/themes" element={<ThemesPage />} />
      <Route path="/presentations/:id" element={<EditorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
