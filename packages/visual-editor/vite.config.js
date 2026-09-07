import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { alias } from './vite.shared.js';

/**
 * Library build: `dist/index.js` (React component), `dist/core.js` (headless
 * logic) and `dist/style.css`.
 *
 * React, Ono and sucrase stay external — consumers install them. The compiler
 * Web Worker is inlined instead (see useCompiler.js), so the editor needs no
 * worker or asset configuration on the consumer side.
 */
export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    lib: {
      entry: { index: 'src/index.js', core: 'src/core.js' },
      formats: ['es'],
    },
    rollupOptions: {
      external: [/^react($|\/)/, /^react-dom($|\/)/, /^@hashrock\/ono($|\/)/, /^sucrase($|\/)/],
      output: { assetFileNames: 'style.[ext]' },
    },
  },
});
