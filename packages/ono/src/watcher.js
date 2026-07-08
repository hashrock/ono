/**
 * File watcher utilities for Ono SSG
 */
import { watch } from "node:fs";
import { resolve, join, relative } from "node:path";
import { buildFile, buildFiles, generateUnoCSS } from "./builder.js";
import { generateBarrel } from "./barrels.js";
import { isJSXFile } from "./utils.js";
import { TIMING, DIRS } from "./constants.js";

/**
 * Create a debounced async runner that logs errors instead of throwing.
 * @param {(...args: any[]) => Promise<void> | void} fn
 * @param {number} [ms]
 */
function debounce(fn, ms = TIMING.DEBOUNCE_MS) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timeout;
  /** @param {...any} args */
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      try {
        await fn(...args);
      } catch (error) {
        console.error("❌ Build error:", error.message);
      }
    }, ms);
  };
}

/**
 * Trigger onRebuild callback and browser reload.
 * @param {{ onRebuild?: Function, reload?: Function }} opts
 */
async function afterRebuild({ onRebuild, reload }) {
  if (onRebuild) await onRebuild();
  if (reload) reload();
}

/**
 * Watch for file changes and rebuild
 * @param {string} inputPattern - Input directory to watch
 * @param {Object} options - Watch options
 * @param {string} [options.outputDir] - Output directory
 * @param {Function} [options.onRebuild] - Callback after rebuild
 * @param {Function} [options.reload] - Live-reload broadcast from the dev server
 * @returns {Promise<{watcher: any, publicWatcher?: any, barrelsWatcher?: any}>}
 */
export async function watchFiles(inputPattern, options = {}) {
  const { outputDir = DIRS.OUTPUT, onRebuild, reload } = options;

  const pagesDir = resolve(process.cwd(), inputPattern);
  const buildOpts = { outputDir, inputRoot: pagesDir, silent: false };
  const publicDir = resolve(process.cwd(), DIRS.PUBLIC);
  const barrelsDir = resolve(process.cwd(), DIRS.BARRELS);

  console.log(`👀 Watching for changes in ${inputPattern}/ and public/...`);

  const rebuildPage = debounce(async (file) => {
    console.log(`\n📝 File changed: ${relative(process.cwd(), file)}`);
    console.log("🔄 Rebuilding...\n");
    await buildFile(file, buildOpts);
    await generateUnoCSS({ outputDir });
    await afterRebuild({ onRebuild, reload });
  });

  const rebuildAll = debounce(async (reason) => {
    console.log(`\n📝 ${reason}`);
    console.log("🔄 Rebuilding...\n");
    await buildFiles(inputPattern, buildOpts);
    await generateUnoCSS({ outputDir });
    await afterRebuild({ onRebuild, reload });
  });

  const watcher = watch(pagesDir, { recursive: true }, (_eventType, filename) => {
    if (filename && isJSXFile(filename)) {
      rebuildPage(join(pagesDir, filename));
    }
  });

  let publicWatcher;
  try {
    publicWatcher = watch(publicDir, { recursive: true }, (_eventType, filename) => {
      if (filename) rebuildAll(`Public file changed: ${filename}`);
    });
  } catch {
    // Public directory might not exist
  }

  const regenerateBarrel = debounce(async (barrelDir, filename) => {
    console.log(`\n📝 Barrel file changed: ${filename}`);
    console.log("🔄 Regenerating barrel...\n");
    await generateBarrel(barrelDir);
    await buildFiles(inputPattern, buildOpts);
    await generateUnoCSS({ outputDir });
    await afterRebuild({ onRebuild, reload });
  });

  let barrelsWatcher;
  try {
    barrelsWatcher = watch(barrelsDir, { recursive: true }, (_eventType, filename) => {
      if (filename && isJSXFile(filename)) {
        const barrelName = filename.split("/")[0];
        regenerateBarrel(join(barrelsDir, barrelName), filename);
      }
    });
  } catch {
    // Barrels directory might not exist
  }

  return { watcher, publicWatcher, barrelsWatcher };
}

/**
 * Watch a single file for changes
 * @param {string} inputFile - Input file to watch
 * @param {Object} options - Watch options
 * @param {string} [options.outputDir] - Output directory
 * @param {Function} [options.onRebuild] - Callback after rebuild
 * @param {Function} [options.reload] - Live-reload broadcast from the dev server
 * @returns {Promise<{watcher: any}>}
 */
export async function watchFile(inputFile, options = {}) {
  const { outputDir = DIRS.OUTPUT, onRebuild, reload } = options;
  const buildOpts = { outputDir, silent: false };
  const resolvedInput = resolve(process.cwd(), inputFile);

  console.log(`👀 Watching for changes in ${inputFile}...`);

  const rebuild = debounce(async () => {
    console.log(`\n📝 File changed: ${inputFile}`);
    console.log("🔄 Rebuilding...\n");
    await buildFile(resolvedInput, buildOpts);
    await generateUnoCSS({ outputDir });
    await afterRebuild({ onRebuild, reload });
  });

  return { watcher: watch(resolvedInput, rebuild) };
}
