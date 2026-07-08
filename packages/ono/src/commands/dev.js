/**
 * Dev command for Ono CLI
 */
import { resolve, relative } from "node:path";
import { stat } from "node:fs/promises";
import { createDevServer } from "../server.js";
import { buildFile, buildFiles, generateUnoCSS } from "../builder.js";
import { watchFile, watchFiles, createWebSocketServer } from "../watcher.js";
import { copyPublicFiles, initializeBarrels, parseCommandArgs } from "./build.js";

/**
 * Run the dev command
 * @param {string[]} args - Command line arguments (after 'dev')
 * @returns {Promise<void>}
 */
export async function runDevCommand(args) {
  const { input, port, outputDir } = parseCommandArgs(args);

  // Generate barrel files if barrels directory exists
  await initializeBarrels();

  const inputPath = resolve(process.cwd(), input);
  const inputStat = await stat(inputPath);
  const isDirectory = inputStat.isDirectory();

  const initialBuild = isDirectory
    ? await buildFiles(input, { outputDir })
    : [await buildFile(input, { outputDir })];

  await copyPublicFiles(outputDir);
  await generateUnoCSS({ outputDir });

  const { wss } = createWebSocketServer();

  const mode = isDirectory ? "pages" : "single";
  const indexFile = isDirectory
    ? "index.html"
    : relative(outputDir, initialBuild[0].outputPath);

  const { port: serverPort } = await createDevServer({
    outputDir,
    port,
    mode,
    indexFile,
  });

  const watchOpts = {
    outputDir,
    wss,
    onRebuild: () => copyPublicFiles(outputDir),
  };
  await (isDirectory ? watchFiles(input, watchOpts) : watchFile(input, watchOpts));

  console.log(`\n🚀 Server running at http://localhost:${serverPort}`);
  console.log(`📝 Serving: ${input}/ → ${outputDir}/`);
}
