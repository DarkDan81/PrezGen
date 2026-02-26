import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3100',
      '/themes': 'http://localhost:3100',
      '/dist': 'http://localhost:3100',
      '/content': 'http://localhost:3100',
    },
  },
})
