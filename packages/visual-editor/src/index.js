/**
 * @hashrock/ono-visual-editor — the visual editor as a React component.
 *
 *   import { VisualEditor } from '@hashrock/ono-visual-editor';
 *   import '@hashrock/ono-visual-editor/style.css';
 *
 *   <VisualEditor files={files} entry="index.jsx" onChange={setFiles} />
 *
 * The headless source-editing logic (no React, no DOM) lives in
 * `@hashrock/ono-visual-editor/core`.
 */
export { VisualEditor } from './VisualEditor.jsx';
export { DEFAULT_SNIPPETS } from './snippets.js';
export { EXAMPLE_FILES, EXAMPLE_ENTRY } from './example.js';
