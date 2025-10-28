#!/usr/bin/env node

/**
 * CLI Tool for mini-jsx
 */

import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import net from "node:net";
import { bundle } from "./bundler.js";
import { renderToString } from "./renderer.js";
import { WebSocketServer } from "ws";

/**
 * Find an available port starting from the given port
 * @param {number} startPort - Port to start searching from
 * @param {number} maxAttempts - Maximum number of ports to try
 * @returns {Promise<number>} Available port number
 */
async function findAvailablePort(startPort, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    try {
      await new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once("error", reject);
        server.once("listening", () => {
          server.close();
          resolve();
        });
        server.listen(port);
      });
      return port;
    } catch (err) {
      if (err.code !== "EADDRINUSE") {
        throw err;
      }
      // Port is in use, try next one
    }
  }
  throw new Error(`Could not find available port in range ${startPort}-${startPort + maxAttempts - 1}`);
}

/**
 * Parse command line arguments into options object
 * @param {string[]} args - Command line arguments
 * @returns {object} Parsed options
 */
function parseArgs(args) {
  const options = {
    _: [], // Positional arguments
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--watch" || arg === "-w") {
      options.watch = true;
    } else if (arg === "--port" || arg === "-p") {
      options.port = parseInt(args[++i]);
    } else if (arg === "--output" || arg === "-o") {
      options.output = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--version" || arg === "-v") {
      options.version = true;
    } else if (!arg.startsWith("-")) {
      options._.push(arg);
    }
  }

  return options;
}

/**
 * Discover all JSX files in the pages directory
 * @param {string} pagesDir - Path to pages directory
 * @returns {Promise<string[]>} Array of JSX file paths
 */
async function discoverPages(pagesDir) {
  const pages = [];

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".jsx")) {
        pages.push(fullPath);
      }
    }
  }

  try {
    await walk(pagesDir);
    return pages;
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Build a JSX file to HTML
 * @param {string} inputFile - Path to input JSX file
 * @param {object} options - Build options
 * @param {boolean} options.liveReload - Inject live reload script
 * @param {boolean} options.silent - Suppress console output
 * @param {number} options.wsPort - WebSocket port for live reload
 * @param {string} options.outputDir - Custom output directory
 * @param {string} options.pagesDir - Pages directory for relative path calculation
 * @returns {Promise<{outputPath: string, html: string}>}
 */
async function buildFile(inputFile, options = {}) {
  const { liveReload = false, silent = false, wsPort = 35729, outputDir = "dist", pagesDir = null } = options;
  const absolutePath = path.resolve(process.cwd(), inputFile);

  if (!silent) {
    console.log(`Building ${inputFile}...`);
  }

  // Bundle the JSX file
  const bundledCode = await bundle(absolutePath);

  // Create a temporary module to execute
  // We need to inject our runtime inline (no external dependencies)
  const codeWithRuntime = `
// Inline JSX Runtime - No external dependencies required
function flattenChildren(children) {
  const result = [];
  for (const child of children) {
    if (child === null || child === undefined || typeof child === 'boolean') {
      continue;
    }
    if (Array.isArray(child)) {
      result.push(...flattenChildren(child));
    } else {
      result.push(child);
    }
  }
  return result;
}

function h(tag, props, ...children) {
  return {
    tag,
    props: props || {},
    children: flattenChildren(children)
  };
}

${bundledCode}
`;

  // Write to temporary file
  const tmpFile = path.join(process.cwd(), ".mini-jsx-tmp.js");
  await fs.writeFile(tmpFile, codeWithRuntime);

  // Import and execute
  const moduleUrl = `${tmpFile}?t=${Date.now()}`;
  const module = await import(moduleUrl);
  const App = module.default;

  if (!App) {
    throw new Error("No default export found in entry file");
  }

  // Render to HTML
  const vnode = typeof App === "function" ? App({}) : App;
  let html = renderToString(vnode);

  // Inject live reload script if requested
  if (liveReload) {
    const liveReloadScript = `
<script>
(function() {
  const ws = new WebSocket('ws://localhost:${wsPort}');
  ws.onmessage = function(event) {
    if (event.data === 'reload') {
      console.log('Reloading...');
      window.location.reload();
    }
  };
  ws.onclose = function() {
    console.log('Live reload disconnected. Retrying...');
    setTimeout(function() { window.location.reload(); }, 1000);
  };
})();
</script>`;
    html = html.replace("</body>", `${liveReloadScript}\n</body>`);
  }

  // Add DOCTYPE
  const fullHtml = `<!DOCTYPE html>\n${html}`;

  // Output to specified directory
  const outDir = path.resolve(process.cwd(), outputDir);
  await fs.mkdir(outDir, { recursive: true });

  // Output file name - preserve directory structure if pagesDir is specified
  let outputPath;
  let relativeOutput;

  if (pagesDir) {
    // Preserve the directory structure from pages folder
    const pagesDirAbs = path.resolve(process.cwd(), pagesDir);
    const relativePath = path.relative(pagesDirAbs, absolutePath);
    const outputRelative = relativePath.replace(/\.jsx$/, ".html");
    outputPath = path.join(outDir, outputRelative);

    // Create subdirectories if needed
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    relativeOutput = path.relative(process.cwd(), outputPath);
  } else {
    // Single file mode - just use basename
    const inputBasename = path.basename(inputFile, ".jsx");
    const outputFilename = `${inputBasename}.html`;
    outputPath = path.join(outDir, outputFilename);
    relativeOutput = path.relative(process.cwd(), outputPath);
  }

  await fs.writeFile(outputPath, fullHtml);

  // Clean up temp file
  await fs.unlink(tmpFile);

  if (!silent) {
    console.log(`✓ Built successfully: ${relativeOutput}`);
  }

  return { outputPath, html: fullHtml };
}

async function main() {
  const args = process.argv.slice(2);
  const opts = parseArgs(args);

  // Show version
  if (opts.version) {
    const pkg = JSON.parse(
      await fs.readFile(new URL("../package.json", import.meta.url), "utf-8")
    );
    console.log(`mini-jsx v${pkg.version}`);
    process.exit(0);
  }

  // Show help
  if (args.length === 0 || opts.help) {
    console.log(`
Mini JSX - A lightweight JSX library for static site generation

Usage:
  mini-jsx build <file|dir> [options]  Build JSX file(s) to HTML
  mini-jsx dev <file|dir> [options]    Start dev server with live reload

Arguments:
  file                     Single JSX file to build/serve
  dir                      Pages directory (default: pages/)

Options:
  -w, --watch              Watch for changes and rebuild (build only)
  -p, --port <port>        Port number (default: 3000) (dev only)
  -o, --output <dir>       Output directory (default: dist)
  -h, --help               Show this help message
  -v, --version            Show version number

Examples:
  # Single file mode
  mini-jsx build example/index.jsx
  mini-jsx build example/index.jsx --watch
  mini-jsx dev example/index.jsx

  # Pages mode (build all .jsx files in directory)
  mini-jsx build pages
  mini-jsx build pages --watch
  mini-jsx dev pages
  mini-jsx dev          # Same as: mini-jsx dev pages

  # Custom options
  mini-jsx build pages -o public
  mini-jsx dev pages -p 8080
    `);
    process.exit(0);
  }

  const command = opts._[0];
  const inputFile = opts._[1];

  if (command === "build") {
    const buildOptions = {
      outputDir: opts.output || "dist",
    };

    try {
      // Check if inputFile is a directory (pages mode)
      const isDirectory = inputFile && (await fs.stat(path.resolve(process.cwd(), inputFile)).catch(() => null))?.isDirectory();

      if (isDirectory || inputFile === "pages" || !inputFile) {
        // Pages mode - build all pages in directory
        const pagesDir = inputFile || "pages";
        const pagesDirAbs = path.resolve(process.cwd(), pagesDir);

        const pages = await discoverPages(pagesDirAbs);

        if (pages.length === 0) {
          console.error(`Error: No JSX files found in ${pagesDir}/`);
          process.exit(1);
        }

        console.log(`Found ${pages.length} page(s) in ${pagesDir}/\n`);

        if (opts.watch) {
          // Initial build all pages
          for (const page of pages) {
            await buildFile(page, { ...buildOptions, pagesDir: pagesDirAbs });
          }

          console.log(`\n👀 Watching for changes in ${pagesDir}/...`);
          console.log("Press Ctrl+C to stop\n");

          const { watch } = await import("node:fs");
          watch(pagesDirAbs, { recursive: true }, async (_eventType, filename) => {
            if (filename && filename.endsWith(".jsx")) {
              const changedFile = path.join(pagesDirAbs, filename);
              try {
                await buildFile(changedFile, { ...buildOptions, pagesDir: pagesDirAbs, silent: true });
                console.log(`✓ Rebuilt: ${filename}`);
              } catch (error) {
                console.error(`✗ Build error: ${error.message}`);
              }
            }
          });

          process.on("SIGINT", () => {
            console.log("\n\n👋 Shutting down...");
            process.exit(0);
          });
        } else {
          // Build all pages
          for (const page of pages) {
            await buildFile(page, { ...buildOptions, pagesDir: pagesDirAbs });
          }
        }
      } else if (inputFile) {
        // Single file mode
        if (opts.watch) {
          // Initial build
          await buildFile(inputFile, buildOptions);

          // Watch for changes
          const absolutePath = path.resolve(process.cwd(), inputFile);
          const watchDir = path.dirname(absolutePath);

          console.log(`\n👀 Watching for changes in ${watchDir}...`);
          console.log("Press Ctrl+C to stop\n");

          const { watch } = await import("node:fs");
          watch(watchDir, { recursive: true }, async (_eventType, filename) => {
            if (filename && filename.endsWith(".jsx")) {
              try {
                await buildFile(inputFile, { ...buildOptions, silent: true });
                console.log(`✓ Rebuilt: ${filename}`);
              } catch (error) {
                console.error(`✗ Build error: ${error.message}`);
              }
            }
          });

          process.on("SIGINT", () => {
            console.log("\n\n👋 Shutting down...");
            process.exit(0);
          });
        } else {
          // Single build
          await buildFile(inputFile, buildOptions);
        }
      } else {
        console.error("Error: Please specify a file or pages directory to build");
        console.error("Usage: mini-jsx build <file|pages> [options]");
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  } else if (command === "dev") {
    const requestedPort = opts.port || 3000;
    const outputDir = opts.output || "dist";

    try {
      // Check if inputFile is a directory (pages mode)
      const isDirectory = inputFile && (await fs.stat(path.resolve(process.cwd(), inputFile)).catch(() => null))?.isDirectory();
      const isPages = isDirectory || inputFile === "pages" || !inputFile;

      // Find available ports
      const wsPort = await findAvailablePort(35729);
      const httpPort = await findAvailablePort(requestedPort);

      if (wsPort !== 35729) {
        console.log(`ℹ️  WebSocket port 35729 is busy, using port ${wsPort} instead`);
      }
      if (httpPort !== requestedPort) {
        console.log(`ℹ️  Port ${requestedPort} is busy, using port ${httpPort} instead`);
      }

      if (isPages) {
        // Pages mode
        const pagesDir = inputFile || "pages";
        const pagesDirAbs = path.resolve(process.cwd(), pagesDir);
        const pages = await discoverPages(pagesDirAbs);

        if (pages.length === 0) {
          console.error(`Error: No JSX files found in ${pagesDir}/`);
          process.exit(1);
        }

        console.log(`Found ${pages.length} page(s) in ${pagesDir}/\n`);

        // Initial build all pages
        for (const page of pages) {
          await buildFile(page, { liveReload: true, wsPort, outputDir, pagesDir: pagesDirAbs });
        }

        // Setup WebSocket server
        const wss = new WebSocketServer({ port: wsPort });
        const clients = new Set();

        wss.on("connection", (ws) => {
          clients.add(ws);
          ws.on("close", () => clients.delete(ws));
        });

        function notifyClients() {
          clients.forEach((client) => {
            if (client.readyState === 1) {
              client.send("reload");
            }
          });
        }

        // Watch for changes
        console.log(`\n👀 Watching for changes in ${pagesDir}/...`);

        const { watch } = await import("node:fs");
        watch(pagesDirAbs, { recursive: true }, async (_eventType, filename) => {
          if (filename && filename.endsWith(".jsx")) {
            const changedFile = path.join(pagesDirAbs, filename);
            try {
              await buildFile(changedFile, { liveReload: true, silent: true, wsPort, outputDir, pagesDir: pagesDirAbs });
              console.log(`✓ Rebuilt: ${filename}`);
              notifyClients();
            } catch (error) {
              console.error(`✗ Build error: ${error.message}`);
            }
          }
        });

        // Create HTTP server
        const outDir = path.resolve(process.cwd(), outputDir);

        const server = http.createServer(async (req, res) => {
          let requestPath = req.url === "/" ? "/index.html" : req.url;
          let filePath = path.join(outDir, requestPath);

          try {
            const content = await fs.readFile(filePath);
            const ext = path.extname(filePath);
            const contentTypes = {
              ".html": "text/html",
              ".css": "text/css",
              ".js": "text/javascript",
              ".json": "application/json",
              ".png": "image/png",
              ".jpg": "image/jpeg",
              ".gif": "image/gif",
              ".svg": "image/svg+xml",
            };

            res.writeHead(200, { "Content-Type": contentTypes[ext] || "text/plain" });
            res.end(content);
          } catch (error) {
            res.writeHead(404);
            res.end("Not found");
          }
        });

        server.listen(httpPort, () => {
          console.log(`\n🚀 Server running at http://localhost:${httpPort}`);
          console.log(`📝 Serving: ${pagesDir}/ → ${outputDir}/\n`);
        });
      } else {
        // Single file mode
        if (!inputFile) {
          console.error("Error: Please specify a file or pages directory to serve");
          console.error("Usage: mini-jsx dev <file|pages> [options]");
          process.exit(1);
        }

        // Initial build with live reload
        await buildFile(inputFile, { liveReload: true, wsPort, outputDir });

        // Setup WebSocket server for live reload
        const wss = new WebSocketServer({ port: wsPort });
        const clients = new Set();

        wss.on("connection", (ws) => {
          clients.add(ws);
          ws.on("close", () => clients.delete(ws));
        });

        function notifyClients() {
          clients.forEach((client) => {
            if (client.readyState === 1) {
              client.send("reload");
            }
          });
        }

        // Watch for changes
        const absolutePath = path.resolve(process.cwd(), inputFile);
        const watchDir = path.dirname(absolutePath);

        console.log(`\n👀 Watching for changes in ${watchDir}...`);

        const { watch } = await import("node:fs");
        watch(watchDir, { recursive: true }, async (_eventType, filename) => {
          if (filename && filename.endsWith(".jsx")) {
            try {
              await buildFile(inputFile, { liveReload: true, silent: true, wsPort, outputDir });
              console.log(`✓ Rebuilt: ${filename}`);
              notifyClients();
            } catch (error) {
              console.error(`✗ Build error: ${error.message}`);
            }
          }
        });

        // Create HTTP server
        const outDir = path.resolve(process.cwd(), outputDir);
        const inputBasename = path.basename(inputFile, ".jsx");
        const outputFilename = `${inputBasename}.html`;
        const relativeOutput = path.relative(process.cwd(), path.join(outDir, outputFilename));

        const server = http.createServer(async (req, res) => {
          let filePath = path.join(outDir, req.url === "/" ? outputFilename : req.url);

          try {
            const content = await fs.readFile(filePath);
            const ext = path.extname(filePath);
            const contentTypes = {
              ".html": "text/html",
              ".css": "text/css",
              ".js": "text/javascript",
              ".json": "application/json",
              ".png": "image/png",
              ".jpg": "image/jpeg",
              ".gif": "image/gif",
              ".svg": "image/svg+xml",
            };

            res.writeHead(200, { "Content-Type": contentTypes[ext] || "text/plain" });
            res.end(content);
          } catch (error) {
            res.writeHead(404);
            res.end("Not found");
          }
        });

        server.listen(httpPort, () => {
          console.log(`\n🚀 Server running at http://localhost:${httpPort}`);
          console.log(`📝 Serving: ${relativeOutput}\n`);
        });
      }

      // Keep process running
      process.on("SIGINT", () => {
        console.log("\n\n👋 Shutting down...");
        process.exit(0);
      });
    } catch (error) {
      console.error(`Error: ${error.message}`);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  } else {
    console.error(`Unknown command: ${command}`);
    console.error('Run "mini-jsx --help" for usage information');
    process.exit(1);
  }
}

main();
