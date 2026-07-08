/**
 * Mini bundler - browser-compatible.
 *
 * Each module is wrapped in a factory function and linked with a tiny
 * lazy require(), so no topological sort is needed and import cycles
 * behave like CommonJS. Module syntax is parsed with the parser
 * combinators in parser.js — no regular expressions over source code.
 *
 * The host environment supplies I/O:
 *   - load(id): return the module's JavaScript source (JSX already transformed)
 *   - resolve(specifier, fromId): turn a relative specifier into a module id
 *
 * Known limitations (deliberate, for simplicity): no top-level await,
 * no destructuring in exported declarations, `export *` copies a
 * snapshot of the source module.
 */
import { parseModule, isIdentifierName } from "./parser.js";

const isRelative = (specifier) =>
  specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/");

/** Apply text replacements (non-overlapping) to a source string */
function applyEdits(source, edits) {
  let result = source;
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }
  return result;
}

/** Generate the require/destructuring lines that replace an import statement */
function importReplacement(imp, requireCall) {
  const parts = [];
  if (imp.defaultBinding) parts.push(`const ${imp.defaultBinding} = ${requireCall}.default;`);
  if (imp.namespace) parts.push(`const ${imp.namespace} = ${requireCall};`);
  if (imp.named && imp.named.length > 0) {
    const bindings = imp.named
      .map(({ imported, local }) =>
        imported === local ? imported : `${JSON.stringify(imported)}: ${local}`,
      )
      .join(", ");
    parts.push(`const { ${bindings} } = ${requireCall};`);
  }
  if (parts.length === 0) parts.push(`${requireCall};`); // side-effect only
  return parts.join(" ");
}

/** Record the top-level names an import statement binds */
function collectBindings(imp, bindings) {
  if (imp.defaultBinding) bindings.add(imp.defaultBinding);
  if (imp.namespace) bindings.add(imp.namespace);
  for (const { local } of imp.named ?? []) bindings.add(local);
}

const LINKER_RUNTIME = `const __ono_cache = new Map();
function __ono_require(id) {
  let record = __ono_cache.get(id);
  if (!record) {
    record = { exports: {} };
    __ono_cache.set(id, record);
    __ono_modules[id](record.exports, __ono_require);
  }
  return record.exports;
}
function __ono_export_star(target, source) {
  for (const key of Object.keys(source)) {
    if (key !== "default") target[key] = source[key];
  }
}`;

/**
 * Bundle an entry module and its local imports into one script.
 *
 * @param {Object} options
 * @param {string} options.entry - Module id of the entry point
 * @param {(id: string) => string | Promise<string>} options.load - Return a module's JS source
 * @param {(specifier: string, fromId: string) => string} options.resolve - Resolve a relative specifier
 * @param {"hoist"|"error"} [options.onExternal] - Bare (package) imports: hoist to the
 *   bundle top (needs an ESM host, e.g. Node) or throw (e.g. the browser REPL)
 * @param {boolean} [options.exposeEntryFunctions] - Also export the entry's top-level
 *   function declarations (REPL convenience for code without exports)
 * @returns {Promise<{code: string, entryId: string, entryExports: string[], externalBindings: Set<string>}>}
 *   `code` defines __ono_modules/__ono_require and ends by evaluating the
 *   entry into `__ono_entry`. The caller decides how to expose it.
 */
export async function bundle(options) {
  const { entry, load, resolve, onExternal = "hoist", exposeEntryFunctions = false } = options;

  const moduleCodes = new Map();
  const externalImports = [];
  const externalBindings = new Set();
  const entryExports = [];
  const addEntryExport = (name) => {
    if (!entryExports.includes(name)) entryExports.push(name);
  };

  const queue = [entry];
  while (queue.length > 0) {
    const id = queue.shift();
    if (moduleCodes.has(id)) continue;

    const source = await load(id);
    let parsed;
    try {
      parsed = parseModule(source);
    } catch (error) {
      throw new Error(`${error.message} (in ${id})`);
    }

    const isEntry = id === entry;
    const edits = [];
    // Function declarations are hoisted, so their export assignments go at
    // the top of the factory — this keeps them visible across import cycles,
    // mirroring ESM hoisting. Everything else is assigned at the end.
    const head = [];
    const tail = [];

    for (const imp of parsed.imports) {
      if (isRelative(imp.specifier)) {
        const depId = resolve(imp.specifier, id);
        queue.push(depId);
        const requireCall = `__ono_require(${JSON.stringify(depId)})`;
        edits.push({ start: imp.start, end: imp.end, text: importReplacement(imp, requireCall) });
      } else if (onExternal === "hoist") {
        // Package import: move it to the top of the bundle, outside the factories
        const statement = source.slice(imp.start, imp.end).trim();
        if (!externalImports.includes(statement)) externalImports.push(statement);
        collectBindings(imp, externalBindings);
        edits.push({ start: imp.start, end: imp.end, text: "" });
      } else {
        throw new Error(`Cannot bundle package import "${imp.specifier}" (in ${id})`);
      }
    }

    for (const exp of parsed.exports) {
      switch (exp.type) {
        case "exportStarFrom": {
          if (!isRelative(exp.specifier)) {
            throw new Error(`"export * from" a package is not supported (in ${id})`);
          }
          const depId = resolve(exp.specifier, id);
          queue.push(depId);
          const requireCall = `__ono_require(${JSON.stringify(depId)})`;
          const text = exp.alias
            ? `__ono_exports[${JSON.stringify(exp.alias)}] = ${requireCall};`
            : `__ono_export_star(__ono_exports, ${requireCall});`;
          edits.push({ start: exp.start, end: exp.end, text });
          if (isEntry && exp.alias) addEntryExport(exp.alias);
          break;
        }
        case "exportNamedFrom": {
          if (!isRelative(exp.specifier)) {
            throw new Error(`Re-exporting from a package is not supported (in ${id})`);
          }
          const depId = resolve(exp.specifier, id);
          queue.push(depId);
          const requireCall = `__ono_require(${JSON.stringify(depId)})`;
          const text = exp.named
            .map(
              ({ local, exported }) =>
                `__ono_exports[${JSON.stringify(exported)}] = ${requireCall}[${JSON.stringify(local)}];`,
            )
            .join(" ");
          edits.push({ start: exp.start, end: exp.end, text });
          if (isEntry) exp.named.forEach(({ exported }) => addEntryExport(exported));
          break;
        }
        case "exportNamed": {
          edits.push({ start: exp.start, end: exp.end, text: "" });
          for (const { local, exported } of exp.named) {
            tail.push(`__ono_exports[${JSON.stringify(exported)}] = ${local};`);
            if (isEntry) addEntryExport(exported);
          }
          break;
        }
        case "exportDefaultDeclaration": {
          edits.push({ start: exp.start, end: exp.headerEnd, text: "" });
          const target = exp.declarationKind === "function" ? head : tail;
          target.push(`__ono_exports.default = ${exp.name};`);
          if (isEntry) addEntryExport("default");
          break;
        }
        case "exportDefaultExpression": {
          edits.push({ start: exp.start, end: exp.headerEnd, text: "__ono_exports.default =" });
          if (isEntry) addEntryExport("default");
          break;
        }
        case "exportDeclaration": {
          edits.push({ start: exp.start, end: exp.headerEnd, text: "" });
          const target = exp.declarationKind === "function" ? head : tail;
          for (const name of exp.names) {
            target.push(`__ono_exports[${JSON.stringify(name)}] = ${name};`);
            if (isEntry) addEntryExport(name);
          }
          break;
        }
      }
    }

    if (exposeEntryFunctions && isEntry) {
      for (const name of parsed.topLevelFunctions) {
        if (!entryExports.includes(name)) {
          tail.push(`__ono_exports[${JSON.stringify(name)}] = ${name};`);
          addEntryExport(name);
        }
      }
    }

    let code = applyEdits(source, edits);
    if (head.length > 0) code = `${head.join("\n")}\n${code}`;
    if (tail.length > 0) code += `\n${tail.join("\n")}`;
    moduleCodes.set(id, code);
  }

  const parts = [];
  if (externalImports.length > 0) parts.push(externalImports.join("\n"));
  parts.push("const __ono_modules = {};");
  for (const [id, code] of moduleCodes) {
    parts.push(`__ono_modules[${JSON.stringify(id)}] = function (__ono_exports, __ono_require) {\n${code}\n};`);
  }
  parts.push(LINKER_RUNTIME);
  parts.push(`const __ono_entry = __ono_require(${JSON.stringify(entry)});`);

  return {
    code: parts.join("\n\n"),
    entryId: entry,
    entryExports: entryExports.filter((name) => name === "default" || isIdentifierName(name)),
    externalBindings,
  };
}
