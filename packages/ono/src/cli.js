#!/usr/bin/env node

/**
 * Ono CLI - Minimalist SSG framework
 */
import { resolve } from "node:path";
import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { loadUnoConfig } from "./unocss.js";
import { createDevServer } from "./server.js";
import { buildFile, buildFiles, generateUnoCSS } from "./builder.js";
import { watchFile, watchFiles, createWebSocketServer } from "./watcher.js";

const args = process.argv.slice(2);
const command = args[0];

async function copyPublicFiles(outputDir = "dist") {
  const publicDir = resolve(process.cwd(), "public");
  const outDir = resolve(process.cwd(), outputDir);

  if (!existsSync(publicDir)) {
    return;
  }

  async function copyRecursive(src, dest) {
    const entries = await readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      if (entry.isDirectory()) {
        await mkdir(destPath, { recursive: true });
        await copyRecursive(srcPath, destPath);
      } else {
        await mkdir(dest, { recursive: true });
        await copyFile(srcPath, destPath);
      }
    }
  }

  await copyRecursive(publicDir, outDir);
}

async function runBuildCommand() {
  // Check for help flag
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: ono build [input] [options]

Build JSX files to static HTML

Arguments:
  input                  File or directory to build (default: pages)

Options:
  --output <dir>         Output directory (default: dist)
  --help                 Show this help message

Examples:
  ono build              Build all pages in pages/ directory
  ono build pages/index.jsx   Build a single file
  ono build --output build   Build to build/ directory
`);
    process.exit(0);
  }

  // Filter out options to get the input argument
  const nonOptionArgs = args.slice(1).filter(arg => !arg.startsWith("--"));
  const input = nonOptionArgs[0] || "pages";
  const outputDir = args.includes("--output")
    ? args[args.indexOf("--output") + 1]
    : "dist";

  const unocssConfig = await loadUnoConfig();

  // Check if input is a directory or a file
  const inputPath = resolve(process.cwd(), input);
  const inputStat = await stat(inputPath);

  if (inputStat.isDirectory()) {
    // Build all files in directory
    await buildFiles(input, { outputDir, unocssConfig });
  } else {
    // Build single file
    await buildFile(input, { outputDir, unocssConfig });
  }

  // Copy public files
  await copyPublicFiles(outputDir);

  // Generate UnoCSS
  await generateUnoCSS({ outputDir, unocssConfig });

  console.log("\n✨ Build complete!");
}



async function runDevCommand() {
  const input = args[1] || "pages";
  const port = args.includes("--port")
    ? parseInt(args[args.indexOf("--port") + 1])
    : 3000;
  const outputDir = args.includes("--output")
    ? args[args.indexOf("--output") + 1]
    : "dist";

  const unocssConfig = await loadUnoConfig();

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
  if (inputStat.isDirectory()) {
    await watchFiles(input, {
      outputDir,
      unocssConfig,
      wss,
      onRebuild: async () => {
        await copyPublicFiles(outputDir);
      },
    });
  } else {
    await watchFile(input, {
      outputDir,
      unocssConfig,
      wss,
      onRebuild: async () => {
        await copyPublicFiles(outputDir);
      },
    });
  }

  console.log(`\n🚀 Server running at http://localhost:${serverPort}`);
  console.log(`📝 Serving: ${input}/ → ${outputDir}/`);
}



function showHelp() {
  console.log(`
Ono - Minimalist SSG Framework

Usage:
  ono <command> [options]

Commands:
  build [input]          Build JSX files to static HTML
                         input: file or directory (default: pages)

  dev [input]            Build, watch, and serve with live reload
                         input: file or directory (default: pages)

Options:
  --output <dir>         Output directory (default: dist)
  --port <number>        Server port (default: 3000)
  --help                 Show this help message

Examples:
  ono build              Build all pages in pages/ directory
  ono build pages/index.jsx   Build a single file
  ono dev                Start dev server with live reload
  ono dev --port 8080    Start dev server on port 8080
`);
}

// Main CLI handler
(async () => {
  try {
    if (!command || command === "--help" || command === "-h") {
      showHelp();
      process.exit(0);
    }

    switch (command) {
      case "build":
        await runBuildCommand();
        break;

      case "dev":
        await runDevCommand();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.error('Run "ono --help" for usage information');
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error.message);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
})();
