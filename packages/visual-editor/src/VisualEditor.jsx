import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { ID_ATTR, splitId } from './jsx-source.js';
import { EXAMPLE_ENTRY, EXAMPLE_FILES } from './example.js';
import { DEFAULT_SNIPPETS } from './snippets.js';
import { initialState, reducer, elementsOf } from './editor.js';
import { useCompiler } from './useCompiler.js';
import { Editor } from './components/Editor.jsx';
import { Preview, instancesOf } from './components/Preview.jsx';
import { Inspector } from './components/Inspector.jsx';
import { Palette } from './components/Palette.jsx';
import './styles.css';

/**
 * The visual editor as a single React component.
 *
 * `files` seeds the editor and reloads it whenever a *different* object is
 * passed in, so it works both uncontrolled (pass it once) and as a
 * "reset by identity" control (pass a new object to load another project).
 * The objects handed to `onChange` are never fed back as a reload.
 *
 * The component fills its container: give the parent a height.
 *
 * @param {object} props
 * @param {Record<string, string>} [props.files] Project sources by filename. Defaults to the bundled example.
 * @param {string} [props.entry] Entry file compiled for the preview. Default `'index.jsx'`.
 * @param {(files: Record<string, string>) => void} [props.onChange] Called after every edit with the full file map.
 * @param {(selection: { filename: string, index: number, tag: string } | null) => void} [props.onSelect] Called when the selected element changes.
 * @param {import('./snippets.js').Snippet[]} [props.snippets] Insert palette. Defaults to `DEFAULT_SNIPPETS`.
 * @param {() => Worker} [props.createWorker] Compiler worker factory. Defaults to the bundled Ono compiler worker.
 * @param {boolean} [props.header] Show the toolbar row. Default `true`.
 * @param {import('react').ReactNode} [props.title] Toolbar title. Default `'Ono Visual Editor'`.
 * @param {import('react').ReactNode} [props.tagline] Toolbar subtitle.
 * @param {import('react').ReactNode} [props.actions] Extra toolbar buttons, rendered before Undo / Redo / Run.
 * @param {boolean} [props.statusBar] Show the status line. Default `true`.
 * @param {boolean} [props.globalShortcuts] Bind undo / delete / duplicate on `window`. Default `true`; set false to keep them inside the preview only.
 * @param {string} [props.className] Added to the root element.
 * @param {import('react').CSSProperties} [props.style] Applied to the root element.
 */
export function VisualEditor({
  files: filesProp,
  entry = EXAMPLE_ENTRY,
  onChange,
  onSelect,
  snippets = DEFAULT_SNIPPETS,
  createWorker,
  header = true,
  title = 'Ono Visual Editor',
  tagline = 'Click an element to edit it, drag it to move it — the JSX follows.',
  actions,
  statusBar = true,
  globalShortcuts = true,
  className = '',
  style,
}) {
  const [state, dispatch] = useReducer(reducer, null, () => initialState({ ...(filesProp ?? EXAMPLE_FILES) }, entry));
  const { files, currentFile, selection, past, future } = state;
  const { compileNow, compileSoon, status, output } = useCompiler(entry, createWorker);
  const iframeRef = useRef(null);
  const editorRef = useRef(null);

  // compile whenever an action changed the files: right away for commands, after a pause while typing
  useEffect(() => {
    if (state.compile === 'now') compileNow(files);
    else if (state.compile === 'soon') compileSoon(files);
  }, [state.version]);

  // ------------------------------------------------------------ files in / out
  // The last map we handed to onChange; a `files` prop that is not it is a request to load.
  const emitted = useRef(state.files);
  useEffect(() => {
    if (state.files === emitted.current) return;
    emitted.current = state.files;
    onChange?.(state.files);
  }, [state.files]);

  useEffect(() => {
    if (!filesProp || filesProp === emitted.current) return;
    emitted.current = filesProp;
    dispatch({ type: 'load', files: { ...filesProp }, currentFile: entry });
  }, [filesProp]);

  // ------------------------------------------------------------ selection
  const selected = useMemo(() => {
    if (!selection) return null;
    const { filename, index } = splitId(selection.id);
    const source = files[filename];
    if (source === undefined) return null;
    let element;
    try {
      element = elementsOf(filename, source)[index];
    } catch {
      return null;
    }
    if (!element) return null;
    const instanceCount = instancesOf(iframeRef.current?.contentDocument, selection.id).length;
    return {
      target: { filename, index },
      filename,
      source,
      element,
      nth: Math.min(selection.nth, Math.max(0, instanceCount - 1)),
      instanceCount,
    };
  }, [selection, files, output]);

  const select = useCallback((next) => {
    dispatch({ type: 'select', selection: typeof next === 'string' ? { id: next, nth: 0 } : next });
  }, []);

  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  useEffect(() => {
    selectRef.current?.(selected && { filename: selected.filename, index: selected.target.index, tag: selected.element.tag });
  }, [selection]);

  // show the selected element's source: switch tab and highlight the range
  useEffect(() => {
    if (!selected) return;
    dispatch({ type: 'switchFile', filename: selected.filename });
    requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (!editor) return;
      const { start, end } = selected.element;
      editor.focus({ preventScroll: true });
      editor.setSelectionRange(start, end);
      const line = editor.value.slice(0, start).split('\n').length - 1;
      editor.scrollTop = Math.max(0, line * parseFloat(getComputedStyle(editor).lineHeight) - editor.clientHeight / 3);
      editor.blur();
    });
  }, [selection]);

  // ------------------------------------------------------------ DOM → command targets
  /**
   * The source element a DOM element stands for when moved or used as a drop
   * target. Usually the element itself; for the root of a component (e.g.
   * Card's outer div) it is the component's usage (`<Card>`) in the file that
   * renders it, found by matching the instance's position among its DOM
   * siblings from other files against the non-host children of the parent.
   */
  const targetFor = (dom) => {
    const { filename, index } = splitId(dom.getAttribute(ID_ATTR));
    const element = elementsOf(filename, files[filename])[index];
    if (element.parent) return { filename, index };
    const parentDom = dom.parentElement?.closest(`[${ID_ATTR}]`);
    if (!parentDom) return null;
    const p = splitId(parentDom.getAttribute(ID_ATTR));
    const parentEl = elementsOf(p.filename, files[p.filename])[p.index];
    const roots = [...parentDom.children].filter((c) => c.hasAttribute(ID_ATTR) && splitId(c.getAttribute(ID_ATTR)).filename !== p.filename);
    const usages = parentEl.children.filter((c) => c.type === 'element' && !c.element.host).map((c) => c.element);
    const usage = usages[roots.indexOf(dom)];
    return usage ? { filename: p.filename, index: usage.index } : null;
  };

  const onMove = (fromDom, toDom, position) => {
    const target = targetFor(fromDom);
    const to = targetFor(toDom);
    if (!target || !to || target.filename !== to.filename) return;
    const nth = [...instancesOf(fromDom.ownerDocument, fromDom.getAttribute(ID_ATTR))].indexOf(fromDom);
    dispatch({ type: 'move', target, to, position, nth });
  };

  const onDropSnippet = (targetDom, position, code) => {
    const target = targetFor(targetDom);
    if (target) dispatch({ type: 'insert', target, position, code });
  };

  const onClickSnippet = (code) => {
    if (selected) dispatch({ type: 'insert', target: selected.target, position: 'after', code });
  };

  /**
   * Keyboard shortcuts, shared by the app window and the preview iframe.
   * Skipped while typing in a text field so native undo / delete keep working there.
   */
  const onShortcut = (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    if (mod && (key === 'z' || key === 'y')) {
      e.preventDefault();
      return dispatch({ type: key === 'y' || e.shiftKey ? 'redo' : 'undo' });
    }
    if (e.key === 'Escape') return select(null);
    const isDelete = e.key === 'Delete' || e.key === 'Backspace';
    const isDuplicate = mod && key === 'd';
    if (!(isDelete || isDuplicate) || !selected) return;
    e.preventDefault();
    dispatch({ type: isDelete ? 'remove' : 'duplicate', target: selected.target });
  };
  const shortcutRef = useRef(onShortcut);
  shortcutRef.current = onShortcut;
  useEffect(() => {
    if (!globalShortcuts) return;
    const listener = (e) => shortcutRef.current(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [globalShortcuts]);

  return (
    <div className={('ono-ve ' + className).trim()} style={style}>
      {header && (
        <header>
          {title && <h1>{title}</h1>}
          {tagline && <span className="tagline">{tagline}</span>}
          <span className="spacer" />
          {actions}
          <button onClick={() => dispatch({ type: 'undo' })} disabled={past.length === 0} title="Undo (⌘/Ctrl+Z)">
            Undo
          </button>
          <button onClick={() => dispatch({ type: 'redo' })} disabled={future.length === 0} title="Redo (⌘/Ctrl+Shift+Z or ⌘/Ctrl+Y)">
            Redo
          </button>
          <button className="primary" onClick={() => compileNow(files)}>
            Run (⌘/Ctrl+Enter)
          </button>
        </header>
      )}

      <div className="container">
        <Editor
          files={files}
          currentFile={currentFile}
          onSwitch={(filename) => dispatch({ type: 'switchFile', filename })}
          onChange={(filename, source) => dispatch({ type: 'setSource', filename, source })}
          onRun={() => compileNow(files)}
          editorRef={editorRef}
        />

        <div className="panel">
          <div className="panel-header">
            Preview
            <span className="spacer" />
            <label className="checkbox">
              <input type="checkbox" checked={state.selectMode} onChange={(e) => dispatch({ type: 'setSelectMode', on: e.target.checked })} />
              select mode
            </label>
          </div>
          <Palette snippets={snippets} canClick={Boolean(selected)} onInsert={onClickSnippet} />
          <div className="fill">
            <Preview
              output={output}
              selection={selection}
              selectMode={state.selectMode}
              onSelect={select}
              onShortcut={onShortcut}
              onMove={onMove}
              onDropSnippet={onDropSnippet}
              iframeRef={iframeRef}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">Inspector</div>
          <div className="inspector">
            <Inspector selected={selected} dispatch={dispatch} />
          </div>
        </div>
      </div>

      {statusBar && <div className={'status' + (status.kind ? ` ${status.kind}` : '')}>{status.text}</div>}
    </div>
  );
}
