/**
 * Module Resolver - Parse imports and resolve dependencies
 */

import fs from "node:fs/promises";
import path from "node:path";
import { Parser } from "acorn";
import jsx from "acorn-jsx";

// Create parser with JSX support
const jsxParser = Parser.extend(jsx());

/**
 * Recursively walk AST to find ImportDeclaration nodes
 * @param {Object} node - AST node
 * @param {Array} imports - Accumulator for imports
 */
function walkAST(node, imports) {
  if (!node || typeof node !== "object") return;

  if (node.type === "ImportDeclaration" && node.source) {
    imports.push({
      specifier: node.source.value
    });
  }

  // Recursively walk all properties
  for (const key in node) {
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach(child => walkAST(child, imports));
    } else if (value && typeof value === "object") {
      walkAST(value, imports);
    }
  }
}

/**
 * Parse import statements from source code
 * @param {string} code - Source code
 * @returns {Array} Array of import objects with specifier
 */
export function parseImports(code) {
  const imports = [];

  try {
    const ast = jsxParser.parse(code, {
      ecmaVersion: "latest",
      sourceType: "module"
    });

    walkAST(ast, imports);
  } catch (error) {
    // If parsing fails, fall back to empty array
    // This allows the code to handle parse errors gracefully
    console.warn(`Warning: Failed to parse imports: ${error.message}`);
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
 * @returns {Object} Object with modules (Set), graph (Map), and order (Array)
 */
export async function collectDependencies(entryFile) {
  const modules = new Set();
  const graph = new Map();
  const queue = [entryFile];

  // BFS to collect all dependencies
  while (queue.length > 0) {
    const currentFile = queue.shift();

    // Skip if already processed
    if (modules.has(currentFile)) continue;

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
    order
  };
}
