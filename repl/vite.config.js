import { defineConfig } from 'vite'

export default defineConfig({
  base: '/ono/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
