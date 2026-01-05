/**
 * File watcher utilities for Ono SSG
 */
import { watch } from "node:fs";
import { resolve, join, relative } from "node:path";
import { WebSocketServer } from "ws";
import { buildFile, buildFiles, generateUnoCSS } from "./builder.js";
import { generateBarrel } from "./barrels.js";
import { isJSXFile } from "./utils.js";
import { PORTS, TIMING, DIRS } from "./constants.js";

/**
 * Create a WebSocket server for live reload
 * @param {number} [port] - Port number for WebSocket server
 * @returns {{wss: WebSocketServer, port: number}}
 */
export function createWebSocketServer(port = PORTS.WEBSOCKET) {
  let wss;
  let actualPort = port;

  try {
    wss = new WebSocketServer({ port });
  } catch (error) {
    if (error.code === "EADDRINUSE") {
      actualPort = port + 1;
      console.log(`ℹ️  WebSocket port ${port} is busy, using port ${actualPort} instead`);
      wss = new WebSocketServer({ port: actualPort });
    } else {
      throw error;
    }
  }

  return { wss, port: actualPort };
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

  const pagesDir = resolve(process.cwd(), inputPattern);
  const publicDir = resolve(process.cwd(), DIRS.PUBLIC);

  console.log(`👀 Watching for changes in ${inputPattern}/ and public/...`);

  // Debounce rebuilds
  let rebuildTimeout;
  const debouncedRebuild = async (file) => {
    clearTimeout(rebuildTimeout);
    rebuildTimeout = setTimeout(async () => {
      try {
        console.log(`\n📝 File changed: ${relative(process.cwd(), file)}`);
        console.log("🔄 Rebuilding...\n");

        await buildFile(file, { outputDir, unocssConfig, silent: false });
        await generateUnoCSS({ outputDir, unocssConfig, silent: false });

        if (onRebuild) {
          await onRebuild();
        }

        if (wss) {
          broadcastReload(wss);
        }
      } catch (error) {
        console.error("❌ Build error:", error.message);
      }
    }, TIMING.DEBOUNCE_MS);
  };

  // Watch pages directory
  const watcher = watch(pagesDir, { recursive: true }, async (eventType, filename) => {
    if (filename && isJSXFile(filename)) {
      const filePath = join(pagesDir, filename);
      await debouncedRebuild(filePath);
    }
  });

  // Watch public directory if it exists
  let publicWatcher;
  try {
    publicWatcher = watch(publicDir, { recursive: true }, async (eventType, filename) => {
      if (filename) {
        console.log(`\n📝 Public file changed: ${filename}`);
        console.log("🔄 Rebuilding...\n");

        // Rebuild all files to update references
        await buildFiles(inputPattern, { outputDir, unocssConfig, silent: false });
        await generateUnoCSS({ outputDir, unocssConfig, silent: false });

        if (onRebuild) {
          await onRebuild();
        }

        if (wss) {
          broadcastReload(wss);
        }
      }
    });
  } catch (error) {
    // Public directory might not exist
  }

  // Watch barrels directory if it exists
  const barrelsDir = resolve(process.cwd(), DIRS.BARRELS);
  let barrelsWatcher;
  try {
    barrelsWatcher = watch(barrelsDir, { recursive: true }, async (eventType, filename) => {
      if (filename && isJSXFile(filename)) {
        // Extract barrel name from path (e.g., "blog/post1.tsx" -> "blog")
        const barrelName = filename.split("/")[0];
        const barrelDir = join(barrelsDir, barrelName);

        console.log(`\n📝 Barrel file changed: ${filename}`);
        console.log("🔄 Regenerating barrel...\n");

        try {
          await generateBarrel(barrelDir);

          // Rebuild pages that might depend on this barrel
          await buildFiles(inputPattern, { outputDir, unocssConfig, silent: false });
          await generateUnoCSS({ outputDir, unocssConfig, silent: false });

          if (onRebuild) {
            await onRebuild();
          }

          if (wss) {
            broadcastReload(wss);
          }
        } catch (error) {
          console.error("❌ Barrel generation error:", error.message);
        }
      }
    });
  } catch (error) {
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

  const resolvedInput = resolve(process.cwd(), inputFile);

  console.log(`👀 Watching for changes in ${inputFile}...`);

  // Debounce rebuilds
  let rebuildTimeout;
  const debouncedRebuild = async () => {
    clearTimeout(rebuildTimeout);
    rebuildTimeout = setTimeout(async () => {
      try {
        console.log(`\n📝 File changed: ${inputFile}`);
        console.log("🔄 Rebuilding...\n");

        await buildFile(resolvedInput, { outputDir, unocssConfig, silent: false });
        await generateUnoCSS({ outputDir, unocssConfig, silent: false });

        if (onRebuild) {
          await onRebuild();
        }

        if (wss) {
          broadcastReload(wss);
        }
      } catch (error) {
        console.error("❌ Build error:", error.message);
      }
    }, TIMING.DEBOUNCE_MS);
  };

  const watcher = watch(resolvedInput, debouncedRebuild);

  return { watcher };
}
