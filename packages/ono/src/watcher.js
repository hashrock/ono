/**
 * File watcher utilities for Ono SSG
 */
import { watch } from "node:fs";
import { resolve, join, relative } from "node:path";
import { WebSocketServer } from "ws";
import { buildFile, buildFiles, generateUnoCSS } from "./builder.js";
import { generateBarrel } from "./barrels.js";
import { isJSXFile } from "./utils.js";
import { PORTS, TIMING, DIRS, ERROR_CODES } from "./constants.js";

/**
 * Create a WebSocket server for live reload
 * @param {number} [port] - Port number for WebSocket server
 * @returns {{wss: WebSocketServer, port: number}}
 */
export function createWebSocketServer(port = PORTS.WEBSOCKET) {
  try {
    return { wss: new WebSocketServer({ port }), port };
  } catch (error) {
    if (error.code !== ERROR_CODES.PORT_IN_USE) throw error;
    const actualPort = port + 1;
    console.log(`ℹ️  WebSocket port ${port} is busy, using port ${actualPort} instead`);
    return { wss: new WebSocketServer({ port: actualPort }), port: actualPort };
  }
}

/**
 * Broadcast reload message to all connected clients
 * @param {WebSocketServer} wss - WebSocket server instance
 */
export function broadcastReload(wss) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send("reload");
    }
  });
}

/**
 * Create a debounced async runner that logs errors instead of throwing.
 */
function debounce(fn, ms = TIMING.DEBOUNCE_MS) {
  let timeout;
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
 * Notify clients and trigger onRebuild callback.
 */
async function afterRebuild({ onRebuild, wss }) {
  if (onRebuild) await onRebuild();
  if (wss) broadcastReload(wss);
}

/**
 * Watch for file changes and rebuild
 * @param {string} inputPattern - Input directory to watch
 * @param {Object} options - Watch options
 * @param {string} [options.outputDir] - Output directory
 * @param {Object} [options.unocssConfig] - UnoCSS configuration
 * @param {Function} [options.onRebuild] - Callback after rebuild
 * @param {WebSocketServer} [options.wss] - WebSocket server for live reload
 * @returns {Promise<{watcher: any, publicWatcher?: any, barrelsWatcher?: any}>}
 */
export async function watchFiles(inputPattern, options = {}) {
  const { outputDir = DIRS.OUTPUT, unocssConfig, onRebuild, wss } = options;
  const buildOpts = { outputDir, unocssConfig, silent: false };

  const pagesDir = resolve(process.cwd(), inputPattern);
  const publicDir = resolve(process.cwd(), DIRS.PUBLIC);
  const barrelsDir = resolve(process.cwd(), DIRS.BARRELS);

  console.log(`👀 Watching for changes in ${inputPattern}/ and public/...`);

  const rebuildPage = debounce(async (file) => {
    console.log(`\n📝 File changed: ${relative(process.cwd(), file)}`);
    console.log("🔄 Rebuilding...\n");
    await buildFile(file, buildOpts);
    await generateUnoCSS(buildOpts);
    await afterRebuild({ onRebuild, wss });
  });

  const rebuildAll = debounce(async (reason) => {
    console.log(`\n📝 ${reason}`);
    console.log("🔄 Rebuilding...\n");
    await buildFiles(inputPattern, buildOpts);
    await generateUnoCSS(buildOpts);
    await afterRebuild({ onRebuild, wss });
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
    await generateUnoCSS(buildOpts);
    await afterRebuild({ onRebuild, wss });
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
 * @param {Object} [options.unocssConfig] - UnoCSS configuration
 * @param {Function} [options.onRebuild] - Callback after rebuild
 * @param {WebSocketServer} [options.wss] - WebSocket server for live reload
 * @returns {Promise<{watcher: any}>}
 */
export async function watchFile(inputFile, options = {}) {
  const { outputDir = DIRS.OUTPUT, unocssConfig, onRebuild, wss } = options;
  const buildOpts = { outputDir, unocssConfig, silent: false };
  const resolvedInput = resolve(process.cwd(), inputFile);

  console.log(`👀 Watching for changes in ${inputFile}...`);

  const rebuild = debounce(async () => {
    console.log(`\n📝 File changed: ${inputFile}`);
    console.log("🔄 Rebuilding...\n");
    await buildFile(resolvedInput, buildOpts);
    await generateUnoCSS(buildOpts);
    await afterRebuild({ onRebuild, wss });
  });

  return { watcher: watch(resolvedInput, rebuild) };
}
