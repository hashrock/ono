/**
 * Build utilities for Ono SSG
 *
 * Pages are compiled file-by-file into a per-build temp directory that
 * mirrors the project layout, then the entry is imported with Node's own
 * module resolution. No bundling: evaluation order, cycles, and package
 * imports are all handled by Node.
 */
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { resolve, join, dirname, basename, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { renderToString } from "./renderer.js";
import { generateCSSFromFiles, loadUnoConfig } from "./unocss.js";
import { transformJSX } from "./transformer.js";
import { collectModules } from "./resolver.js";
import { getFilesRecursively, isJSXFile, isHTMLFile } from "./utils.js";
import { DIRS } from "./constants.js";

/** Import statement for the real JSX runtime, injected into compiled pages */
const JSX_RUNTIME_IMPORT = `import { h, Fragment } from ${JSON.stringify(
  new URL("./jsx-runtime.js", import.meta.url).href,
)};\n`;

/** Directory (inside the project) that holds per-build temp output */
const TEMP_DIR = ".ono";

let buildCounter = 0;

/**
 * Rewrite relative .jsx/.tsx/.ts import specifiers to .js so they resolve
 * against the compiled files in the temp directory.
 */
function rewriteRelativeImports(code) {
  return code.replace(
    /^((?:import|export)[^'"]*['"])(\.[^'"]+)\.(?:jsx|tsx|ts)(['"])/gm,
    (_match, head, base, tail) => `${head}${base}.js${tail}`,
  );
}

/** True when the file imports the runtime itself (skip injection) */
function importsOwnRuntime(source) {
  return /from\s+['"]@hashrock\/ono(?:\/jsx-runtime(?:\.js)?)?['"]/.test(source);
}

/**
 * Compile an entry file and its local imports into a fresh temp directory.
 * A unique directory per build doubles as ESM cache-busting for rebuilds.
 * @returns {Promise<{tempRoot: string, entryPath: string}>}
 */
async function compileToTemp(entryFile) {
  const cwd = process.cwd();
  const files = await collectModules(entryFile);
  const tempRoot = join(cwd, TEMP_DIR, `build-${process.pid}-${buildCounter++}`);

  let entryPath;
  for (const file of files) {
    const rel = relative(cwd, file);
    if (rel.startsWith("..")) {
      throw new Error(
        `Cannot compile ${file}: imports outside the project directory are not supported`,
      );
    }

    const source = await readFile(file, "utf-8");
    let code = rewriteRelativeImports(transformJSX(source, file));
    if (!importsOwnRuntime(source)) {
      code = JSX_RUNTIME_IMPORT + code;
    }

    const outPath = join(tempRoot, rel.replace(/\.(jsx|tsx|ts)$/, ".js"));
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, code);

    if (file === entryFile) {
      entryPath = outPath;
    }
  }

  return { tempRoot, entryPath };
}

/**
 * Compile a JSX entry file (with its local imports) and import it
 * @param {string} entryFile - Path to the entry file
 * @returns {Promise<object>} The imported module namespace
 */
export async function importJSXModule(entryFile) {
  const resolvedEntry = resolve(process.cwd(), entryFile);
  const { tempRoot, entryPath } = await compileToTemp(resolvedEntry);
  try {
    return await import(pathToFileURL(entryPath).href);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
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
