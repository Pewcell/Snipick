import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      electron: resolve(__dirname, 'tests/mocks/electron.ts')
    }
  },
  test: {
    environment: 'node',
    globals: true
  }
})
