/**
 * UnoCSS Integration for Ono
 */

import { createGenerator } from "@unocss/core";
import { presetUno } from "@unocss/preset-uno";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * Get the Tailwind reset CSS
 * @returns {Promise<string>} Reset CSS content
 */
async function getResetCSS() {
  try {
    return await fs.readFile(require.resolve("@unocss/reset/tailwind.css"), "utf-8");
  } catch {
    return "";
  }
}

/**
 * Create UnoCSS generator with default config
 * @param {object} userConfig - User configuration
 * @returns {Promise<object>} UnoCSS generator instance
 */
export async function createUnoGenerator(userConfig = {}) {
  return await createGenerator({
    presets: [presetUno()],
    ...userConfig,
  });
}

/**
 * Load UnoCSS config from file (defaults to uno.config.js in the project root).
 * Returns an empty config when the file doesn't exist; errors inside an
 * existing config file are NOT swallowed.
 * @param {string} [configPath] - Path to config file
 * @returns {Promise<object>} Configuration object
 */
export async function loadUnoConfig(configPath) {
  const resolved = path.resolve(process.cwd(), configPath || "uno.config.js");
  if (!existsSync(resolved)) {
    return {};
  }
  const configUrl = `${pathToFileURL(resolved).href}?t=${Date.now()}`;
  const module = await import(configUrl);
  return module.default || module;
}

/**
 * Generate CSS from HTML content
 * @param {string} html - HTML content to scan for classes
 * @param {object} config - UnoCSS configuration
 * @returns {Promise<string>} Generated CSS
 */
export async function generateCSS(html, config = {}) {
  const uno = await createUnoGenerator(config);
  const { css } = await uno.generate(html);
  return css;
}

/**
 * Extract and generate UnoCSS for multiple HTML files
 * @param {string[]} htmlFiles - Array of HTML file paths
 * @param {object} config - UnoCSS configuration
 * @returns {Promise<string>} Combined generated CSS with reset
 */
export async function generateCSSFromFiles(htmlFiles, config = {}) {
  const uno = await createUnoGenerator(config);

  // Read all HTML files
  const htmlContents = await Promise.all(
    htmlFiles.map(async (file) => {
      try {
        return await fs.readFile(file, "utf-8");
      } catch {
        return "";
      }
    })
  );

  // Combine all HTML content
  const combinedHTML = htmlContents.join("\n");

  // Generate CSS
  const { css } = await uno.generate(combinedHTML);

  // Prepend reset CSS
  const resetCSS = await getResetCSS();
  return resetCSS + "\n" + css;
}
