/**
 * Browser compiler - shared with the REPL worker.
 *
 * Uses the same mini bundler as the Node build (bundler.js/parser.js).
 * Package imports are rejected — the browser has no module resolution —
 * and the bundle is evaluated with new Function, with the JSX runtime
 * passed in as parameters.
 */

import { transformJSX } from '../transformer.js';
import { renderToString } from '../renderer.js';
import { h, Fragment } from '../jsx-runtime.js';
import { bundle } from '../bundler.js';
import { getUnoGenerator } from './unocss.js';

/** Join a relative specifier against the importing file's virtual path */
function resolveImport(fromId, specifier) {
  const fromParts = fromId.split('/').slice(0, -1);
  const targetParts = specifier.split('/');
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

async function bundleProject(files, entryPoint) {
  if (!(entryPoint in files)) {
    throw new Error(`Entry point '${entryPoint}' not found`);
  }

  const { code } = await bundle({
    entry: entryPoint,
    resolve: (specifier, fromId) => {
      const resolved = resolveImport(fromId, specifier);
      if (!(resolved in files)) {
        throw new Error(`Cannot find module '${specifier}' imported from '${fromId}'`);
      }
      return resolved;
    },
    load: (id) => transformJSX(files[id], id),
    onExternal: 'error',
    exposeEntryFunctions: true,
  });

  return code;
}

function evaluateEntryModule(bundledCode) {
  const getEntryModule = new Function('h', 'Fragment', `
    ${bundledCode}
    return __ono_entry;
  `);

  return getEntryModule(h, Fragment);
}

/**
 * Pick what to render from the entry module: the default export if there
 * is one, otherwise the last exported function (REPL snippets usually
 * define components and finish with an App function), otherwise any value.
 */
function extractRenderCandidate(entryModule) {
  if (!entryModule || typeof entryModule !== 'object') {
    return null;
  }

  const defaultExport = entryModule.default;
  if (typeof defaultExport === 'function') {
    return defaultExport;
  }
  if (defaultExport !== undefined) {
    return () => defaultExport;
  }

  const functions = Object.values(entryModule).filter((value) => typeof value === 'function');
  if (functions.length > 0) {
    return functions[functions.length - 1];
  }

  const firstValue = Object.values(entryModule)[0];
  if (firstValue !== undefined) {
    return () => firstValue;
  }

  return null;
}

export async function compileProject(files, entryPoint = 'index.jsx', options = {}) {
  const bundled = await bundleProject(files, entryPoint);
  const entryModule = evaluateEntryModule(bundled);
  const renderCandidate = extractRenderCandidate(entryModule);

  if (!renderCandidate) {
    throw new Error('Unable to determine a render function in the entry module.');
  }

  const vnode = renderCandidate();
  const html = renderToString(vnode);

  let css = '';
  if (options.enableUno !== false) {
    const uno = await getUnoGenerator(options.unoConfig);
    const result = await uno.generate(html, { preflights: true });
    css = result.css;
  }

  return { html, css };
}
