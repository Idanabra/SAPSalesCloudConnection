import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoName = 'SAPSalesCloudConnection'

export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages: /SAPSalesCloudConnection/
  // In dev (no BASE_URL override) this is '/' so the dev server works normally.
  base: process.env.NODE_ENV === 'production' ? `/${repoName}/` : '/',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist/client',
  },
})
