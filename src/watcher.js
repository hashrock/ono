/**
 * File watcher utilities for Ono SSG
 */
import { watch } from "node:fs";
import { resolve, join, relative, extname } from "node:path";
import { readdir } from "node:fs/promises";
import { WebSocketServer } from "ws";
import { buildFile, buildFiles, buildDynamicRoute, generateUnoCSS, isDynamicRoute, getDynamicRoutePaths } from "./builder.js";

/**
 * Create a WebSocket server for live reload
 */
export function createWebSocketServer(port = 35729) {
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
 */
export async function watchFiles(inputPattern, options = {}) {
  const { outputDir = "dist", unocssConfig, onRebuild, wss } = options;

  const pagesDir = resolve(process.cwd(), inputPattern);
  const publicDir = resolve(process.cwd(), "public");

  console.log(`👀 Watching for changes in ${inputPattern}/ and public/...`);

  // Debounce rebuilds
  let rebuildTimeout;
  const debouncedRebuild = async (file) => {
    clearTimeout(rebuildTimeout);
    rebuildTimeout = setTimeout(async () => {
      try {
        console.log(`\n📝 File changed: ${relative(process.cwd(), file)}`);
        console.log("🔄 Rebuilding...\n");

        if (isDynamicRoute(file)) {
          const relativePath = relative(process.cwd(), file);
          const pathsData = await getDynamicRoutePaths(file);
          const count = Array.isArray(pathsData) ? pathsData.length : pathsData.paths?.length || 0;
          console.log(`Building dynamic route ${relativePath} (${count} pages)...`);
          await buildDynamicRoute(file, { outputDir, silent: true });
        } else {
          await buildFile(file, { outputDir, unocssConfig, silent: false });
        }

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
    }, 100);
  };

  // Watch pages directory
  const watcher = watch(pagesDir, { recursive: true }, async (eventType, filename) => {
    if (filename && filename.endsWith(".jsx")) {
      const filePath = join(pagesDir, filename);
      await debouncedRebuild(filePath);
    }
  });

  // Watch public directory if it exists
  try {
    const publicWatcher = watch(publicDir, { recursive: true }, async (eventType, filename) => {
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

    return { watcher, publicWatcher };
  } catch (error) {
    // Public directory might not exist
    return { watcher };
  }
}

/**
 * Watch a single file for changes
 */
export async function watchFile(inputFile, options = {}) {
  const { outputDir = "dist", unocssConfig, onRebuild, wss } = options;

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

        if (isDynamicRoute(inputFile)) {
          await buildDynamicRoute(resolvedInput, { outputDir, silent: false });
        } else {
          await buildFile(resolvedInput, { outputDir, unocssConfig, silent: false });
        }

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
    }, 100);
  };

  const watcher = watch(resolvedInput, debouncedRebuild);

  return { watcher };
}
