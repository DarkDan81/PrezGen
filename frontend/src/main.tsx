import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { I18nProvider } from './shared/i18n/I18nProvider.tsx'
import './styles.css'
import './shared/ui/ui.css'

const queryClient = new QueryClient()
const persistedUiMode = window.localStorage.getItem('prezgen-ui-mode')
if (persistedUiMode === 'dark' || persistedUiMode === 'light') {
  document.documentElement.dataset.mode = persistedUiMode
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </I18nProvider>
  </StrictMode>,
)
