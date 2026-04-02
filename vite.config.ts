import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

const buildId = new Date().toISOString().replace(/[-:.TZ]/g, '')

export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [react(), {
    name: 'cache-bust-public-assets',
    transformIndexHtml(html) {
      return html.replace(
        './favicon.svg',
        `./favicon.svg?v=${buildId}`,
      )
    },
  }, cloudflare()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})