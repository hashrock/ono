/**
 * Node.js utilities for Ono SSG
 * This file contains utilities that require Node.js runtime.
 * For browser-compatible utilities, use utils.browser.js
 */
import { unlink } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

// Re-export browser-compatible utilities for backward compatibility
export {
  flattenChildren,
  isJSXFile,
  isHTMLFile,
  toCamelCase,
  debounce,
} from "./utils.browser.js";

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
