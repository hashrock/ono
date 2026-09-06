import { useState } from 'react';
// The published entry is '@hashrock/ono-visual-editor'; the demo uses the
// sources directly so `pnpm dev` hot-reloads the library itself.
import { VisualEditor, EXAMPLE_FILES, EXAMPLE_ENTRY } from '../src/index.js';

/** Host app for the editor: owns the files and can reload them. */
export function App() {
  const [files, setFiles] = useState(EXAMPLE_FILES);

  return (
    <VisualEditor
      files={files}
      entry={EXAMPLE_ENTRY}
      onChange={setFiles}
      actions={<button onClick={() => setFiles({ ...EXAMPLE_FILES })}>Reset example</button>}
    />
  );
}
