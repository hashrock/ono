/**
 * Shared utilities for Ono SSG
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";

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
 * Get all files matching a predicate recursively from a directory
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
