/** File tabs plus one textarea per file. The active file's textarea is shown; others stay mounted to keep scroll/caret. */
export function Editor({ files, currentFile, onSwitch, onChange, onRun, editorRef }) {
  const names = Object.keys(files).sort();

  const onKeyDown = (e, filename) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const { selectionStart: s, selectionEnd: en, value } = ta;
      onChange(filename, value.slice(0, s) + '  ' + value.slice(en));
      requestAnimationFrame(() => ta.setSelectionRange(s + 2, s + 2));
    }
  };

  return (
    <div className="code">
      {names.length > 1 && (
        <div className="file-tabs">
          {names.map((name) => (
            <button key={name} className={'file-tab' + (name === currentFile ? ' active' : '')} onClick={() => onSwitch(name)}>
              {name}
            </button>
          ))}
        </div>
      )}
      <div className="fill">
        {names.map((name) => (
          <textarea
            key={name}
            ref={name === currentFile ? editorRef : undefined}
            className={'editor' + (name === currentFile ? ' active' : '')}
            value={files[name]}
            spellCheck={false}
            onChange={(e) => onChange(name, e.target.value)}
            onKeyDown={(e) => onKeyDown(e, name)}
          />
        ))}
      </div>
    </div>
  );
}
