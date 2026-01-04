// Ono REPL worker - delegates compilation to shared browser compiler utilities.
import { compileProject } from '@ono/browser/compiler.js';

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
      css,
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
