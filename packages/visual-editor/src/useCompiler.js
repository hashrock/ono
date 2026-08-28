import { useEffect, useRef, useState } from 'react';
import { debounce } from '@hashrock/ono/browser/playground';
import { instrument } from '../jsx-source.js';

/**
 * Owns the compiler Web Worker. `compile(files)` instruments every file and
 * posts it; stale responses (older request ids) are ignored.
 * Returns the latest { html, css } and a status line.
 */
export function useCompiler(entryPoint) {
  const workerRef = useRef(null);
  const requestId = useRef(0);
  const [status, setStatus] = useState({ text: 'Ready', kind: '' });
  const [output, setOutput] = useState(null);

  useEffect(() => {
    const worker = new Worker(new URL('../compiler.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { type, html, css, error, stack, id, fileCount } = e.data;
      if (id !== requestId.current) return;
      if (type === 'success') {
        setOutput({ html, css });
        setStatus({ text: `Compiled ${fileCount} file(s)`, kind: '' });
      } else {
        setStatus({ text: 'Error: ' + error, kind: 'error' });
        console.error(error, stack);
      }
    };
    worker.onerror = (error) => setStatus({ text: 'Worker Error: ' + error.message, kind: 'error' });
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  // stable across renders so the debounced version can live in a ref too
  const compileRef = useRef(null);
  if (!compileRef.current) {
    const compile = (files) => {
      setStatus({ text: 'Compiling...', kind: 'processing' });
      const id = ++requestId.current;
      const instrumented = {};
      try {
        for (const name of Object.keys(files)) instrumented[name] = instrument(files[name], name);
      } catch (error) {
        setStatus({ text: 'Parse error: ' + error.message, kind: 'error' });
        return;
      }
      workerRef.current?.postMessage({ type: 'compile', files: instrumented, entryPoint, id });
    };
    const debounced = debounce(compile, 200);
    compileRef.current = {
      compileNow: (files) => {
        debounced.cancel();
        compile(files);
      },
      compileSoon: debounced,
    };
  }

  return { ...compileRef.current, status, output };
}
