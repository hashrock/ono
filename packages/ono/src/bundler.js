/**
 * Bundler - Bundle JSX files into a single executable module
 */

import fs from "node:fs/promises";
import path from "node:path";
import { collectDependencies, resolveImportPath } from "./resolver.js";
import { transformJSX } from "./transformer.js";

/**
 * Generate a unique module variable name from file path
 * @param {string} filePath - Absolute path to file
 * @returns {string} Valid JavaScript variable name
 */
function generateModuleName(filePath) {
  const name = filePath
    .replace(/^.*[/\\]/, '') // Get filename
    .replace(/\.[^.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9]/g, '_'); // Replace invalid chars
  return '_module_' + name + '_' + Math.random().toString(36).slice(2, 6);
}

/**
 * Bundle a JSX file and all its dependencies
 * @param {string} entryFile - Absolute path to entry file
 * @returns {Promise<string>} Bundled JavaScript code
 */
export async function bundle(entryFile) {
  // Collect all dependencies
  const { order } = await collectDependencies(entryFile);

  const modules = [];
  const packageImports = new Map(); // Track unique package imports
  const moduleNameMap = new Map(); // Map file path to module variable name

  // Generate module names first
  for (const filePath of order) {
    moduleNameMap.set(filePath, generateModuleName(filePath));
  }

  // Process each module in dependency order
  for (let i = 0; i < order.length; i++) {
    const filePath = order[i];
    const isEntry = i === order.length - 1; // Last file is entry
    const moduleName = moduleNameMap.get(filePath);

    // Read the file
    const source = await fs.readFile(filePath, "utf-8");

    // Transform JSX to JS
    const transformed = transformJSX(source, filePath);

    // Extract and collect package imports, remove all imports from code
    const { code: codeWithoutImports, imports, importBindings } = extractImports(transformed);

    // Add unique package imports to the map
    for (const imp of imports) {
      if (!packageImports.has(imp)) {
        packageImports.set(imp, true);
      }
    }

    // Replace import bindings with module references for relative imports
    let processedCode = codeWithoutImports;
    for (const [binding, importPath] of Object.entries(importBindings)) {
      // Resolve the import path to absolute path
      const resolvedImportPath = resolveImportPath(importPath, filePath);

      // Find the module name for this import
      const depModuleName = moduleNameMap.get(resolvedImportPath);
      if (depModuleName) {
        // Replace namespace import usage
        processedCode = processedCode.replace(
          new RegExp(`\\b${binding}\\.`, 'g'),
          `${depModuleName}.`
        );
      }
    }

    // For non-entry modules, wrap in IIFE to create separate scope
    let wrappedCode;
    if (!isEntry) {
      // Extract exports and wrap them in IIFE
      const { code: noExports, exports: exportedItems } = extractExports(processedCode);
      const returnObj = exportedItems.length > 0
        ? `return { ${exportedItems.join(', ')} };`
        : 'return {};';
      wrappedCode = `const ${moduleName} = (function() {\n${noExports}\n${returnObj}\n})();`;
    } else {
      wrappedCode = processedCode;
    }

    modules.push({
      path: filePath,
      code: wrappedCode,
      moduleName,
      isEntry
    });
  }

  // Combine package imports (deduplicated) + all module code
  const importLines = Array.from(packageImports.keys()).join("\n");
  const moduleCode = modules.map(m => m.code).join("\n\n");
  const bundledCode = importLines + (importLines ? "\n\n" : "") + moduleCode;

  return bundledCode;
}

/**
 * Extract package imports and remove all imports from code
 * @param {string} code - JavaScript code
 * @returns {{ code: string, imports: string[], importBindings: Object }} Code without imports, package imports, and binding map
 */
function extractImports(code) {
  const lines = code.split("\n");
  const packageImports = [];
  const filteredLines = [];
  const importBindings = {}; // Map binding name to import path for relative imports

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("import ")) {
      filteredLines.push(line);
      continue;
    }

    // Check if it's a package import (not starting with . or /)
    const importMatch = trimmed.match(/from\s+['"]([^'"]+)['"]/);
    if (importMatch) {
      const importPath = importMatch[1];
      if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        // It's a package import - collect it
        packageImports.push(trimmed);
      } else {
        // It's a relative import - extract binding name for namespace imports
        const namespaceMatch = trimmed.match(/import\s+\*\s+as\s+(\w+)\s+from/);
        if (namespaceMatch) {
          importBindings[namespaceMatch[1]] = importPath;
        }
      }
    }
    // All imports (relative and package) are removed from code
  }

  return {
    code: filteredLines.join("\n"),
    imports: packageImports,
    importBindings
  };
}

/**
 * Extract exports from code and return them as a list
 * @param {string} code - JavaScript code
 * @returns {{ code: string, exports: string[] }} Code with exports converted, list of export names
 */
function extractExports(code) {
  const exportsSet = new Set();
  let processedCode = code;

  // Match export const/let/var/function
  const exportConstMatch = processedCode.matchAll(/export\s+(const|let|var)\s+(\w+)/g);
  for (const match of exportConstMatch) {
    exportsSet.add(match[2]);
  }

  const exportFunctionMatch = processedCode.matchAll(/export\s+function\s+(\w+)/g);
  for (const match of exportFunctionMatch) {
    exportsSet.add(match[1]);
  }

  // Remove 'export' keyword but keep the declarations
  processedCode = processedCode.replace(/export\s+(const|let|var|function)/g, '$1');

  // Handle export default
  const defaultMatch = processedCode.match(/export\s+default\s+(?:function\s+)?(\w+)?/);
  if (defaultMatch) {
    if (defaultMatch[1]) {
      exportsSet.add(`default: ${defaultMatch[1]}`);
    }
    processedCode = processedCode.replace(/export\s+default\s+/, '');
  }

  return {
    code: processedCode,
    exports: Array.from(exportsSet)
  };
}

/**
 * Remove export default from code
 * @param {string} code - JavaScript code
 * @returns {string} Code without export default
 */
function removeExportDefault(code) {
  return code.replace(/export\s+default\s+/g, "");
}
