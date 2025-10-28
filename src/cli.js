#!/usr/bin/env node

/**
 * CLI Tool for mini-jsx
 */

import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { bundle } from "./bundler.js";
import { renderToString } from "./renderer.js";
import { WebSocketServer } from "ws";

/**
 * Build a JSX file to HTML
 * @param {string} inputFile - Path to input JSX file
 * @param {object} options - Build options
 * @param {boolean} options.liveReload - Inject live reload script
 * @param {boolean} options.silent - Suppress console output
 * @returns {Promise<{outputPath: string, html: string}>}
 */
async function buildFile(inputFile, options = {}) {
  const { liveReload = false, silent = false } = options;
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
  const ws = new WebSocket('ws://localhost:35729');
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

  // Output file name (replace .jsx with .html)
  const outputFile = inputFile.replace(/\.jsx$/, ".html");
  const outputPath = path.resolve(process.cwd(), outputFile);

  await fs.writeFile(outputPath, fullHtml);

  // Clean up temp file
  await fs.unlink(tmpFile);

  if (!silent) {
    console.log(`✓ Built successfully: ${outputFile}`);
  }

  return { outputPath, html: fullHtml };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Mini JSX - A lightweight JSX library for static site generation

Usage:
  mini-jsx build <file>         Build a JSX file to HTML
  mini-jsx build <file> --watch Watch for changes and rebuild
  mini-jsx dev <file>           Start dev server with live reload
  mini-jsx --help               Show this help message

Examples:
  mini-jsx build example/index.jsx
  mini-jsx build example/index.jsx --watch
  mini-jsx dev example/index.jsx
  mini-jsx dev example/index.jsx --port 3000
    `);
    process.exit(0);
  }

  const command = args[0];

  if (command === "build") {
    if (args.length < 2) {
      console.error("Error: Please specify a file to build");
      console.error("Usage: mini-jsx build <file>");
      process.exit(1);
    }

    const inputFile = args[1];
    const watchMode = args.includes("--watch");

    try {
      if (watchMode) {
        // Initial build
        await buildFile(inputFile);

        // Watch for changes
        const absolutePath = path.resolve(process.cwd(), inputFile);
        const watchDir = path.dirname(absolutePath);

        console.log(`\n👀 Watching for changes in ${watchDir}...`);
        console.log("Press Ctrl+C to stop\n");

        const { watch } = await import("node:fs");
        watch(watchDir, { recursive: true }, async (_eventType, filename) => {
          if (filename && filename.endsWith(".jsx")) {
            try {
              await buildFile(inputFile, { silent: true });
              console.log(`✓ Rebuilt: ${filename}`);
            } catch (error) {
              console.error(`✗ Build error: ${error.message}`);
            }
          }
        });

        // Keep process running
        process.on("SIGINT", () => {
          console.log("\n\n👋 Shutting down...");
          process.exit(0);
        });
      } else {
        // Single build
        await buildFile(inputFile);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  } else if (command === "dev") {
    if (args.length < 2) {
      console.error("Error: Please specify a file to serve");
      console.error("Usage: mini-jsx dev <file>");
      process.exit(1);
    }

    const inputFile = args[1];
    const portIndex = args.indexOf("--port");
    const port = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1]) : 3000;

    try {
      // Initial build with live reload
      await buildFile(inputFile, { liveReload: true });

      // Setup WebSocket server for live reload
      const wss = new WebSocketServer({ port: 35729 });
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
            await buildFile(inputFile, { liveReload: true, silent: true });
            console.log(`✓ Rebuilt: ${filename}`);
            notifyClients();
          } catch (error) {
            console.error(`✗ Build error: ${error.message}`);
          }
        }
      });

      // Create HTTP server
      const outputFile = inputFile.replace(/\.jsx$/, ".html");
      const outputPath = path.resolve(process.cwd(), outputFile);
      const outputDir = path.dirname(outputPath);

      const server = http.createServer(async (req, res) => {
        let filePath = path.join(outputDir, req.url === "/" ? path.basename(outputPath) : req.url);

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

      server.listen(port, () => {
        console.log(`\n🚀 Server running at http://localhost:${port}`);
        console.log(`📝 Serving: ${outputFile}\n`);
      });

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
