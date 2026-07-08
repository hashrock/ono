/**
 * Dev server - static files plus SSE live reload, no dependencies.
 *
 * The server injects a small EventSource script into served HTML and
 * exposes a reload() function that broadcasts to connected browsers.
 */
import { createServer } from "node:http";
import { resolve, join, extname, normalize } from "node:path";
import { readFile } from "node:fs/promises";
import { DIRS, PORTS, MIME_TYPES } from "./constants.js";

const RELOAD_PATH = "/__ono_reload";
const RELOAD_SCRIPT = `<script>new EventSource("${RELOAD_PATH}").onmessage = () => location.reload();</script>`;

/** @param {string} html */
function injectReloadScript(html) {
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${RELOAD_SCRIPT}</body>`);
  }
  return html + RELOAD_SCRIPT;
}

/**
 * Create a development server
 * @param {Object} options - Server options
 * @param {string} [options.outputDir] - Output directory to serve
 * @param {number} [options.port] - HTTP port
 * @param {string} [options.mode] - Server mode: 'pages' or 'single'
 * @param {string} [options.indexFile] - Index file for single mode
 * @returns {Promise<{server: import('http').Server, port: number, reload: () => void}>}
 */
export async function createDevServer(options) {
  const { outputDir = DIRS.OUTPUT, port = PORTS.SERVER, mode = "pages", indexFile = "index.html" } = options;

  const outDir = resolve(process.cwd(), outputDir);
  const clients = new Set();

  const server = createServer(async (req, res) => {
    const url = (req.url || "/").split("?")[0];

    // SSE endpoint for live reload
    if (url === RELOAD_PATH) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write(": connected\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }

    const rootFile = mode === "single" ? indexFile : "index.html";
    const relPath = url === "/" ? rootFile : url.endsWith("/") ? join(url, "index.html") : url;
    const filePath = normalize(join(outDir, relPath));

    if (!filePath.startsWith(outDir)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    try {
      const content = await readFile(filePath);
      const contentType =
        MIME_TYPES[/** @type {keyof typeof MIME_TYPES} */ (extname(filePath))] ||
        "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });

      if (filePath.endsWith(".html")) {
        res.end(injectReloadScript(content.toString()));
      } else {
        res.end(content);
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`Not Found: ${url}`);
      } else {
        console.error("Server error:", error);
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`Server Error: ${error.message}`);
      }
    }
  });

  /** Tell all connected browsers to reload */
  const reload = () => {
    for (const client of clients) {
      client.write("data: reload\n\n");
    }
  };

  return new Promise((resolvePromise, rejectPromise) => {
    /** @param {any} err */
    const onError = (err) => {
      if (err.code === "EADDRINUSE") {
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
      resolvePromise({ server, port, reload });
    });
  });
}
