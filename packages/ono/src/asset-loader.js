/**
 * Asset Loader - Handle non-JavaScript assets (images, fonts, etc.)
 */

import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";

/**
 * Supported asset file extensions
 */
export const ASSET_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.mp4', '.webm', '.ogg',
  '.mp3', '.wav',
  '.pdf',
  '.ico',
  '.avif'
]);

/**
 * Check if a file path is an asset file
 * @param {string} filePath - File path to check
 * @returns {boolean} True if file is an asset
 */
export function isAssetFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  return ASSET_EXTENSIONS.has(ext);
}

/**
 * Generate a hash for file content
 * @param {Buffer|string} content - File content
 * @returns {string} Hash string (first 8 characters)
 */
export function generateFileHash(content) {
  const hash = createHash('md5');
  hash.update(content);
  return hash.digest('hex').substring(0, 8);
}

/**
 * Generate output filename with hash
 * @param {string} originalPath - Original file path
 * @param {string} hash - File hash
 * @returns {string} Filename with hash (e.g., "logo-a1b2c3d4.png")
 */
export function generateAssetFilename(originalPath, hash) {
  const ext = extname(originalPath);
  const name = basename(originalPath, ext);
  return `${name}-${hash}${ext}`;
}

/**
 * Copy asset file to output directory
 * @param {string} sourcePath - Source file path
 * @param {string} outputDir - Output directory
 * @param {Object} options - Options
 * @param {boolean} [options.hash=true] - Add hash to filename
 * @param {string} [options.assetsDir='assets'] - Assets subdirectory name
 * @returns {Promise<{outputPath: string, publicPath: string}>}
 */
export async function copyAsset(sourcePath, outputDir, options = {}) {
  const { hash = true, assetsDir = 'assets' } = options;

  // Read file content
  const content = await readFile(sourcePath);

  // Generate filename
  let filename;
  if (hash) {
    const fileHash = generateFileHash(content);
    filename = generateAssetFilename(sourcePath, fileHash);
  } else {
    filename = basename(sourcePath);
  }

  // Create output path
  const assetOutputDir = join(outputDir, assetsDir);
  await mkdir(assetOutputDir, { recursive: true });

  const outputPath = join(assetOutputDir, filename);
  const publicPath = `/${assetsDir}/${filename}`;

  // Copy file
  await copyFile(sourcePath, outputPath);

  return {
    outputPath,
    publicPath
  };
}

/**
 * Process asset imports in code
 * @param {string} code - JavaScript code with imports
 * @param {Map<string, string>} assetMap - Map of import path to public path
 * @returns {string} Code with asset imports replaced
 */
export function replaceAssetImports(code, assetMap) {
  let result = code;

  for (const [importPath, publicPath] of assetMap.entries()) {
    // Match various import patterns:
    // import logo from './logo.png'
    // import { default as logo } from './logo.png'

    // Pattern 1: import identifier from 'path'
    const pattern1 = new RegExp(
      `import\\s+(\\w+)\\s+from\\s+['"]${escapeRegExp(importPath)}['"]`,
      'g'
    );

    // Pattern 2: import { default as identifier } from 'path'
    const pattern2 = new RegExp(
      `import\\s+\\{\\s*default\\s+as\\s+(\\w+)\\s*\\}\\s+from\\s+['"]${escapeRegExp(importPath)}['"]`,
      'g'
    );

    // Replace with const assignment
    result = result.replace(pattern1, (match, identifier) => {
      return `const ${identifier} = ${JSON.stringify(publicPath)}`;
    });

    result = result.replace(pattern2, (match, identifier) => {
      return `const ${identifier} = ${JSON.stringify(publicPath)}`;
    });
  }

  return result;
}

/**
 * Escape special regex characters
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Collect all asset imports from parsed imports
 * @param {Array<{specifier: string, resolved: string}>} imports - Parsed imports with resolved paths
 * @returns {Array<string>} Array of resolved asset file paths
 */
export function collectAssetImports(imports) {
  return imports
    .filter(imp => imp.resolved && isAssetFile(imp.resolved))
    .map(imp => imp.resolved);
}
