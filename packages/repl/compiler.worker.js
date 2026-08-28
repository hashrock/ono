// Ono REPL worker - delegates compilation to shared browser compiler utilities.
import { compileProject } from '@ono/browser/compiler.js';
// Same reset the Node build prepends to uno.css (see ono/src/unocss.js)
import resetCSS from '@unocss/reset/tailwind.css?raw';

self.onmessage = async (event) => {
  const { type, files, entryPoint, id } = event.data;
  if (type !== 'compile') {
    return;
  }

  try {
    const { html, css } = await compileProject(files, entryPoint);

    self.postMessage({
      type: 'success',
      html,
      css: `${resetCSS}\n${css}`,
      id,
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message,
      stack: error.stack,
      id,
    });
  }
};
