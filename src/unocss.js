/**
 * UnoCSS Integration for Mini JSX
 */

import { createGenerator, presetUno } from "unocss";
import fs from "node:fs/promises";
import path from "node:path";

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
 * @returns {Promise<string>} Combined generated CSS
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
  return css;
}
