/**
 * Small helpers shared by the browser playgrounds (REPL, visual editor).
 * Pure JS, no bundler-specific imports.
 */

/**
 * @template {(...args: any[]) => void} F
 * @param {F} fn
 * @param {number} delay
 * @returns {F & { cancel: () => void }}
 */
export function debounce(fn, delay) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  const debounced = /** @type {any} */ ((/** @type {any[]} */ ...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  });
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

/**
 * Turn rendered HTML into a full document with the given markup placed in
 * <head>. Handles fragments (no <html>), documents without <head>, and
 * documents with an open or complete <head>.
 * @param {string} html
 * @param {string} headMarkup
 */
export function injectHead(html, headMarkup) {
  if (!/<html[\s>]/i.test(html)) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8">${headMarkup}</head><body>${html}</body></html>`;
  }
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${headMarkup}</head>`);
  if (/<head[\s>]/i.test(html)) return html.replace(/<head([^>]*)>/i, `<head$1>${headMarkup}`);
  return html.replace(/<html([^>]*)>/i, `<html$1><head>${headMarkup}</head>`);
}
