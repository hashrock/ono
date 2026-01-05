/**
 * Shared utilities for Ono SSG
 */
import { unlink } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

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
 * Clean up a temporary file, silently ignoring errors
 * @param {string} tempFile - Path to the temporary file to delete
 * @returns {Promise<void>}
 */
export async function cleanupTempFile(tempFile) {
  try {
    await unlink(tempFile);
  } catch {
    // Ignore cleanup errors
  }
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
 * Get all files with specified extensions recursively from a directory
 * @param {string} dir - Directory to search
 * @param {(filename: string) => boolean} predicate - Function to test filenames
 * @returns {Promise<string[]>} Array of file paths
 */
export async function getFilesRecursively(dir, predicate) {
  const files = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await getFilesRecursively(fullPath, predicate);
        files.push(...subFiles);
      } else if (entry.isFile() && predicate(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory might not exist
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  return files;
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
