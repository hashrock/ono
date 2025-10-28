// Ono compiler worker - multi-file bundler
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

// Simple module bundler
function bundleModules(files, entryPoint) {
  const modules = {};
  const resolved = {};

  // Transform all files
  Object.keys(files).forEach(filename => {
    const source = files[filename];
    const transformed = transformJSX(source, filename);
    modules[filename] = transformed;
  });

  // Resolve imports
  function resolveImport(from, to) {
    // Handle relative imports
    if (to.startsWith('./') || to.startsWith('../')) {
      const fromDir = from.split('/').slice(0, -1).join('/');
      const parts = to.split('/');
      const resolved = fromDir ? fromDir.split('/') : [];

      for (const part of parts) {
        if (part === '..') {
          resolved.pop();
        } else if (part !== '.') {
          resolved.push(part);
        }
      }

      return resolved.join('/');
    }
    return to;
  }

  // Build module system
  let bundledCode = '';

  Object.keys(modules).forEach(filename => {
    let code = modules[filename];

    // Replace import statements with references
    code = code.replace(/import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g, (match, imports, path) => {
      const resolvedPath = resolveImport(filename, path);
      const importNames = imports.split(',').map(s => s.trim());
      return importNames.map(name => {
        return `const ${name} = __modules['${resolvedPath}'].${name};`;
      }).join('\n');
    });

    // Replace export statements
    const exports = [];
    code = code.replace(/export\s+function\s+(\w+)/g, (match, name) => {
      exports.push(name);
      return `function ${name}`;
    });

    // For entry point, we need to expose all top-level functions
    if (filename === entryPoint) {
      // Find all function declarations (including non-exported ones)
      const functionMatches = code.matchAll(/function\s+(\w+)/g);
      for (const match of functionMatches) {
        if (!exports.includes(match[1])) {
          exports.push(match[1]);
        }
      }
    }

    // Wrap in module function
    bundledCode += `
__modules['${filename}'] = (function() {
  ${code}
  return { ${exports.join(', ')} };
})();
`;
  });

  return `
const __modules = {};
${bundledCode}
// Execute entry point
const __entry = __modules['${entryPoint}'];
`;
}

// Worker message handler
self.onmessage = async (e) => {
  const { type, files, entryPoint, id } = e.data;

  if (type === 'compile') {
    try {
      // Bundle all modules
      const bundled = bundleModules(files, entryPoint);

      // Get the entry point code to find the last expression
      const entryCode = files[entryPoint];
      const lastExprMatch = entryCode.match(/\n\s*(\w+)\([^)]*\)\s*$/);
      const returnExpr = lastExprMatch ? lastExprMatch[1] : '';

      // Execute the bundled code
      const fn = new Function('h', 'renderToString', `
        ${bundled}
        return __entry.${returnExpr}();
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
