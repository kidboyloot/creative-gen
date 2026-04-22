import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8000',
      '/upload': 'http://localhost:8000',
      '/generate': 'http://localhost:8000',
      '/history': 'http://localhost:8000',
      '/download': 'http://localhost:8000',
      '/files': 'http://localhost:8000',
      '/spaces': 'http://localhost:8000',
      '/video': 'http://localhost:8000',
      '/tools': 'http://localhost:8000',
      '/voice': 'http://localhost:8000',
      '/adgenius': 'http://localhost:8000',
      '/chat': 'http://localhost:8000',
      '/image-edit': 'http://localhost:8000',
      '/avatar': 'http://localhost:8000',
      '/translate': 'http://localhost:8000',
      '/profile': 'http://localhost:8000',
      '/shopify': 'http://localhost:8000',
      '/teams': 'http://localhost:8000',
    },
  },
})
