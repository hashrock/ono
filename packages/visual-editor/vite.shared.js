import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

/**
 * UnoCSS ships browser and node conditions; point at the ESM builds so both
 * the library build and the worker bundle get the same files.
 */
export const alias = {
  '@unocss/core': path.resolve(dir, 'node_modules/@unocss/core/dist/index.mjs'),
  '@unocss/preset-uno': path.resolve(dir, 'node_modules/@unocss/preset-uno/dist/index.mjs'),
};
