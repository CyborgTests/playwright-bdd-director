import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['tests/automated/**', 'tests/hybrid/**', 'tests/manual/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/framework/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/index.ts']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
