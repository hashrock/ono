import { useEffect, useRef } from 'react';
import { injectHead } from '@hashrock/ono/browser/playground';
import { ID_ATTR } from '../../jsx-source.js';
import { SNIPPET_MIME } from './Palette.jsx';

const OVERLAY_CSS = `
  [${ID_ATTR}] { cursor: default; }
  [data-ono-hover] { outline: 1px dashed #0e639c !important; outline-offset: -1px; }
  [data-ono-selected] { outline: 2px solid #0e639c !important; outline-offset: -2px; }
  body[data-ono-dragging], body[data-ono-dragging] * { cursor: grabbing !important; user-select: none; }
  [data-ono-dragged] { opacity: 0.4; }
  #ono-drop-line { position: absolute; background: #0e639c; pointer-events: none; z-index: 2147483647; border-radius: 2px; }
`;
const DRAG_THRESHOLD = 5;

/** All DOM elements rendered from one source element (several when its component is used more than once). */
export function instancesOf(doc, id) {
  return doc ? doc.querySelectorAll(`[${ID_ATTR}="${CSS.escape(id)}"]`) : [];
}

/** { id, nth } locator for a DOM element */
function locate(doc, target) {
  const id = target.getAttribute(ID_ATTR);
  return { id, nth: [...instancesOf(doc, id)].indexOf(target) };
}

/**
 * Where a drop over `target` would land. The axis follows the layout: when a
 * sibling sits beside the target on the same row, the choice is left/right,
 * otherwise above/below.
 */
function dropPosition(target, x, y) {
  const rect = target.getBoundingClientRect();
  const horizontal = [...target.parentElement.children].some((sib) => {
    if (sib === target) return false;
    const r = sib.getBoundingClientRect();
    return r.top < rect.bottom && r.bottom > rect.top && (r.right <= rect.left || r.left >= rect.right);
  });
  const before = horizontal ? x < rect.left + rect.width / 2 : y < rect.top + rect.height / 2;
  return { position: before ? 'before' : 'after', horizontal, rect };
}

/**
 * Renders the compiled document into an iframe and reports clicks / hovers /
 * shortcuts / drag-and-drop moves (`onMove(fromDom, toDom, position)` gets the
 * DOM elements so the caller can map component roots back to their usage).
 * `selection` is { id, nth } — the nth DOM instance of a source element.
 */
export function Preview({ output, selection, selectMode, onSelect, onShortcut, onMove, onDropSnippet, iframeRef }) {
  // latest callbacks for listeners attached once per document
  const handlers = useRef({});
  handlers.current = { selectMode, onSelect, onShortcut, onMove, onDropSnippet };

  useEffect(() => {
    if (!output) return;
    const doc = iframeRef.current.contentDocument;
    doc.open();
    doc.write(injectHead(output.html, `<style id="uno-css">${output.css}</style><style id="ono-overlay">${OVERLAY_CSS}</style>`));
    doc.close();

    const targetOf = (e) => e.target.closest?.(`[${ID_ATTR}]`) ?? null;
    const setHover = (target) => {
      doc.querySelector('[data-ono-hover]')?.removeAttribute('data-ono-hover');
      target?.setAttribute('data-ono-hover', '');
    };

    // ---- drag & drop: press on an element, move past the threshold, release over a sibling-to-be
    let drag = null; // { source: Element, startX, startY, active, drop: { target, position } | null }
    const dropLine = doc.createElement('div');
    dropLine.id = 'ono-drop-line';

    const showDropLine = (rect, position, horizontal) => {
      const { scrollX, scrollY } = doc.defaultView;
      if (horizontal) {
        Object.assign(dropLine.style, {
          left: `${scrollX + (position === 'before' ? rect.left : rect.right) - 2}px`,
          top: `${scrollY + rect.top}px`,
          width: '4px',
          height: `${rect.height}px`,
        });
      } else {
        Object.assign(dropLine.style, {
          left: `${scrollX + rect.left}px`,
          top: `${scrollY + (position === 'before' ? rect.top : rect.bottom) - 2}px`,
          width: `${rect.width}px`,
          height: '4px',
        });
      }
      if (!dropLine.isConnected) doc.body.append(dropLine);
    };

    const endDrag = () => {
      if (!drag) return;
      const { active, source, drop } = drag;
      drag = null;
      doc.body.removeAttribute('data-ono-dragging');
      source.removeAttribute('data-ono-dragged');
      dropLine.remove();
      if (active && drop) handlers.current.onMove(source, drop.target, drop.position);
      return active;
    };

    doc.addEventListener('mousedown', (e) => {
      if (!handlers.current.selectMode || e.button !== 0) return;
      const target = targetOf(e);
      if (target) drag = { source: target, startX: e.clientX, startY: e.clientY, active: false, drop: null };
    });

    doc.addEventListener('mousemove', (e) => {
      if (!drag) return;
      if (!drag.active) {
        if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < DRAG_THRESHOLD) return;
        drag.active = true;
        doc.body.setAttribute('data-ono-dragging', '');
        drag.source.setAttribute('data-ono-dragged', '');
        setHover(null);
      }
      drag.drop = trackDrop(e.clientX, e.clientY, drag.source);
    });

    /** Element under the cursor (excluding `exclude` and its subtree); updates the drop line. Returns { target, position } | null. */
    const trackDrop = (x, y, exclude = null) => {
      let target = doc.elementFromPoint(x, y)?.closest(`[${ID_ATTR}]`) ?? null;
      while (target && exclude && (target === exclude || exclude.contains(target))) target = target.parentElement?.closest(`[${ID_ATTR}]`) ?? null;
      if (!target) {
        dropLine.remove();
        return null;
      }
      const { position, horizontal, rect } = dropPosition(target, x, y);
      showDropLine(rect, position, horizontal);
      return { target, position };
    };

    // ---- native drag & drop from the insert palette (crosses the iframe boundary)
    let snippetDrop = null;
    doc.addEventListener('dragover', (e) => {
      if (![...e.dataTransfer.types].includes(SNIPPET_MIME)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      snippetDrop = trackDrop(e.clientX, e.clientY);
    });
    doc.addEventListener('dragleave', (e) => {
      if (e.relatedTarget === null) {
        dropLine.remove();
        snippetDrop = null;
      }
    });
    doc.addEventListener('drop', (e) => {
      const code = e.dataTransfer.getData(SNIPPET_MIME);
      if (!code) return;
      e.preventDefault();
      dropLine.remove();
      if (snippetDrop) handlers.current.onDropSnippet(snippetDrop.target, snippetDrop.position, code);
      snippetDrop = null;
    });

    doc.addEventListener('mouseup', () => {
      if (endDrag()) suppressClick = true;
    });
    doc.addEventListener('mouseleave', () => {
      endDrag();
      setHover(null);
    });

    let suppressClick = false;
    doc.addEventListener('click', (e) => {
      if (!handlers.current.selectMode) return;
      e.preventDefault();
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      const target = targetOf(e);
      handlers.current.onSelect(target ? locate(doc, target) : null);
    });
    doc.addEventListener('mouseover', (e) => handlers.current.selectMode && !drag?.active && setHover(targetOf(e)));
    doc.addEventListener('keydown', (e) => handlers.current.onShortcut(e));
  }, [output]);

  // (re)apply the selection outline after every render of the document or change of selection
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.querySelectorAll('[data-ono-selected]').forEach((el) => el.removeAttribute('data-ono-selected'));
    if (!selection) return;
    // The document may still be the previous compile (e.g. right after an insert);
    // then there is nothing to outline yet — the selection itself is resolved from source by the app.
    const instances = instancesOf(doc, selection.id);
    if (instances.length === 0) return;
    // keep the same instance across rerenders; fall back to the last one when it disappeared
    instances[Math.min(selection.nth, instances.length - 1)].setAttribute('data-ono-selected', '');
  }, [output, selection]);

  return <iframe id="preview" ref={iframeRef} title="preview" />;
}
