// Ono compiler worker
import { transformJSX } from '@hashrock/ono/src/transformer.js';
import { renderToString } from '@hashrock/ono/src/renderer.js';
import { createElement as h } from '@hashrock/ono/src/jsx-runtime.js';

self.onmessage = async (e) => {
  const { type, code, id } = e.data;

  if (type === 'compile') {
    try {
      // Remove export statements as they're not needed in REPL context
      const cleanCode = code.replace(/export\s+default\s+/g, '');

      // Transform JSX to JavaScript
      const jsCode = transformJSX(cleanCode, 'repl.jsx');

      // Extract the last expression (component call)
      const lastExprMatch = cleanCode.match(/\n\s*(\w+)\([^)]*\)\s*$/);
      const returnExpr = lastExprMatch ? lastExprMatch[0] : '';

      // Execute the code and render to HTML
      const fn = new Function('h', 'renderToString', `
        ${jsCode}
        return ${returnExpr.trim()};
      `);

      const vnode = fn(h, renderToString);
      const html = renderToString(vnode);

      self.postMessage({
        type: 'success',
        html,
        id
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message,
        stack: error.stack,
        id
      });
    }
  }
};
