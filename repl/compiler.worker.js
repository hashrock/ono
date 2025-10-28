// Ono compiler worker - web-friendly bundler that reuses the official runtime
import { transformJSX } from '@ono/transformer.js';
import { renderToString } from '@ono/renderer.js';
import { h } from '@ono/jsx-runtime.js';
import { createGenerator } from '@unocss/core';
import { presetUno } from '@unocss/preset-uno';

function resolveImport(from, to) {
  if (to.startsWith('./') || to.startsWith('../')) {
    const fromParts = from.split('/').slice(0, -1);
    const targetParts = to.split('/');
    const resolved = [...fromParts];

    for (const part of targetParts) {
      if (!part || part === '.') continue;
      if (part === '..') {
        resolved.pop();
      } else {
        resolved.push(part);
      }
    }

    return resolved.join('/');
  }

  return to;
}

function bundleModules(files, entryPoint) {
  const filenames = Object.keys(files);
  const dependencyMap = new Map();
  const importPattern = /import\s+(?:[\s\S]+?)?from\s+['"]([^'"]+)['"]/g;

  for (const filename of filenames) {
    const source = files[filename] || '';
    const deps = [];
    source.replace(importPattern, (match, specifier) => {
      const resolved = resolveImport(filename, specifier);
      if (files[resolved]) {
        deps.push(resolved);
      }
      return match;
    });
    dependencyMap.set(filename, deps);
  }

  const visited = new Set();
  const order = [];

  const visit = (file) => {
    if (!files[file] || visited.has(file)) return;
    visited.add(file);
    const deps = dependencyMap.get(file) || [];
    for (const dep of deps) {
      visit(dep);
    }
    order.push(file);
  };

  if (entryPoint) {
    visit(entryPoint);
  }

  for (const filename of filenames) {
    if (!visited.has(filename)) {
      visit(filename);
    }
  }

  let bundledCode = 'const __modules = {};\n';

  for (const filename of order) {
    const transformedCode = transformJSX(files[filename], filename);
    let code = transformedCode;
    const exportMappings = new Map();

    const addExport = (exportName, localName = exportName) => {
      if (!exportName) return;
      if (!exportMappings.has(exportName)) {
        exportMappings.set(exportName, localName);
      }
    };

    // Import transformations
    code = code.replace(/import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g, (match, imports, path) => {
      const resolvedPath = resolveImport(filename, path);
      const importNames = imports.split(',').map(part => part.trim()).filter(Boolean);

      return importNames
        .map(name => {
          const [local, alias] = name.split(/\s+as\s+/).map(token => token && token.trim());
          const localName = alias || local;
          const exportName = local;
          return `const ${localName} = __modules['${resolvedPath}']['${exportName}'];`;
        })
        .join('\n');
    });

    code = code.replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, (match, localName, path) => {
      const resolvedPath = resolveImport(filename, path);
      return `const ${localName} = __modules['${resolvedPath}']['default'];`;
    });

    code = code.replace(/import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, (match, localName, path) => {
      const resolvedPath = resolveImport(filename, path);
      return `const ${localName} = __modules['${resolvedPath}'];`;
    });

    // Export transformations
    code = code.replace(/export\s+default\s+function\s+([A-Za-z_$][\w$]*)/g, (match, name) => {
      addExport('default', name);
      return `function ${name}`;
    });

    code = code.replace(/export\s+default\s+([A-Za-z_$][\w$]*)/g, (match, name) => {
      addExport('default', name);
      return `${name}`;
    });

    code = code.replace(/export\s+(const|let|var)\s+([A-Za-z_$][\w$]*)/g, (match, kind, name) => {
      addExport(name);
      return `${kind} ${name}`;
    });

    code = code.replace(/export\s+function\s+([A-Za-z_$][\w$]*)/g, (match, name) => {
      addExport(name);
      return `function ${name}`;
    });

    code = code.replace(/export\s+class\s+([A-Za-z_$][\w$]*)/g, (match, name) => {
      addExport(name);
      return `class ${name}`;
    });

    code = code.replace(/export\s*{\s*([^}]+)\s*};?/g, (match, names) => {
      names
        .split(',')
        .map(part => part.trim())
        .filter(Boolean)
        .forEach(part => {
          const [local, alias] = part.split(/\s+as\s+/).map(token => token && token.trim());
          addExport(alias || local, local);
        });
      return '';
    });

    code = code.replace(/export\s*{\s*};?/g, '');

    if (filename === entryPoint) {
      const functionMatches = code.matchAll(/function\s+([A-Za-z_$][\w$]*)/g);
      for (const match of functionMatches) {
        const name = match[1];
        if (!exportMappings.has(name)) {
          addExport(name);
        }
      }
    }

    const exportEntries = Array.from(exportMappings.entries()).map(([exportName, localName]) => {
      if (exportName === 'default') {
        return `'default': ${localName}`;
      }
      if (exportName === localName) {
        return exportName;
      }
      return `'${exportName}': ${localName}`;
    });

    const exportsObject = exportEntries.join(', ');

    bundledCode += `
__modules['${filename}'] = (() => {
  ${code}
  return { ${exportsObject} };
})();
`;
  }

  bundledCode += `const __entry = __modules['${entryPoint}'];\n`;

  return bundledCode;
}

self.onmessage = async (event) => {
  const { type, files, entryPoint, id } = event.data;
  if (type !== 'compile') {
    return;
  }

  try {
    const bundled = bundleModules(files, entryPoint);

    const getEntryModule = new Function('h', `
      ${bundled}
      return __entry;
    `);

    const entryModule = getEntryModule(h);

    const entryCode = files[entryPoint] || '';
    const lastCallMatch = entryCode.match(/([A-Za-z_$][\\w$]*)\\s*\\([^)]*\\)\\s*$/m);
    const lastCallName = lastCallMatch ? lastCallMatch[1] : null;

    let vnode = null;

    if (entryModule && typeof entryModule === 'object') {
      const defaultExport = entryModule.default;

      if (typeof defaultExport === 'function') {
        vnode = defaultExport();
      } else if (defaultExport !== undefined) {
        vnode = defaultExport;
      }

      if (!vnode && lastCallName) {
        const candidate = entryModule[lastCallName];
        if (typeof candidate === 'function') {
          vnode = candidate();
        } else if (candidate !== undefined) {
          vnode = candidate;
        }
      }

      if (!vnode) {
        const fallbackFunction = Object.values(entryModule).find(
          value => typeof value === 'function'
        );
        if (fallbackFunction) {
          vnode = fallbackFunction();
        } else if (entryModule && Object.values(entryModule).length > 0) {
          vnode = Object.values(entryModule)[0];
        }
      }
    }

    if (!vnode) {
      throw new Error('Unable to determine a render function in the entry module.');
    }

    const html = renderToString(vnode);
    const uno = await createGenerator({
      presets: [presetUno()],
    });
    const { css } = await uno.generate(html, { preflights: true });

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
