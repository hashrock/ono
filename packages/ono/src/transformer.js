/**
 * Transformer - JSX (and TypeScript) to JavaScript, using sucrase.
 *
 * sucrase is a small, pure-JS transpiler that runs in the browser as well
 * as Node. It does not type-check; syntax errors are thrown with the file
 * name and line/column in the message.
 */
import { transform } from "sucrase";

/**
 * Transforms to apply for a given file name
 * @param {string} filename
 * @returns {import("sucrase").Transform[]}
 */
function transformsFor(filename) {
  if (filename.endsWith(".ts")) return ["typescript"];
  if (filename.endsWith(".tsx")) return ["typescript", "jsx"];
  return ["jsx"];
}

/**
 * @param {string} source
 * @param {string} filename
 * @param {import("sucrase").Transform[]} extra
 */
function run(source, filename, extra) {
  return transform(source, {
    transforms: [...transformsFor(filename), ...extra],
    jsxRuntime: "classic",
    jsxPragma: "h",
    jsxFragmentPragma: "Fragment",
    production: true,
    disableESTransforms: true,
    preserveDynamicImport: true,
    filePath: filename,
  }).code;
}

/**
 * Transform JSX to JavaScript, keeping ES module syntax.
 * @param {string} source - JSX source code
 * @param {string} [filename='input.jsx'] - File name, used to pick transforms and in errors
 * @returns {string} Transformed JavaScript code
 */
export function transformJSX(source, filename = "input.jsx") {
  return run(source, filename, []);
}

/**
 * Transform JSX to JavaScript and rewrite ES module syntax to
 * `require()` / `exports` so the bundler can link modules.
 * @param {string} source
 * @param {string} [filename='input.jsx']
 * @returns {string}
 */
export function transformModule(source, filename = "input.jsx") {
  return run(source, filename, ["imports"]);
}
