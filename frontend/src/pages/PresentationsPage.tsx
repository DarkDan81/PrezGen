import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import './presentations.css';

export function PresentationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState('New Presentation');
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
        <h1>PrezGen Constructor</h1>
      </header>

      <section className="panel">
        <h2>Create Presentation</h2>
        <div className="grid-row">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Theme
            <select value={themeId} onChange={(e) => setThemeId(e.target.value)}>
              {(themesQuery.data || []).map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="primary"
            onClick={() => {
              setError('');
              createMutation.mutate({ name, themeId });
            }}
          >
            Create
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="panel">
        <h2>Presentations</h2>
        <ul className="list">
          {(presentationsQuery.data || []).map((presentation) => (
            <li key={presentation.id}>
              <button className="linklike" onClick={() => navigate(`/presentations/${presentation.id}`)}>
                {presentation.name} <small>({presentation.status})</small>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

