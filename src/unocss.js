/**
 * UnoCSS Integration for Mini JSX
 */

import { createGenerator, presetUno } from "unocss";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the Tailwind reset CSS
 * @returns {Promise<string>} Reset CSS content
 */
async function getResetCSS() {
  const resetPath = path.resolve(__dirname, "../node_modules/@unocss/reset/tailwind.css");
  try {
    return await fs.readFile(resetPath, "utf-8");
  } catch {
    // Fallback: try to find it relative to the package
    try {
      const fallbackPath = new URL("../node_modules/@unocss/reset/tailwind.css", import.meta.url);
      return await fs.readFile(fileURLToPath(fallbackPath), "utf-8");
    } catch {
      return "";
    }
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
 * Load UnoCSS config from file
 * @param {string} configPath - Path to config file
 * @returns {Promise<object>} Configuration object
 */
export async function loadUnoConfig(configPath) {
  try {
    const configUrl = `file://${path.resolve(configPath)}?t=${Date.now()}`;
    const module = await import(configUrl);
    return module.default || module;
  } catch (error) {
    // Config file doesn't exist, return empty config
    return {};
  }
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
