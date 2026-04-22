/**
 * Dev server using h3
 */
import { createApp, eventHandler, setResponseHeader, createError } from "h3";
import { toNodeHandler } from "h3/node";
import { createServer } from "node:http";
import { resolve, join, extname } from "node:path";
import { readFile } from "node:fs/promises";
import { DIRS, PORTS, MIME_TYPES, HTTP_STATUS, ERROR_CODES } from "./constants.js";

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

  app.use(
    "/**",
    eventHandler(async (event) => {
      const url = event.path || "/";
      const isFavicon = url === "/favicon.ico";
      const rootFile = mode === "single" ? indexFile : "index.html";
      const filePath = join(outDir, url === "/" || url === "" ? rootFile : url);

      try {
        const content = await readFile(filePath);
        setResponseHeader(event, "Content-Type", MIME_TYPES[extname(filePath)] || "application/octet-stream");
        return content;
      } catch (error) {
        if (!isFavicon) console.error("Server error:", error);
        if (error.code === ERROR_CODES.FILE_NOT_FOUND) {
          throw createError({
            statusCode: HTTP_STATUS.NOT_FOUND,
            statusMessage: "Not Found",
            message: isFavicon ? "Favicon not found" : `File not found: ${error.path}`,
          });
        }
        throw createError({
          statusCode: HTTP_STATUS.SERVER_ERROR,
          statusMessage: "Internal Server Error",
          message: error.message,
        });
      }
    })
  );

  const server = createServer(toNodeHandler(app));

  return new Promise((resolvePromise, rejectPromise) => {
    const onError = (err) => {
      if (err.code === ERROR_CODES.PORT_IN_USE) {
        const nextPort = port + 1;
        console.log(`ℹ️  Port ${port} is busy, using port ${nextPort} instead`);
        server.removeListener("error", onError);
        createDevServer({ ...options, port: nextPort }).then(resolvePromise, rejectPromise);
        return;
      }
      rejectPromise(err);
    };
    server.once("error", onError);
    server.listen(port, () => {
      server.removeListener("error", onError);
      resolvePromise({ server, app, port });
    });
  });
}
