/**
 * Browser-compatible utilities for Ono SSG
 * These functions can be used in both Node.js and browser environments.
 */

/**
 * Flatten array recursively and filter out falsy values (null, undefined, boolean)
 * @param {any[]} children - Array of children to flatten
 * @returns {any[]} Flattened array with falsy values removed
 */
export function flattenChildren(children) {
  const result = [];

  for (const child of children) {
    if (child === null || child === undefined || typeof child === "boolean") {
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

/**
 * Check if a filename has a JSX extension (.jsx or .tsx)
 * @param {string} filename - The filename to check
 * @returns {boolean} True if the file has a JSX extension
 */
export function isJSXFile(filename) {
  return filename.endsWith(".jsx") || filename.endsWith(".tsx");
}

/**
 * Check if a filename has an HTML extension
 * @param {string} filename - The filename to check
 * @returns {boolean} True if the file has an HTML extension
 */
export function isHTMLFile(filename) {
  return filename.endsWith(".html");
}

/**
 * Convert kebab-case or snake_case to camelCase
 * @param {string} str - String to convert
 * @returns {string} camelCase string
 */
export function toCamelCase(str) {
  return str.replace(/[-_]([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Create a debounced version of a function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
