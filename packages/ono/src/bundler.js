/**
 * Bundler - Bundle JSX files into a single executable module
 */

import fs from "node:fs/promises";
import path from "node:path";
import { collectDependencies } from "./resolver.js";
import { transformJSX } from "./transformer.js";
import { copyAsset, replaceAssetImports } from "./asset-loader.js";

/**
 * Bundle a JSX file and all its dependencies
 * @param {string} entryFile - Absolute path to entry file
 * @param {Object} options - Bundle options
 * @param {string} [options.outputDir] - Output directory for assets
 * @param {boolean} [options.hashAssets=true] - Add hash to asset filenames
 * @param {string} [options.assetsDir='assets'] - Assets subdirectory name
 * @returns {Promise<{code: string, assets: Array}>} Bundled code and processed assets
 */
export async function bundle(entryFile, options = {}) {
  const { outputDir, hashAssets = true, assetsDir = 'assets' } = options;

  // Collect all dependencies (including assets)
  const { order, assets } = await collectDependencies(entryFile);

  const modules = [];
  const assetMap = new Map(); // Map of original import path to public path
  const processedAssets = [];

  // Process assets if output directory is provided
  if (outputDir && assets.size > 0) {
    for (const assetPath of assets) {
      const { outputPath, publicPath } = await copyAsset(assetPath, outputDir, {
        hash: hashAssets,
        assetsDir
      });

      processedAssets.push({
        sourcePath: assetPath,
        outputPath,
        publicPath
      });

      // Map relative import paths to public paths
      // We need to handle how this asset was imported
      // For now, we'll use the full path and handle relative paths in the replacement
      assetMap.set(assetPath, publicPath);
    }
  }

  // Process each module in dependency order
  for (let i = 0; i < order.length; i++) {
    const filePath = order[i];
    const isEntry = i === order.length - 1; // Last file is entry

    // Read the file
    const source = await fs.readFile(filePath, "utf-8");

    // Transform JSX to JS
    let transformed = transformJSX(source, filePath);

    // Replace asset imports with their public paths
    if (assetMap.size > 0) {
      transformed = replaceAssetImportsInModule(transformed, source, filePath, assetMap);
    }

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

  return {
    code: bundledCode,
    assets: processedAssets
  };
}

/**
 * Replace asset imports in a module with their public paths
 * @param {string} transformed - Transformed code
 * @param {string} source - Original source code
 * @param {string} filePath - Current file path
 * @param {Map<string, string>} assetMap - Map of absolute asset path to public path
 * @returns {string} Code with asset imports replaced
 */
function replaceAssetImportsInModule(transformed, source, filePath, assetMap) {
  const imports = source.match(/import\s+(?:[\w{},\s*]+\s+from\s+)?['"]([^'"]+)['"]/g);

  if (!imports) return transformed;

  // Create a map of relative import path to public path for this file
  const relativeAssetMap = new Map();

  for (const importStatement of imports) {
    const match = importStatement.match(/from\s+['"]([^'"]+)['"]/);
    if (!match) continue;

    const importPath = match[1];
    if (!importPath.startsWith('.')) continue;

    // Resolve the import path relative to current file
    const resolvedPath = path.resolve(path.dirname(filePath), importPath);

    // Check if this resolved path is in our asset map
    if (assetMap.has(resolvedPath)) {
      relativeAssetMap.set(importPath, assetMap.get(resolvedPath));
    }
  }

  return replaceAssetImports(transformed, relativeAssetMap);
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
