// Ono compiler worker - inline version for standalone deployment
import ts from 'typescript';

// Inline JSX transformer from Ono
function transformJSX(source, filename = 'input.jsx') {
  const compilerOptions = {
    jsx: ts.JsxEmit.React,
    jsxFactory: 'h',
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ESNext,
    esModuleInterop: true,
  };

  const result = ts.transpileModule(source, {
    compilerOptions,
    fileName: filename,
  });

  return result.outputText;
}

// Inline JSX runtime from Ono
function h(type, props, ...children) {
  if (typeof type === 'function') {
    return type({ ...props, children: children.flat() });
  }

  const flatChildren = children.flat(Infinity).filter(child =>
    child !== null && child !== undefined && child !== false
  );

  return { type, props: props || {}, children: flatChildren };
}

// Inline renderer from Ono
function renderToString(vnode) {
  if (vnode === null || vnode === undefined || vnode === false) {
    return '';
  }

  if (typeof vnode === 'string' || typeof vnode === 'number') {
    return escapeHtml(String(vnode));
  }

  if (Array.isArray(vnode)) {
    return vnode.map(renderToString).join('');
  }

  const { type, props, children } = vnode;

  const attrs = Object.entries(props || {})
    .filter(([key]) => key !== 'children' && key !== 'key')
    .map(([key, value]) => {
      if (key === 'className') key = 'class';
      if (typeof value === 'boolean') {
        return value ? key : '';
      }
      if (value === null || value === undefined) {
        return '';
      }
      return `${key}="${escapeHtml(String(value))}"`;
    })
    .filter(Boolean)
    .join(' ');

  const attrsStr = attrs ? ' ' + attrs : '';

  const selfClosing = [
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ];

  if (selfClosing.includes(type)) {
    return `<${type}${attrsStr} />`;
  }

  const childrenStr = (children || []).map(renderToString).join('');
  return `<${type}${attrsStr}>${childrenStr}</${type}>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Worker message handler
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
