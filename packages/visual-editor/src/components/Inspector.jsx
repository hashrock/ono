import { CLASS_ATTRS, findAttr, getText } from '../../jsx-source.js';
import { classList } from '../../uno-controls.js';
import { targetId } from '../editor.js';
import { ClassEditor } from './ClassEditor.jsx';
import { CommitInput } from './CommitInput.jsx';

function Field({ label, hint, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

function ButtonRow({ title, buttons }) {
  return (
    <div>
      <div className="section-title">{title}</div>
      <div className="row">
        {buttons.map(({ label, onClick, disabled = false, className = '' }) => (
          <button key={label} className={className} disabled={disabled} onClick={onClick}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Shows the selected element and turns every control into an edit command.
 * @param {{ selected: null | { target: { filename: string, index: number }, filename: string, source: string, element: any, nth: number, instanceCount: number },
 *           dispatch: (action: any) => void }} props
 */
export function Inspector({ selected, dispatch }) {
  if (!selected) {
    return (
      <p className="empty">
        Nothing selected.
        <br />
        Click an element in the preview to inspect it.
        <br />
        <br />
        Drag an element to move it. Drag a palette tile into the preview to insert it.
        <br />
        <br />
        Shortcuts: <b>⌘/Ctrl+Z</b> undo, <b>⌘/Ctrl+Shift+Z</b> / <b>⌘/Ctrl+Y</b> redo, <b>Delete</b> remove, <b>⌘/Ctrl+D</b> duplicate, <b>Esc</b> deselect (not while typing in a text field).
      </p>
    );
  }

  const { target, filename, source, element, nth, instanceCount } = selected;
  const command = (action) => dispatch({ ...action, target });
  const line = source.slice(0, element.start).split('\n').length;

  const classAttr = findAttr(element, CLASS_ATTRS);
  const text = getText(source, element);

  return (
    <>
      <div>
        <div className="selected-tag">{`<${element.tag}>`}</div>
        <div className="selected-file">
          {filename}:{line}
        </div>
      </div>
      {instanceCount > 1 && (
        <div className="hint">
          Instance {nth + 1} of {instanceCount} — this component is used {instanceCount} times; edits apply to all of them.
        </div>
      )}

      {classAttr && classAttr.value === null ? (
        <Field label="class" hint="Expression value — edit it in the source.">
          <input disabled value="{…}" readOnly />
        </Field>
      ) : (
        <ClassEditor
          classes={classList(classAttr?.value ?? '')}
          onChange={(classes) => command({ type: 'setAttr', name: classAttr?.name ?? 'class', value: classes.join(' ') })}
        />
      )}

      <Field label="text" hint={text === null ? 'Only elements whose sole child is text can be edited here.' : undefined}>
        <CommitInput multiline value={text ?? ''} disabled={text === null} placeholder="Text content" onCommit={(text) => command({ type: 'setText', text })} />
      </Field>

      {element.attrs
        .filter((attr) => !CLASS_ATTRS.includes(attr.name) && attr.value !== null)
        .map((attr) => (
          <Field key={attr.name} label={attr.name}>
            <CommitInput value={attr.value} onCommit={(value) => command({ type: 'setAttr', name: attr.name, value })} />
          </Field>
        ))}

      <ButtonRow
        title="Actions"
        buttons={[
          { label: 'Duplicate', onClick: () => command({ type: 'duplicate' }) },
          {
            label: 'Select parent',
            onClick: () => dispatch({ type: 'select', selection: { id: targetId({ filename, index: element.parent.index }), nth: 0 } }),
            disabled: !element.parent?.host,
          },
          { label: 'Delete', onClick: () => command({ type: 'remove' }), className: 'danger' },
        ]}
      />
    </>
  );
}
