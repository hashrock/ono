/**
 * Editor state and the commands that change it. Pure: no DOM, no React —
 * every edit is a command that rewrites one file's source, so it can be
 * tested in Node and replayed for undo / redo.
 *
 * A source element is addressed by `{ filename, index }` (its position in
 * parseElements' output). The selection additionally carries `nth`, the DOM
 * instance to outline when a component is rendered several times.
 */
import { parseElements, setAttr, setText, removeElement, duplicateElement, moveElementTo, insertSnippet } from '../jsx-source.js';

/** Parse cache keyed by filename; a file is re-parsed only when its source changed. */
const parsed = new Map();
export function elementsOf(filename, source) {
  const hit = parsed.get(filename);
  if (hit && hit.source === source) return hit.elements;
  const elements = parseElements(source, filename);
  parsed.set(filename, { source, elements });
  return elements;
}

export const targetId = ({ filename, index }) => `${filename}#${index}`;

/**
 * @typedef {{ filename: string, index: number }} Target
 * @typedef {{ id: string, nth: number } | null} Selection
 * @typedef {{
 *   files: Record<string, string>,
 *   currentFile: string,
 *   selection: Selection, selectMode: boolean,
 *   past: Snapshot[], future: Snapshot[],
 *   version: number, compile: 'now' | 'soon' | null,
 * }} State
 * @typedef {{ files: Record<string, string>, selection: Selection }} Snapshot
 */

/** @param {Record<string, string>} files @param {string} currentFile */
export function initialState(files, currentFile) {
  return { files, currentFile, selection: null, selectMode: true, past: [], future: [], version: 0, compile: 'now' };
}

/**
 * Run an edit command against its target. Returns the new source and what to
 * select afterwards: a start offset of the element to select, 'keep', or null.
 * @param {string} source @param {any[]} elements @param {any} action
 */
function runEdit(source, elements, action) {
  const el = elements[action.target.index];
  switch (action.type) {
    case 'setAttr':
      return { source: setAttr(source, el, action.name, action.value), select: 'keep' };
    case 'setText':
      return { source: setText(source, el, action.text), select: 'keep' };
    case 'remove':
      return { source: removeElement(source, el), select: null };
    case 'duplicate':
      return { source: duplicateElement(source, el), select: 'keep' };
    case 'move': {
      const moved = moveElementTo(source, el, elements[action.to.index], action.position);
      return { source: moved.source, select: el.host ? moved.start : null };
    }
    case 'insert': {
      const inserted = insertSnippet(source, el, action.code, action.position);
      return { source: inserted.source, select: inserted.start };
    }
    default:
      throw new Error(`Unknown edit command: ${action.type}`);
  }
}

export const EDIT_COMMANDS = new Set(['setAttr', 'setText', 'remove', 'duplicate', 'move', 'insert']);

/** @param {State} state @param {any} action */
function applyEdit(state, action) {
  const { filename } = action.target;
  const source = state.files[filename];
  const result = runEdit(source, elementsOf(filename, source), action);
  if (result.source === source) return state;

  let selection = state.selection;
  if (result.select === null) selection = null;
  else if (typeof result.select === 'number') {
    const index = elementsOf(filename, result.source).findIndex((el) => el.start === result.select);
    selection = index === -1 ? null : { id: targetId({ filename, index }), nth: action.nth ?? 0 };
  }

  return {
    ...state,
    files: { ...state.files, [filename]: result.source },
    selection,
    past: [...state.past, { files: state.files, selection: state.selection }],
    future: [],
    version: state.version + 1,
    compile: 'now',
  };
}

/** @param {State} state @param {any} action @returns {State} */
export function reducer(state, action) {
  if (EDIT_COMMANDS.has(action.type)) return applyEdit(state, action);

  switch (action.type) {
    case 'select':
      return { ...state, selection: action.selection, compile: null };
    case 'setSelectMode':
      return { ...state, selectMode: action.on, selection: action.on ? state.selection : null, compile: null };
    case 'switchFile':
      return { ...state, currentFile: action.filename, compile: null };
    case 'setSource': // typing in the editor: not undoable as a step, compiles after a pause
      return {
        ...state,
        files: { ...state.files, [action.filename]: action.source },
        future: [],
        version: state.version + 1,
        compile: 'soon',
      };
    case 'undo': {
      const snapshot = state.past.at(-1);
      if (!snapshot) return state;
      return {
        ...state,
        ...snapshot,
        past: state.past.slice(0, -1),
        future: [{ files: state.files, selection: state.selection }, ...state.future],
        version: state.version + 1,
        compile: 'now',
      };
    }
    case 'redo': {
      const [snapshot, ...future] = state.future;
      if (!snapshot) return state;
      return {
        ...state,
        ...snapshot,
        past: [...state.past, { files: state.files, selection: state.selection }],
        future,
        version: state.version + 1,
        compile: 'now',
      };
    }
    case 'load':
      return { ...initialState(action.files, action.currentFile), version: state.version + 1 };
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}
