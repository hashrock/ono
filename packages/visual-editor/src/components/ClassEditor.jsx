import { useState } from 'react';
import {
  GROUPS,
  COLOR_HUES,
  SHADES,
  classList,
  readValue,
  writeValue,
  parseColor,
  colorClass,
  swatchColor,
} from '../uno-controls.js';
import { CommitInput } from './CommitInput.jsx';

/**
 * Chips for every class plus grouped GUI controls for the common utilities.
 * @param {{ classes: string[], onChange: (classes: string[]) => void }} props
 */
export function ClassEditor({ classes, onChange }) {
  const [open, setOpen] = useState(() => new Set(['Spacing', 'Typography']));
  const toggle = (title, isOpen) =>
    setOpen((prev) => {
      const next = new Set(prev);
      isOpen ? next.add(title) : next.delete(title);
      return next;
    });

  return (
    <div className="field">
      <label>class</label>
      <div className="chips">
        {classes.map((cls) => (
          <span key={cls} className="chip" title="Click to remove" onClick={() => onChange(classes.filter((c) => c !== cls))}>
            {cls}
            <b>×</b>
          </span>
        ))}
        <CommitInput
          className="chip-input"
          value=""
          placeholder={classes.length ? '+ add class' : 'add class…'}
          onCommit={(value) => {
            const added = classList(value).filter((c) => !classes.includes(c));
            if (added.length) onChange([...classes, ...added]);
          }}
        />
      </div>

      {GROUPS.map((group) => (
        <details key={group.title} className="group" open={open.has(group.title)} onToggle={(e) => toggle(group.title, e.currentTarget.open)}>
          <summary>{group.title}</summary>
          {group.controls.map((control) => {
            const current = readValue(control, classes);
            const set = (value) => onChange(writeValue(control, classes, value));
            return (
              <div key={control.label} className="control">
                <span className="control-label">{control.label}</span>
                {control.kind === 'color' ? (
                  <ColorPicker control={control} current={current} onSet={set} />
                ) : (
                  <select value={current} onChange={(e) => set(e.target.value)}>
                    <option value="">—</option>
                    {control.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </details>
      ))}
    </div>
  );
}

/** Hue swatches, and shade swatches for the chosen hue. */
function ColorPicker({ control, current, onSet }) {
  const parsed = parseColor(control, current);
  return (
    <div className="color">
      <div className="swatches">
        <button className={'swatch none' + (parsed ? '' : ' on')} title="none" onClick={() => onSet('')} />
        {COLOR_HUES.map((hue) => (
          <button
            key={hue}
            className={'swatch' + (parsed?.hue === hue ? ' on' : '')}
            title={hue}
            style={{ background: swatchColor(hue) }}
            onClick={() => onSet(colorClass(control.prefix, hue, parsed?.shade))}
          />
        ))}
      </div>
      {parsed?.shade && (
        <div className="swatches">
          {SHADES.map((shade) => (
            <button
              key={shade}
              className={'swatch' + (shade === parsed.shade ? ' on' : '')}
              title={`${parsed.hue}-${shade}`}
              style={{ background: swatchColor(parsed.hue, shade) }}
              onClick={() => onSet(colorClass(control.prefix, parsed.hue, shade))}
            />
          ))}
        </div>
      )}
      {current && <div className="hint">{current}</div>}
    </div>
  );
}
