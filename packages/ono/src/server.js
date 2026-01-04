/**
 * Dev server using h3
 */
import { createApp, createRouter, eventHandler, setResponseStatus, setResponseHeader, createError } from "h3";
import { toNodeHandler } from "h3/node";
import { createServer } from "node:http";
import { resolve, join, extname } from "node:path";
import { readFile } from "node:fs/promises";

/**
 * Create a development server
 * @param {object} options - Server options
 * @param {string} options.outputDir - Output directory to serve
 * @param {number} options.port - HTTP port
 * @param {string} options.mode - Server mode: 'pages' or 'single'
 * @param {string} options.indexFile - Index file for single mode
 * @returns {Promise<object>} Server instance
 */
export async function createDevServer(options) {
  const { outputDir = "dist", port = 3000, mode = "pages", indexFile = "index.html" } = options;

  const outDir = resolve(process.cwd(), outputDir);

  const app = createApp();

  // Serve static files from output directory
  app.use(
    "/**",
    eventHandler(async (event) => {
      try {
        const url = event.path || "/";
        let filePath;

        if (mode === "single") {
          // Single file mode: serve specific file for root
          if (url === "/" || url === "") {
            filePath = join(outDir, indexFile);
          } else {
            filePath = join(outDir, url);
          }
        } else {
          // Pages mode: default routing
          if (url === "/" || url === "") {
            filePath = join(outDir, "index.html");
          } else {
            filePath = join(outDir, url);
          }
        }

        const content = await readFile(filePath);
        const ext = extname(filePath);

        const contentTypes = {
          ".html": "text/html; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".js": "text/javascript; charset=utf-8",
          ".json": "application/json; charset=utf-8",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".gif": "image/gif",
          ".svg": "image/svg+xml",
          ".ico": "image/x-icon",
          ".woff": "font/woff",
          ".woff2": "font/woff2",
          ".ttf": "font/ttf",
          ".eot": "application/vnd.ms-fontobject",
          ".webp": "image/webp",
        };

        setResponseHeader(event, "Content-Type", contentTypes[ext] || "application/octet-stream");
        return content;
      } catch (error) {
        // Don't log error for missing favicon.ico (browsers request it automatically)
        const isFavicon = url === "/favicon.ico";
        if (!isFavicon) {
          console.error("Server error:", error);
        }
        if (error.code === "ENOENT") {
          throw createError({
            statusCode: 404,
            statusMessage: "Not Found",
            message: isFavicon ? "Favicon not found" : `File not found: ${error.path}`,
          });
        } else {
          throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error",
            message: error.message,
          });
        }
      }
    })
  );

  const server = createServer(toNodeHandler(app));

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve({ server, app, port });
    });
  });
}
