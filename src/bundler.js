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
 * Remove import statements from code
 * @param {string} code - JavaScript code
 * @returns {string} Code without imports
 */
function removeImports(code) {
  // Remove import statements
  const lines = code.split("\n");
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    return !trimmed.startsWith("import ") && trimmed !== "import";
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
