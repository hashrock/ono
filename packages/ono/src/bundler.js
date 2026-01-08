/**
 * Bundler - Bundle JSX files into a single executable module
 */

import fs from "node:fs/promises";
import { collectDependencies } from "./resolver.js";
import { transformJSX } from "./transformer.js";
import { createPluginManager } from "./plugins/plugin-manager.js";
import { createAssetLoaderPlugin } from "./plugins/asset-loader-plugin.js";

/**
 * Bundle a JSX file and all its dependencies
 * @param {string} entryFile - Absolute path to entry file
 * @param {Object} options - Bundle options
 * @param {string} [options.outputDir] - Output directory for assets
 * @param {boolean} [options.hashAssets=true] - Add hash to asset filenames
 * @param {string} [options.assetsDir='assets'] - Assets subdirectory name
 * @param {Array} [options.plugins=[]] - Array of bundler plugins
 * @returns {Promise<{code: string, assets: Array}>} Bundled code and processed assets
 */
export async function bundle(entryFile, options = {}) {
  const {
    outputDir,
    hashAssets = true,
    assetsDir = 'assets',
    plugins = []
  } = options;

  // Auto-add asset loader plugin if outputDir is provided (backward compatibility)
  const allPlugins = [...plugins];
  if (outputDir && !allPlugins.some(p => p.name === 'asset-loader')) {
    allPlugins.push(createAssetLoaderPlugin({ outputDir, hashAssets, assetsDir }));
  }

  // Create plugin manager
  const pluginManager = createPluginManager(allPlugins);

  // Collect all dependencies (including assets)
  const dependencyData = await collectDependencies(entryFile);

  // Execute collectDependencies hook for plugins (e.g., to process assets)
  await pluginManager.executeHook('collectDependencies', dependencyData);

  const { order } = dependencyData;
  const modules = [];

  // Process each module in dependency order
  for (let i = 0; i < order.length; i++) {
    const filePath = order[i];
    const isEntry = i === order.length - 1; // Last file is entry

    // Read the file
    const source = await fs.readFile(filePath, "utf-8");

    // Transform JSX to JS
    let transformed = transformJSX(source, filePath);

    // Execute afterTransform hook (e.g., to replace asset imports)
    const transformData = await pluginManager.executeHook('afterTransform', {
      transformed,
      source,
      filePath,
      isEntry
    });

    transformed = transformData.transformed;

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

  // Create initial bundle result
  let bundleResult = {
    code: bundledCode,
    assets: []
  };

  // Execute afterBundle hook (e.g., to add processed assets)
  bundleResult = await pluginManager.executeHook('afterBundle', bundleResult);

  return bundleResult;
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
