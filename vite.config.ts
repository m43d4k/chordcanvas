import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const buildId = new Date().toISOString().replace(/[-:.TZ]/g, '')

export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  base: './',
  plugins: [
    react(),
    {
      name: 'cache-bust-public-assets',
      transformIndexHtml(html) {
        return html.replace(
          './favicon.svg',
          `./favicon.svg?v=${buildId}`,
        )
      },
    },
  ],
  build: {
    outDir: 'docs',
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
