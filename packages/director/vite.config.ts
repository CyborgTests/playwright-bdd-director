import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@web': path.resolve(__dirname, '../web/src'),
      '@testIsomorphic': path.resolve(__dirname, '../playwright/src/isomorphic'),
      '@isomorphic': path.resolve(__dirname, '../isomorphic')
    }
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  },
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  }
})
