/**
 * Build utilities for Ono SSG
 *
 * Pages are bundled with the browser-compatible mini bundler
 * (bundler.js + parser.js), written to a single temp file, and imported.
 * Package (bare) imports are hoisted to the top of the bundle where
 * Node's own resolution handles them.
 */
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { resolve, join, dirname, basename, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { renderToString } from "./renderer.js";
import { generateCSSFromFiles, loadUnoConfig } from "./unocss.js";
import { transformJSX } from "./transformer.js";
import { bundle } from "./bundler.js";
import { getFilesRecursively, isJSXFile, isHTMLFile } from "./utils.js";
import { DIRS } from "./constants.js";

/** Import statement for the real JSX runtime, injected into compiled pages */
const JSX_RUNTIME_IMPORT = `import { h, Fragment } from ${JSON.stringify(
  new URL("./jsx-runtime.js", import.meta.url).href,
)};\n`;

/** Directory (inside the project) that holds per-build temp files */
const TEMP_DIR = ".ono";

let buildCounter = 0;

/**
 * Bundle an entry file into a single ES module source string
 * @param {string} entryFile - Absolute path to the entry file
 * @returns {Promise<string>} Bundled module source
 */
export async function compileBundle(entryFile) {
  const { code, entryExports, externalBindings } = await bundle({
    entry: entryFile,
    resolve: (specifier, fromId) => resolve(dirname(fromId), specifier),
    load: async (id) => {
      let source;
      try {
        source = await readFile(id, "utf-8");
      } catch (error) {
        throw new Error(`Cannot read file: ${id}\n${error.message}`);
      }
      return transformJSX(source, id);
    },
  });

  // Provide h/Fragment unless a page pulls in the runtime itself
  const header =
    externalBindings.has("h") || externalBindings.has("Fragment") ? "" : JSX_RUNTIME_IMPORT;

  // Re-export the entry's exports so the bundle behaves like the entry module
  const footer = entryExports
    .map((name) =>
      name === "default"
        ? "export default __ono_entry.default;"
        : `export const ${name} = __ono_entry[${JSON.stringify(name)}];`,
    )
    .join("\n");

  return `${header}${code}\n${footer}\n`;
}

/**
 * Bundle a JSX entry file (with its local imports) and import it.
 * A unique temp file per build doubles as ESM cache-busting for rebuilds.
 * @param {string} entryFile - Path to the entry file
 * @returns {Promise<any>} The imported module namespace
 */
export async function importJSXModule(entryFile) {
  const resolvedEntry = resolve(process.cwd(), entryFile);
  const code = await compileBundle(resolvedEntry);

  const tempFile = join(process.cwd(), TEMP_DIR, `build-${process.pid}-${buildCounter++}.js`);
  await mkdir(dirname(tempFile), { recursive: true });
  await writeFile(tempFile, code);
  try {
    return await import(pathToFileURL(tempFile).href);
  } finally {
    await rm(tempFile, { force: true });
  }
}

/**
 * Build a single JSX file
 * @param {string} inputFile - Path to the JSX file
 * @param {Object} options - Build options
 * @param {string} [options.outputDir] - Output directory
 * @param {string} [options.inputRoot] - Root directory the page paths are relative to
 * @param {boolean} [options.silent] - Suppress console output
 * @returns {Promise<{outputPath: string, html: string}>}
 */
export async function buildFile(inputFile, options = {}) {
  const { outputDir = DIRS.OUTPUT, inputRoot, silent = false } = options;

  const outDir = resolve(process.cwd(), outputDir);
  const resolvedInput = resolve(process.cwd(), inputFile);

  const module = await importJSXModule(resolvedInput);

  const App = module.default;
  if (!App) {
    throw new Error(`No default export found in ${inputFile}`);
  }

  let vnode = typeof App === "function" ? App({}) : App;
  if (vnode instanceof Promise) {
    vnode = await vnode;
  }

  const html = renderToString(vnode);

  // Determine output path, preserving directory structure relative to inputRoot
  const relPath = inputRoot
    ? relative(resolve(process.cwd(), inputRoot), resolvedInput)
    : basename(resolvedInput);
  const outputPath = join(outDir, relPath.replace(/\.(jsx|tsx)$/, ".html"));

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html);

  if (!silent) {
    console.log(`✓ Built successfully: ${relative(process.cwd(), outputPath)}`);
  }

  return { outputPath, html };
}

/**
 * Build multiple JSX files
 * @param {string} inputPattern - Input directory path
 * @param {Object} options - Build options
 * @param {string} [options.outputDir] - Output directory
 * @param {boolean} [options.silent] - Suppress console output
 * @returns {Promise<Array<{outputPath: string, html: string}>>}
 */
export async function buildFiles(inputPattern, options = {}) {
  const { outputDir = DIRS.OUTPUT, silent = false } = options;

  const pagesDir = resolve(process.cwd(), inputPattern);
  const files = await getFilesRecursively(pagesDir, isJSXFile);

  if (!silent) {
    console.log(`Found ${files.length} page(s) in ${inputPattern}/\n`);
    for (const file of files) {
      console.log(`Building ${relative(process.cwd(), file)}...`);
    }
  }

  return Promise.all(
    files.map((file) =>
      buildFile(file, { outputDir, inputRoot: pagesDir, silent: true }),
    ),
  );
}

/**
 * Generate UnoCSS file from the built HTML.
 * Loads uno.config.js from the project root unless a config is passed in.
 * @param {Object} options - Generation options
 * @param {string} [options.outputDir] - Output directory
 * @param {Object} [options.config] - UnoCSS configuration override
 * @param {boolean} [options.silent] - Suppress console output
 * @returns {Promise<string|null>} CSS file path or null
 */
export async function generateUnoCSS(options = {}) {
  const { outputDir = DIRS.OUTPUT, silent = false } = options;
  const config = options.config ?? (await loadUnoConfig());

  const outDir = resolve(process.cwd(), outputDir);

  // Scan all HTML files
  const htmlFiles = await getFilesRecursively(outDir, isHTMLFile);

  if (htmlFiles.length === 0) {
    return null;
  }

  // Generate CSS from HTML files
  const css = await generateCSSFromFiles(htmlFiles, config);

  if (!css) {
    return null;
  }

  const cssPath = join(outDir, "uno.css");
  await writeFile(cssPath, css);

  if (!silent) {
    console.log(`\n⚡ Generated UnoCSS: ${relative(process.cwd(), cssPath)}`);
  }

  return cssPath;
}
