/**
 * Build utilities for Ono SSG
 */
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { resolve, join, dirname, basename, relative, extname } from "node:path";
import { transformJSX } from "./transformer.js";
import { renderToString } from "./renderer.js";
import { generateCSSFromFiles } from "./unocss.js";

/**
 * Check if a route is dynamic (contains [param])
 */
export function isDynamicRoute(filePath) {
  return /\[([^\]]+)\]/.test(filePath);
}

/**
 * Build a single JSX file
 */
export async function buildFile(inputFile, options = {}) {
  const { outputDir = "dist", unocssConfig, silent = false } = options;

  const outDir = resolve(process.cwd(), outputDir);
  const resolvedInput = resolve(process.cwd(), inputFile);

  // Read and transform JSX
  const jsx = await readFile(resolvedInput, "utf-8");
  const transformed = await transformJSX(jsx, resolvedInput);

  // Write transformed JS temporarily
  const tempFile = join(outDir, `_temp_${Date.now()}.js`);
  await mkdir(dirname(tempFile), { recursive: true });
  await writeFile(tempFile, transformed);

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
  await import("node:fs/promises").then((fs) => fs.unlink(tempFile).catch(() => {}));

  return { outputPath, html };
}

/**
 * Build a dynamic route (e.g., [slug].jsx)
 */
export async function buildDynamicRoute(inputFile, options = {}) {
  const { outputDir = "dist", silent = false } = options;

  const outDir = resolve(process.cwd(), outputDir);
  const resolvedInput = resolve(process.cwd(), inputFile);

  // Read and transform JSX
  const jsx = await readFile(resolvedInput, "utf-8");
  const transformed = await transformJSX(jsx, resolvedInput);

  // Write transformed JS temporarily
  const tempFile = join(outDir, `_temp_${Date.now()}.js`);
  await mkdir(dirname(tempFile), { recursive: true });
  await writeFile(tempFile, transformed);

  // Import module
  const moduleUrl = new URL(`file://${tempFile}?t=${Date.now()}`);
  const module = await import(moduleUrl.href);

  if (!module.getStaticPaths) {
    throw new Error(
      `Dynamic route ${inputFile} must export a getStaticPaths function`
    );
  }

  const pathsData = await module.getStaticPaths();
  const paths = Array.isArray(pathsData) ? pathsData : pathsData.paths || [];

  const App = module.default;
  if (!App) {
    throw new Error(`No default export found in ${inputFile}`);
  }

  const outputs = [];

  for (const pathData of paths) {
    const params = pathData.params || {};

    let vnode = typeof App === "function" ? App({ params }) : App;
    if (vnode instanceof Promise) {
      vnode = await vnode;
    }

    const html = renderToString(vnode);

    // Determine output path from params
    const routeDir = dirname(relative(join(process.cwd(), "pages"), resolvedInput));
    const fileName = basename(resolvedInput, ".jsx");

    // Replace [param] with actual value
    let outputPath = fileName;
    for (const [key, value] of Object.entries(params)) {
      outputPath = outputPath.replace(`[${key}]`, value);
    }

    const fullOutputPath = join(
      outDir,
      routeDir === "." ? "" : routeDir,
      `${outputPath}.html`
    );

    await mkdir(dirname(fullOutputPath), { recursive: true });
    await writeFile(fullOutputPath, html);

    outputs.push({ outputPath: fullOutputPath, html, params });

    if (!silent) {
      console.log(`  ✓ ${relative(process.cwd(), fullOutputPath)}`);
    }
  }

  // Clean up temp file
  await import("node:fs/promises").then((fs) => fs.unlink(tempFile).catch(() => {}));

  return outputs;
}

/**
 * Build multiple JSX files
 */
export async function buildFiles(inputPattern, options = {}) {
  const { outputDir = "dist", unocssConfig, silent = false } = options;

  const pagesDir = resolve(process.cwd(), inputPattern);
  const files = await getAllJSXFiles(pagesDir);

  if (!silent) {
    console.log(`Found ${files.length} page(s) in ${inputPattern}/\n`);
  }

  const results = [];

  for (const file of files) {
    if (isDynamicRoute(file)) {
      if (!silent) {
        const relativePath = relative(process.cwd(), file);
        const pathsData = await getDynamicRoutePaths(file);
        const count = Array.isArray(pathsData) ? pathsData.length : pathsData.paths?.length || 0;
        console.log(`Building dynamic route ${relativePath} (${count} pages)...`);
      }
      const outputs = await buildDynamicRoute(file, { outputDir, silent: true });
      results.push(...outputs);
    } else {
      if (!silent) {
        console.log(`Building ${relative(process.cwd(), file)}...`);
      }
      const result = await buildFile(file, { outputDir, unocssConfig, silent: true });
      results.push(result);
    }
  }

  return results;
}

/**
 * Get all JSX files recursively
 */
async function getAllJSXFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await getAllJSXFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile() && entry.name.endsWith(".jsx")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Helper to get paths from a dynamic route
 */
/**
 * Helper to get paths from a dynamic route
 */
export async function getDynamicRoutePaths(file) {
  const outDir = resolve(process.cwd(), "dist");
  const jsx = await readFile(file, "utf-8");
  const transformed = await transformJSX(jsx, file);

  const tempFile = join(outDir, `_temp_paths_${Date.now()}.js`);
  await mkdir(dirname(tempFile), { recursive: true });
  await writeFile(tempFile, transformed);

  const moduleUrl = new URL(`file://${tempFile}?t=${Date.now()}`);
  const module = await import(moduleUrl.href);

  const pathsData = module.getStaticPaths ? await module.getStaticPaths() : [];

  await import("node:fs/promises").then((fs) => fs.unlink(tempFile).catch(() => {}));

  return pathsData;
}

/**
 * Generate UnoCSS file
 */
export async function generateUnoCSS(options = {}) {
  const { outputDir = "dist", unocssConfig, silent = false } = options;

  const outDir = resolve(process.cwd(), outputDir);

  // Scan all HTML files
  const htmlFiles = await getAllHTMLFiles(outDir);

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

/**
 * Get all HTML files recursively
 */
async function getAllHTMLFiles(dir) {
  const files = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await getAllHTMLFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory might not exist yet
  }

  return files;
}
