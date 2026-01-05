/**
 * Dev command for Ono CLI
 */
import { resolve } from "node:path";
import { stat } from "node:fs/promises";
import { relative } from "node:path";
import { loadUnoConfig } from "../unocss.js";
import { createDevServer } from "../server.js";
import { buildFile, buildFiles, generateUnoCSS } from "../builder.js";
import { watchFile, watchFiles, createWebSocketServer } from "../watcher.js";
import { copyPublicFiles, initializeBarrels } from "./build.js";
import { DIRS, PORTS } from "../constants.js";

/**
 * Parse dev command arguments
 * @param {string[]} args - Command line arguments
 * @returns {{ input: string, port: number, outputDir: string }}
 */
export function parseDevArgs(args) {
  const nonOptionArgs = args.filter((arg) => !arg.startsWith("--"));
  const input = nonOptionArgs[0] || DIRS.PAGES;
  const port = args.includes("--port")
    ? parseInt(args[args.indexOf("--port") + 1])
    : PORTS.SERVER;
  const outputDir = args.includes("--output")
    ? args[args.indexOf("--output") + 1]
    : DIRS.OUTPUT;

  return { input, port, outputDir };
}

/**
 * Run the dev command
 * @param {string[]} args - Command line arguments (after 'dev')
 * @returns {Promise<void>}
 */
export async function runDevCommand(args) {
  const { input, port, outputDir } = parseDevArgs(args);

  const unocssConfig = await loadUnoConfig();

  // Generate barrel files if barrels directory exists
  await initializeBarrels();

  // Initial build
  const inputPath = resolve(process.cwd(), input);
  const inputStat = await stat(inputPath);

  if (inputStat.isDirectory()) {
    await buildFiles(input, { outputDir, unocssConfig });
  } else {
    await buildFile(input, { outputDir, unocssConfig });
  }

  await copyPublicFiles(outputDir);
  await generateUnoCSS({ outputDir, unocssConfig });

  // Create WebSocket server for live reload
  const { wss, port: wsPort } = createWebSocketServer();

  // Start dev server
  const mode = inputStat.isDirectory() ? "pages" : "single";
  const indexFile = inputStat.isFile()
    ? relative(
        outputDir,
        (await buildFile(input, { outputDir, unocssConfig, silent: true }))
          .outputPath
      )
    : "index.html";

  let serverPort = port;
  try {
    const { server, app, port: actualPort } = await createDevServer({
      outputDir,
      port,
      mode,
      indexFile,
    });
    serverPort = actualPort;
  } catch (error) {
    if (error.code === "EADDRINUSE") {
      serverPort = port + 1;
      console.log(
        `ℹ️  Port ${port} is busy, using port ${serverPort} instead`
      );
      await createDevServer({
        outputDir,
        port: serverPort,
        mode,
        indexFile,
      });
    } else {
      throw error;
    }
  }

  // Watch for changes
  const rebuildCallback = async () => {
    await copyPublicFiles(outputDir);
  };

  if (inputStat.isDirectory()) {
    await watchFiles(input, {
      outputDir,
      unocssConfig,
      wss,
      onRebuild: rebuildCallback,
    });
  } else {
    await watchFile(input, {
      outputDir,
      unocssConfig,
      wss,
      onRebuild: rebuildCallback,
    });
  }

  console.log(`\n🚀 Server running at http://localhost:${serverPort}`);
  console.log(`📝 Serving: ${input}/ → ${outputDir}/`);
}
