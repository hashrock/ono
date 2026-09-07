import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { alias } from './vite.shared.js';

/** Demo app in `demo/`: the editor hosted in a page, built from src for HMR. */
export default defineConfig({
  root: 'demo',
  base: './',
  plugins: [react()],
  resolve: { alias },
  build: { outDir: '../demo-dist', emptyOutDir: true },
});
