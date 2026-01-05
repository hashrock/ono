/**
 * Dev server using h3
 */
import { createApp, eventHandler, setResponseHeader, createError } from "h3";
import { toNodeHandler } from "h3/node";
import { createServer } from "node:http";
import { resolve, join, extname } from "node:path";
import { readFile } from "node:fs/promises";
import { DIRS, PORTS, MIME_TYPES, HTTP_STATUS } from "./constants.js";

/**
 * Create a development server
 * @param {Object} options - Server options
 * @param {string} [options.outputDir] - Output directory to serve
 * @param {number} [options.port] - HTTP port
 * @param {string} [options.mode] - Server mode: 'pages' or 'single'
 * @param {string} [options.indexFile] - Index file for single mode
 * @returns {Promise<{server: import('http').Server, app: any, port: number}>}
 */
export async function createDevServer(options) {
  const { outputDir = DIRS.OUTPUT, port = PORTS.SERVER, mode = "pages", indexFile = "index.html" } = options;

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

        setResponseHeader(event, "Content-Type", MIME_TYPES[ext] || "application/octet-stream");
        return content;
      } catch (error) {
        // Don't log error for missing favicon.ico (browsers request it automatically)
        const isFavicon = url === "/favicon.ico";
        if (!isFavicon) {
          console.error("Server error:", error);
        }
        if (error.code === "ENOENT") {
          throw createError({
            statusCode: HTTP_STATUS.NOT_FOUND,
            statusMessage: "Not Found",
            message: isFavicon ? "Favicon not found" : `File not found: ${error.path}`,
          });
        } else {
          throw createError({
            statusCode: HTTP_STATUS.SERVER_ERROR,
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
