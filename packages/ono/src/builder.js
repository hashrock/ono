/**
 * Build utilities for Ono SSG
 */
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, join, dirname, basename, relative } from "node:path";
import { renderToString } from "./renderer.js";
import { generateCSSFromFiles } from "./unocss.js";
import { bundle } from "./bundler.js";
import { cleanupTempFile, getFilesRecursively, isJSXFile, isHTMLFile } from "./utils.js";
import { INLINE_JSX_RUNTIME, DIRS } from "./constants.js";

/**
 * Build a single JSX file
 * @param {string} inputFile - Path to the JSX file
 * @param {Object} options - Build options
 * @param {string} [options.outputDir] - Output directory
 * @param {Object} [options.unocssConfig] - UnoCSS configuration
 * @param {boolean} [options.silent] - Suppress console output
 * @returns {Promise<{outputPath: string, html: string}>}
 */
export async function buildFile(inputFile, options = {}) {
  const { outputDir = DIRS.OUTPUT, unocssConfig, silent = false } = options;

  const outDir = resolve(process.cwd(), outputDir);
  const resolvedInput = resolve(process.cwd(), inputFile);

  // Bundle the file with all its dependencies
  const bundledCode = await bundle(resolvedInput);

  // Add inline JSX runtime
  const codeWithRuntime = INLINE_JSX_RUNTIME + "\n" + bundledCode;

  // Write transformed JS temporarily
  const tempFile = join(outDir, `_temp_${Date.now()}.js`);
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

  // Determine output path
  const baseName = basename(inputFile, ".jsx");
  const outputFileName = baseName === "index" ? "index.html" : `${baseName}.html`;
  const outputPath = join(outDir, outputFileName);

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
 * @param {Object} [options.unocssConfig] - UnoCSS configuration
 * @param {boolean} [options.silent] - Suppress console output
 * @returns {Promise<Array<{outputPath: string, html: string}>>}
 */
export async function buildFiles(inputPattern, options = {}) {
  const { outputDir = DIRS.OUTPUT, unocssConfig, silent = false } = options;

  const pagesDir = resolve(process.cwd(), inputPattern);
  const files = await getFilesRecursively(pagesDir, isJSXFile);

  if (!silent) {
    console.log(`Found ${files.length} page(s) in ${inputPattern}/\n`);
  }

  const results = [];

  for (const file of files) {
    if (!silent) {
      console.log(`Building ${relative(process.cwd(), file)}...`);
    }
    const result = await buildFile(file, { outputDir, unocssConfig, silent: true });
    results.push(result);
  }

  return results;
}

/**
 * Generate UnoCSS file
 * @param {Object} options - Generation options
 * @param {string} [options.outputDir] - Output directory
 * @param {Object} [options.unocssConfig] - UnoCSS configuration
 * @param {boolean} [options.silent] - Suppress console output
 * @returns {Promise<string|null>} CSS file path or null
 */
export async function generateUnoCSS(options = {}) {
  const { outputDir = DIRS.OUTPUT, unocssConfig, silent = false } = options;

  const outDir = resolve(process.cwd(), outputDir);

  // Scan all HTML files
  const htmlFiles = await getFilesRecursively(outDir, isHTMLFile);

  if (htmlFiles.length === 0) {
    return null;
  }

  // Generate CSS from HTML files
  const css = await generateCSSFromFiles(htmlFiles, unocssConfig);

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
