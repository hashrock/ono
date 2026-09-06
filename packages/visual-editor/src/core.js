/**
 * Headless core of the visual editor: parsing and rewriting JSX sources, the
 * edit-command reducer, and the UnoCSS control model. Pure JS — no React, no
 * DOM — so it runs in Node and can back a different UI.
 *
 *   import { parseElements, setAttr, reducer } from '@hashrock/ono-visual-editor/core';
 */
export * from './jsx-source.js';
export * from './editor.js';
export * from './uno-controls.js';
