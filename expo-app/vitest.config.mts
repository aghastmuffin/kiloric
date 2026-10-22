import { fileURLToPath } from 'node:url'
// eslint-disable-next-line import/no-unresolved
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
