/**
 * Module Resolver - Parse imports and resolve dependencies
 */

import fs from "node:fs/promises";
import path from "node:path";
import { isAssetFile } from "./asset-loader.js";

/**
 * Parse import statements from source code
 * @param {string} code - Source code
 * @returns {Array} Array of import objects with specifier
 */
export function parseImports(code) {
  const imports = [];

  // Match various import patterns:
  // import foo from "bar"
  // import { foo } from "bar"
  // import * as foo from "bar"
  // import "bar"
  const importRegex = /import\s+(?:[\w{},\s*]+\s+from\s+)?['"]([^'"]+)['"]/g;

  let match;
  while ((match = importRegex.exec(code)) !== null) {
    imports.push({
      specifier: match[1]
    });
  }

  return imports;
}

/**
 * Resolve import path relative to the importing file
 * @param {string} importPath - Import specifier (e.g., "./Button.jsx")
 * @param {string} fromFile - Absolute path of the file doing the import
 * @returns {string} Absolute path to the imported file
 */
export function resolveImportPath(importPath, fromFile) {
  // If it's already an absolute path, return as-is
  if (path.isAbsolute(importPath)) {
    return importPath;
  }

  // For relative imports, resolve relative to the importing file
  const dir = path.dirname(fromFile);
  return path.resolve(dir, importPath);
}

/**
 * Topological sort for dependency graph
 * @param {Map} graph - Dependency graph (file -> [dependencies])
 * @returns {Array} Sorted array of file paths
 */
function topologicalSort(graph) {
  const sorted = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(node) {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      throw new Error(`Circular dependency detected: ${node}`);
    }

    visiting.add(node);

    const deps = graph.get(node) || [];
    for (const dep of deps) {
      visit(dep);
    }

    visiting.delete(node);
    visited.add(node);
    sorted.push(node);
  }

  // Visit all nodes
  for (const node of graph.keys()) {
    visit(node);
  }

  return sorted;
}

/**
 * Collect all dependencies recursively
 * @param {string} entryFile - Absolute path to entry file
 * @returns {Object} Object with modules (Set), graph (Map), order (Array), and assets (Set)
 */
export async function collectDependencies(entryFile) {
  const modules = new Set();
  const assets = new Set();
  const graph = new Map();
  const queue = [entryFile];

  // BFS to collect all dependencies
  while (queue.length > 0) {
    const currentFile = queue.shift();

    // Skip if already processed
    if (modules.has(currentFile) || assets.has(currentFile)) continue;

    // Check if it's an asset file
    if (isAssetFile(currentFile)) {
      assets.add(currentFile);
      continue; // Assets don't have dependencies to process
    }

    // Read the file
    let source;
    try {
      source = await fs.readFile(currentFile, "utf-8");
    } catch (error) {
      throw new Error(`Cannot read file: ${currentFile}\n${error.message}`);
    }

    // Parse imports
    const imports = parseImports(source);
    const dependencies = [];

    for (const imp of imports) {
      // Only process relative imports (skip node_modules, etc.)
      if (imp.specifier.startsWith(".")) {
        const resolvedPath = resolveImportPath(imp.specifier, currentFile);
        dependencies.push(resolvedPath);
        queue.push(resolvedPath);
      }
    }

    // Add to modules and graph
    modules.add(currentFile);
    graph.set(currentFile, dependencies);
  }

  // Sort dependencies topologically
  const order = topologicalSort(graph);

  return {
    modules,
    graph,
    order,
    assets
  };
}
