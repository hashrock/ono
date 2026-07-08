/**
 * Constants for Ono SSG
 */

/**
 * Default port configuration
 */
export const PORTS = {
  /** Default HTTP server port */
  SERVER: 3000,
};

/**
 * Default directory names
 */
export const DIRS = {
  /** Default input directory for pages */
  PAGES: "pages",
  /** Default output directory for built files */
  OUTPUT: "dist",
  /** Directory for static public files */
  PUBLIC: "public",
  /** Directory for barrel file sources */
  BARRELS: "barrels",
};

/**
 * Timing configuration
 */
export const TIMING = {
  /** Debounce delay for file watcher in milliseconds */
  DEBOUNCE_MS: 100,
};

/**
 * Self-closing HTML tags (void elements)
 */
export const SELF_CLOSING_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/**
 * Content-Type mappings for file extensions
 */
export const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};
