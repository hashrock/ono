import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/ono/',
  resolve: {
    alias: {
      '@ono': path.resolve(__dirname, '../src'),
      typescript: path.resolve(__dirname, './node_modules/typescript/lib/typescript.js'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
});
