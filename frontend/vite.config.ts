import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3100',
      '/themes': {
        target: 'http://localhost:3100',
        bypass: (req) => {
          if (req.url === '/themes' || req.url === '/themes/') {
            return req.url;
          }
          return undefined;
        },
      },
      '/dist': 'http://localhost:3100',
      '/content': 'http://localhost:3100',
    },
  },
})
