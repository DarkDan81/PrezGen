import { Navigate, Route, Routes } from 'react-router-dom';
import { EditorPage } from './pages/EditorPage';
import { PresentationsPage } from './pages/PresentationsPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<PresentationsPage />} />
      <Route path="/presentations/:id" element={<EditorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
