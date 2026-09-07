export const SNIPPET_MIME = 'application/x-ono-snippet';

/**
 * Insert palette: drag a tile into the preview to drop it before/after an
 * element, or click it to insert after the selected element.
 * @param {{ snippets: import('../snippets.js').Snippet[], canClick: boolean, onInsert: (code: string) => void }} props
 */
export function Palette({ snippets, canClick, onInsert }) {
  return (
    <div className="palette">
      {snippets.map(({ label, icon, code }) => (
        <button
          key={label}
          className="tile"
          draggable
          disabled={!canClick}
          title={canClick ? `Click: insert after selection · Drag: drop anywhere` : 'Drag into the preview (or select an element to click-insert)'}
          onDragStart={(e) => {
            e.dataTransfer.setData(SNIPPET_MIME, code);
            e.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => onInsert(code)}
        >
          <span className="tile-icon">{icon}</span>
          {label}
        </button>
      ))}
    </div>
  );
}
