/**
 * Build utilities for Ono SSG
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join, dirname, basename, relative } from "node:path";
import { renderToString } from "./renderer.js";
import { generateCSSFromFiles, loadUnoConfig } from "./unocss.js";
import { bundle } from "./bundler.js";
import { cleanupTempFile, getFilesRecursively, isJSXFile, isHTMLFile } from "./utils.js";
import { DIRS } from "./constants.js";

const JSX_RUNTIME_URL = new URL("./jsx-runtime.js", import.meta.url);
let runtimeSourceCache;
let tempFileCounter = 0;

/**
 * Get the JSX runtime source with export keywords stripped, ready to be
 * injected into compiled pages. jsx-runtime.js is the single source of truth.
 * @returns {Promise<string>} Runtime source code
 */
export async function getInlineRuntime() {
  if (!runtimeSourceCache) {
    const source = await readFile(JSX_RUNTIME_URL, "utf-8");
    runtimeSourceCache = source.replace(/^export /gm, "");
  }
  return runtimeSourceCache;
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

  // Bundle the file with all its dependencies
  const bundledCode = await bundle(resolvedInput);

  // Inject the JSX runtime
  const codeWithRuntime = (await getInlineRuntime()) + "\n" + bundledCode;

  // Write transformed JS temporarily
  const tempFile = join(outDir, `_temp_${Date.now()}_${tempFileCounter++}.js`);
  await mkdir(dirname(tempFile), { recursive: true });
  await writeFile(tempFile, codeWithRuntime);

  // Import and render
  const moduleUrl = new URL(`file://${tempFile}?t=${Date.now()}`);
  const module = await import(moduleUrl.href);

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

  // Clean up temp file
  await cleanupTempFile(tempFile);

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
