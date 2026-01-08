/**
 * Asset Loader Plugin - Handles non-JavaScript assets as a bundler plugin
 */

import {
  isAssetFile,
  copyAsset,
  replaceAssetImports
} from '../asset-loader.js';
import path from 'node:path';

/**
 * Create asset loader plugin
 * @param {Object} options - Plugin options
 * @param {string} [options.outputDir] - Output directory for assets
 * @param {boolean} [options.hashAssets=true] - Add hash to asset filenames
 * @param {string} [options.assetsDir='assets'] - Assets subdirectory name
 * @returns {Object} Plugin object
 */
export function createAssetLoaderPlugin(options = {}) {
  const {
    outputDir,
    hashAssets = true,
    assetsDir = 'assets'
  } = options;

  // Store asset information across hooks
  const assetMap = new Map(); // Map of absolute asset path to public path
  const processedAssets = [];

  return {
    name: 'asset-loader',

    hooks: {
      /**
       * Collect asset dependencies
       * @param {Object} data - Data containing assets Set
       * @param {Object} context - Context
       * @returns {Promise<void>}
       */
      async collectDependencies(data, context) {
        const { assets } = data;

        // Process assets if output directory is provided
        if (outputDir && assets && assets.size > 0) {
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

            // Map asset path to public path
            assetMap.set(assetPath, publicPath);
          }
        }
      },

      /**
       * Transform module code to replace asset imports
       * @param {Object} data - Data containing transformed code and file info
       * @param {Object} context - Context
       * @returns {Promise<Object>} Transformed data
       */
      async afterTransform(data, context) {
        const { transformed, source, filePath } = data;

        // If no assets to process, return as-is
        if (assetMap.size === 0) {
          return data;
        }

        // Replace asset imports in the transformed code
        const transformedWithAssets = replaceAssetImportsInModule(
          transformed,
          source,
          filePath,
          assetMap
        );

        return {
          ...data,
          transformed: transformedWithAssets
        };
      },

      /**
       * Add processed assets to bundle result
       * @param {Object} bundleResult - Bundle result
       * @param {Object} context - Context
       * @returns {Promise<Object>} Bundle result with assets
       */
      async afterBundle(bundleResult, context) {
        return {
          ...bundleResult,
          assets: processedAssets
        };
      }
    }
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
