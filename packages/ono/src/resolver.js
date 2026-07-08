/**
 * Module Resolver - collect the local import graph of an entry file.
 *
 * Only relative specifiers are followed; package imports and evaluation
 * order are left to Node's own module resolution.
 */

import fs from "node:fs/promises";
import path from "node:path";

/**
 * Parse import specifiers from source code
 * @param {string} code - Source code
 * @returns {string[]} Array of import specifiers
 */
export function parseImports(code) {
  const specifiers = [];

  // Match various import patterns:
  // import foo from "bar"
  // import { foo } from "bar"
  // import * as foo from "bar"
  // import "bar"
  const importRegex = /import\s+(?:[\w{},\s*]+\s+from\s+)?['"]([^'"]+)['"]/g;

  let match;
  while ((match = importRegex.exec(code)) !== null) {
    specifiers.push(match[1]);
  }

  return specifiers;
}

/**
 * Resolve import path relative to the importing file
 * @param {string} importPath - Import specifier (e.g., "./Button.jsx")
 * @param {string} fromFile - Absolute path of the file doing the import
 * @returns {string} Absolute path to the imported file
 */
export function resolveImportPath(importPath, fromFile) {
  if (path.isAbsolute(importPath)) {
    return importPath;
  }
  return path.resolve(path.dirname(fromFile), importPath);
}

/**
 * Collect the entry file and all transitively imported local files
 * @param {string} entryFile - Absolute path to entry file
 * @returns {Promise<Set<string>>} Absolute paths of all local modules
 */
export async function collectModules(entryFile) {
  const modules = new Set();
  const queue = [entryFile];

  while (queue.length > 0) {
    const currentFile = queue.shift();
    if (modules.has(currentFile)) continue;

    let source;
    try {
      source = await fs.readFile(currentFile, "utf-8");
    } catch (error) {
      throw new Error(`Cannot read file: ${currentFile}\n${error.message}`);
    }

    modules.add(currentFile);

    for (const specifier of parseImports(source)) {
      if (specifier.startsWith(".")) {
        queue.push(resolveImportPath(specifier, currentFile));
      }
    }
  }

  return modules;
}
