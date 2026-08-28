import { useEffect, useState } from 'react';

/**
 * Text control that commits on Enter or blur (Shift+Enter inserts a newline
 * in textareas). Local state so typing doesn't rewrite the source per key.
 */
export function CommitInput({ value, onCommit, multiline = false, ...rest }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  const props = {
    ...rest,
    value: draft,
    onChange: (e) => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.currentTarget.blur();
      }
    },
  };
  return multiline ? <textarea {...props} /> : <input {...props} />;
}
