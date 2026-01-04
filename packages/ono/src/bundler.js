/**
 * Bundler - Bundle JSX files into a single executable module
 */

import fs from "node:fs/promises";
import { collectDependencies } from "./resolver.js";
import { transformJSX } from "./transformer.js";

/**
 * Bundle a JSX file and all its dependencies
 * @param {string} entryFile - Absolute path to entry file
 * @returns {Promise<string>} Bundled JavaScript code
 */
export async function bundle(entryFile) {
  // Collect all dependencies
  const { order } = await collectDependencies(entryFile);

  const modules = [];

  // Process each module in dependency order
  for (let i = 0; i < order.length; i++) {
    const filePath = order[i];
    const isEntry = i === order.length - 1; // Last file is entry

    // Read the file
    const source = await fs.readFile(filePath, "utf-8");

    // Transform JSX to JS
    const transformed = transformJSX(source, filePath);

    // Remove import statements (they're already resolved)
    const withoutImports = removeImports(transformed);

    // Remove export default from non-entry files
    const withoutExports = isEntry ? withoutImports : removeExportDefault(withoutImports);

    modules.push({
      path: filePath,
      code: withoutExports,
      isEntry
    });
  }

  // Combine all modules into one
  const bundledCode = modules.map(m => m.code).join("\n\n");

  return bundledCode;
}

/**
 * Remove import statements from code (but keep package imports)
 * @param {string} code - JavaScript code
 * @returns {string} Code with relative imports removed, package imports kept
 */
function removeImports(code) {
  // Remove only relative import statements, keep package imports
  const lines = code.split("\n");
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("import ")) return true;

    // Keep package imports (not starting with . or /)
    const importMatch = trimmed.match(/from\s+['"]([^'"]+)['"]/);
    if (importMatch && !importMatch[1].startsWith('.') && !importMatch[1].startsWith('/')) {
      return true; // Keep package import
    }

    return false; // Remove relative import
  });

  return filteredLines.join("\n");
}

/**
 * Remove export default from code
 * @param {string} code - JavaScript code
 * @returns {string} Code without export default
 */
function removeExportDefault(code) {
  return code.replace(/export\s+default\s+/g, "");
}
