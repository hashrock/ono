/**
 * Mini bundler - browser-compatible.
 *
 * Each module is transformed to CommonJS-style code by sucrase (JSX plus
 * import/export rewriting), wrapped in a factory function, and linked with
 * a tiny lazy require(). No topological sort is needed and import cycles
 * behave like CommonJS.
 *
 * The host environment supplies I/O:
 *   - load(id): return the module's source (JSX/TS allowed)
 *   - resolve(specifier, fromId): turn a relative specifier into a module id
 *
 * Known limitation (deliberate, for simplicity): no top-level await.
 */
import { transformModule } from "./transformer.js";

/** @param {string} specifier */
const isRelative = (specifier) =>
  specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/");

/**
 * `require('...')` calls emitted by sucrase's imports transform. Only the
 * transformed output is scanned, so import statements are already gone;
 * a string literal in user code that happens to look like a require call
 * will also be picked up, which at worst loads an extra module.
 */
const REQUIRE_CALL = /\brequire\((["'])([^"'\\\n]+)\1\)/g;

/**
 * REPL convenience: a snippet without any `export` still renders its
 * top-level functions (usually ending in an App function).
 * @param {string} source
 */
function exposeTopLevelFunctions(source) {
  if (/^\s*export\b/m.test(source)) return source;
  const names = [...source.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  if (names.length === 0) return source;
  return `${source}\nexport { ${[...new Set(names)].join(", ")} };`;
}

const LINKER_RUNTIME = `const __ono_cache = new Map();
function __ono_require(id) {
  let record = __ono_cache.get(id);
  if (!record) {
    record = { exports: {} };
    __ono_cache.set(id, record);
    const { deps, factory } = __ono_modules[id];
    factory(record.exports, (specifier) =>
      specifier in deps ? __ono_require(deps[specifier]) : __ono_externals[specifier]);
  }
  return record.exports;
}`;

/**
 * Bundle an entry module and its local imports into one script.
 *
 * @param {Object} options
 * @param {string} options.entry - Module id of the entry point
 * @param {(id: string) => string | Promise<string>} options.load - Return a module's source
 * @param {(specifier: string, fromId: string) => string} options.resolve - Resolve a relative specifier
 * @param {"hoist"|"error"} [options.onExternal] - Bare (package) imports: hoist to ES
 *   `import` statements at the bundle top (needs an ESM host, e.g. Node) or throw (browser)
 * @param {boolean} [options.exposeEntryFunctions] - Export the entry's top-level functions
 *   when it has no exports of its own (REPL convenience)
 * @returns {Promise<{code: string, entryId: string, externals: string[]}>}
 *   `code` ends by evaluating the entry into `__ono_entry`; it references
 *   `h` and `Fragment` as free variables the caller must provide.
 */
export async function bundle(options) {
  const { entry, load, resolve, onExternal = "hoist", exposeEntryFunctions = false } = options;

  /** @type {Map<string, {code: string, deps: Record<string, string>}>} */
  const modules = new Map();
  /** @type {string[]} */
  const externals = [];

  const queue = [entry];
  while (queue.length > 0) {
    const id = /** @type {string} */ (queue.shift());
    if (modules.has(id)) continue;

    let source = await load(id);
    if (exposeEntryFunctions && id === entry) source = exposeTopLevelFunctions(source);
    const code = transformModule(source, id);

    /** @type {Record<string, string>} */
    const deps = {};
    for (const [, , specifier] of code.matchAll(REQUIRE_CALL)) {
      if (isRelative(specifier)) {
        deps[specifier] = resolve(specifier, id);
        queue.push(deps[specifier]);
      } else if (onExternal === "hoist") {
        if (!externals.includes(specifier)) externals.push(specifier);
      } else {
        throw new Error(`Cannot bundle package import "${specifier}" (in ${id})`);
      }
    }
    modules.set(id, { code, deps });
  }

  const parts = [];
  if (externals.length > 0) {
    // Package imports become real ES imports; wrap namespaces so sucrase's
    // interop helpers treat them as ES modules (default stays `default`).
    parts.push(externals.map((s, i) => `import * as __ono_ext${i} from ${JSON.stringify(s)};`).join("\n"));
    parts.push(
      `const __ono_externals = {\n${externals
        .map((s, i) => `  ${JSON.stringify(s)}: { __esModule: true, ...__ono_ext${i} }`)
        .join(",\n")}\n};`,
    );
  } else {
    parts.push("const __ono_externals = {};");
  }
  parts.push("const __ono_modules = {};");
  for (const [id, { code, deps }] of modules) {
    parts.push(
      `__ono_modules[${JSON.stringify(id)}] = { deps: ${JSON.stringify(deps)}, factory: function (exports, require) {\n${code}\n} };`,
    );
  }
  parts.push(LINKER_RUNTIME);
  parts.push(`const __ono_entry = __ono_require(${JSON.stringify(entry)});`);

  return { code: parts.join("\n\n"), entryId: entry, externals };
}
