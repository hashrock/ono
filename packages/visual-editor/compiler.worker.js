// Compiles the (instrumented) project with Ono's browser compiler.
import { compileProject } from '@ono/browser/compiler.js';
import resetCSS from '@unocss/reset/tailwind.css?raw';

self.onmessage = async (event) => {
  const { type, files, entryPoint, id } = event.data;
  if (type !== 'compile') return;

  try {
    const { html, css } = await compileProject(files, entryPoint);
    self.postMessage({ type: 'success', html, css: `${resetCSS}\n${css}`, id, fileCount: Object.keys(files).length });
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message, stack: error.stack, id });
  }
};
