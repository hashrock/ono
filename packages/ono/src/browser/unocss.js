/**
 * Lightweight UnoCSS helpers for browser environments.
 */

import { createGenerator } from '@unocss/core';
import { presetUno } from '@unocss/preset-uno';

let cachedGeneratorKey = null;
let cachedGeneratorPromise = null;

function serializeConfig(config = {}) {
  try {
    return JSON.stringify(config);
  } catch {
    return '__dynamic__';
  }
}

export async function getUnoGenerator(config = {}) {
  const key = serializeConfig(config);
  if (!cachedGeneratorPromise || cachedGeneratorKey !== key) {
    cachedGeneratorKey = key;
    cachedGeneratorPromise = createGenerator({
      presets: [presetUno()],
      ...config,
    });
  }
  return cachedGeneratorPromise;
}
