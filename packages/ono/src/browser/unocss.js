/**
 * Lightweight UnoCSS helpers for browser environments.
 */

import { createGenerator } from '@unocss/core';
import { presetUno } from '@unocss/preset-uno';

/** @type {string | null} */
let cachedGeneratorKey = null;
/** @type {Promise<any> | null} */
let cachedGeneratorPromise = null;

/** @param {object} [config] */
function serializeConfig(config = {}) {
  try {
    return JSON.stringify(config);
  } catch {
    return '__dynamic__';
  }
}

/** @param {object} [config] */
export async function getUnoGenerator(config = {}) {
  const key = serializeConfig(config);
  if (!cachedGeneratorPromise || cachedGeneratorKey !== key) {
    cachedGeneratorKey = key;
    cachedGeneratorPromise = createGenerator({
      presets: [/** @type {any} */ (presetUno())],
      ...config,
    });
  }
  return cachedGeneratorPromise;
}
