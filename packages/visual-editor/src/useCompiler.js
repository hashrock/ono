import { useEffect, useRef, useState } from 'react';
import { debounce } from '@hashrock/ono/browser/playground';
import { instrument } from './jsx-source.js';
// Inlined so the library ships one file: consumers need no worker/bundler setup.
import CompilerWorker from './compiler.worker.js?worker&inline';

/**
 * Owns the compiler Web Worker. `compile(files)` instruments every file and
 * posts it; stale responses (older request ids) are ignored.
 * Returns the latest { html, css } and a status line.
 * @param {string} entryPoint
 * @param {(() => Worker)} [createWorker] replaces the bundled compiler worker
 */
export function useCompiler(entryPoint, createWorker) {
  const workerRef = useRef(null);
  const requestId = useRef(0);
  const [status, setStatus] = useState({ text: 'Ready', kind: '' });
  const [output, setOutput] = useState(null);

  const factory = useRef(createWorker);
  factory.current = createWorker;

  useEffect(() => {
    const worker = factory.current ? factory.current() : new CompilerWorker();
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
    const debounced = debounce(compile, 400);
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
