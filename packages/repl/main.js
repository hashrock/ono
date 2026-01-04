// Multi-file REPL logic
const preview = document.getElementById('preview');
const status = document.getElementById('status');
const runBtn = document.getElementById('runBtn');
const tabsContainer = document.getElementById('tabs');
const editorContainer = document.getElementById('editorContainer');

// Virtual file system
let files = {};
let currentFile = '';

// Initialize worker
const worker = new Worker(new URL('./compiler.worker.js', import.meta.url), {
  type: 'module'
});

let currentRequestId = 0;
let scheduleCompile;

function debounce(fn, delay = 300) {
  let timer;
  function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }
  debounced.cancel = () => {
    clearTimeout(timer);
  };
  return debounced;
}

// Example projects
const examples = {
  hello: {
    'index.jsx': `function App() {
  return (
    <div class="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col items-center justify-center gap-6">
      <div class="space-y-4 text-center">
        <span class="uppercase text-xs tracking-widest text-slate-400">Ono + UnoCSS</span>
        <h1 class="text-4xl font-bold text-emerald-400 drop-shadow-md">Hello, Ono!</h1>
        <p class="text-slate-300 max-w-lg">
          UnoCSS utilities are generated automatically inside the REPL worker.
          Edit the JSX and watch the preview update instantly.
        </p>
      </div>
      <div class="flex gap-3">
        <button class="px-4 py-2 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30 transition">
          Button
        </button>
        <button class="px-4 py-2 rounded-md bg-slate-800 border border-slate-700 hover:bg-slate-700 transition">
          Secondary
        </button>
      </div>
    </div>
  );
}

App()`
  },

  multifile: {
    'components/Card.jsx': `export function Card(props) {
  return (
    <div class="bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl max-w-sm backdrop-blur-md hover:border-emerald-400/40 transition-colors">
      <h2 class="text-xl font-semibold text-white mb-2">{props.title}</h2>
      <div class="text-slate-200 text-sm leading-relaxed">{props.children}</div>
    </div>
  );
}`,
    'index.jsx': `import { Card } from './components/Card.jsx';

function App() {
  return (
    <div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 font-sans">
      <header class="px-8 py-10 border-b border-white/10 backdrop-blur-md">
        <h1 class="text-3xl font-bold text-emerald-400">Multi-file Example</h1>
        <p class="text-slate-300 mt-2 max-w-2xl">
          This project demonstrates sharing components across files while UnoCSS extracts class utilities on the fly.
        </p>
      </header>
      <main class="px-6 sm:px-10 py-10 grid gap-6 sm:grid-cols-2">
        <Card title="Component from another file">
          <p>Card component is imported from <code class="bg-black/40 px-1.5 py-0.5 rounded text-emerald-300">components/Card.jsx</code>.</p>
          <p class="mt-2">Edit the component to see UnoCSS generate new styles.</p>
        </Card>
        <Card title="Dynamic Styles">
          <ul class="list-disc list-inside space-y-1 text-slate-200/80">
            <li>Gradient background</li>
            <li>Glassmorphism cards</li>
            <li>Hover transitions</li>
          </ul>
        </Card>
      </main>
    </div>
  );
}

App()`
  },

  blog: {
    'components/Layout.jsx': `export function Layout(props) {
  return (
    <html lang="en" class="dark">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{props.title}</title>
      </head>
      <body class="bg-slate-950 text-slate-100 font-sans">
        <nav class="bg-slate-900/70 border-b border-slate-800/70 backdrop-blur py-5">
          <div class="max-w-4xl mx-auto px-6 flex items-center justify-between">
            <h1 class="text-2xl font-semibold text-emerald-300">{props.title}</h1>
            <span class="text-xs uppercase tracking-[0.3em] text-slate-400">Powered by Ono</span>
          </div>
        </nav>
        <main class="max-w-3xl mx-auto px-6 py-10 space-y-12">{props.children}</main>
      </body>
    </html>
  );
}`,
    'components/Post.jsx': `export function Post(props) {
  return (
    <article class="border border-slate-800/60 rounded-2xl p-8 bg-slate-900/60 backdrop-blur">
      <header class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
        <h2 class="text-xl font-semibold text-white">{props.title}</h2>
        <span class="text-xs uppercase tracking-[0.3em] text-emerald-300/80">
          {props.date}
        </span>
      </header>
      <div class="space-y-3 text-slate-200 leading-relaxed text-sm">
        {props.children}
      </div>
    </article>
  );
}`,
    'index.jsx': `import { Layout } from './components/Layout.jsx';
import { Post } from './components/Post.jsx';

function App() {
  return (
    <Layout title="My Blog">
      <Post title="Getting Started with Ono" date="2025-10-28">
        <p>
          Ono is a minimalist SSG framework with JSX, powered by TypeScript's JSX transformer.
          UnoCSS keeps the styles atomic and fast, even in the browser.
        </p>
        <p>
          Edit this blog to experiment with typography utilities like
          <code class="px-1 py-0.5 rounded bg-emerald-400/10 text-emerald-300">font-semibold</code>,
          <code class="px-1 py-0.5 rounded bg-emerald-400/10 text-emerald-300">tracking-wide</code>,
          or <code class="px-1 py-0.5 rounded bg-emerald-400/10 text-emerald-300">prose</code>.
        </p>
      </Post>
      <Post title="Multi-file Projects" date="2025-10-29">
        <p>
          The REPL supports multiple files with imports, and UnoCSS sees every component in the project.
        </p>
        <p>
          Try adding new utility classes, then watch the compiled CSS show up in the status bar.
        </p>
      </Post>
    </Layout>
  );
}

App()`
  }
};

// Handle worker messages
worker.onmessage = (e) => {
  const { type, html, css, error, stack, id } = e.data;

  if (id !== currentRequestId) {
    return;
  }

  if (type === 'success') {
    renderPreview(html, css);

    const cssDetails = css && css.trim().length
      ? ` • UnoCSS generated ${css.length} characters`
      : '';

    status.textContent = 'Success! ✓ Compiled ' + Object.keys(files).length + ' file(s) in Worker' + cssDetails;
    status.className = 'status';
  } else if (type === 'error') {
    status.textContent = 'Error: ' + error;
    status.className = 'status error';
    console.error(error, stack);
  }
};

worker.onerror = (error) => {
  status.textContent = 'Worker Error: ' + error.message;
  status.className = 'status error';
  console.error(error);
};

// Update UI
function updateUI() {
  // Update tabs
  tabsContainer.innerHTML = '';
  editorContainer.innerHTML = '';

  Object.keys(files).sort().forEach((filename) => {
    // Create tab
    const tab = document.createElement('button');
    tab.className = 'tab' + (filename === currentFile ? ' active' : '');
    tab.textContent = filename;
    tab.onclick = () => switchFile(filename);
    tabsContainer.appendChild(tab);

    // Create editor
    const editor = document.createElement('textarea');
    editor.className = 'editor' + (filename === currentFile ? ' active' : '');
    editor.value = files[filename];
    editor.spellcheck = false;
    editor.dataset.filename = filename;

    editor.addEventListener('input', (e) => {
      files[filename] = e.target.value;
      if (scheduleCompile) {
        scheduleCompile();
      }
    });

    editor.addEventListener('keydown', handleEditorKeydown);

    editorContainer.appendChild(editor);
  });
}

function renderPreview(html, css) {
  const doc = preview.contentDocument || preview.contentWindow.document;
  const finalHtml = integrateUnoCSS(html, css);
  doc.open();
  doc.write(finalHtml);
  doc.close();
}

function integrateUnoCSS(html, css) {
  const trimmedCSS = (css || '').trim();
  if (!trimmedCSS) {
    return normalizeHtml(html);
  }

  const styleTag = `<style id="uno-css">${trimmedCSS}</style>`;

  if (!/<html[\s>]/i.test(html)) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8">${styleTag}</head><body>${html}</body></html>`;
  }

  if (/<head[\s>]/i.test(html)) {
    if (/<\/head>/i.test(html)) {
      return html.replace(/<\/head>/i, `${styleTag}</head>`);
    }
    return html.replace(/<head([^>]*)>/i, `<head$1>${styleTag}`);
  }

  return html.replace(/<html([^>]*)>/i, `<html$1><head>${styleTag}</head>`);
}

function normalizeHtml(html) {
  if (/<html[\s>]/i.test(html)) {
    return html;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
}

function handleEditorKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    if (scheduleCompile) {
      scheduleCompile.cancel();
    }
    runCode();
  }

  // Tab support
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    const value = e.target.value;
    e.target.value = value.substring(0, start) + '  ' + value.substring(end);
    e.target.selectionStart = e.target.selectionEnd = start + 2;
  }
}

function switchFile(filename) {
  currentFile = filename;
  updateUI();
}

// Compile code
function runCode() {
  status.textContent = 'Compiling ' + Object.keys(files).length + ' file(s) in Worker...';
  status.className = 'status processing';

  currentRequestId++;
  worker.postMessage({
    type: 'compile',
    files,
    entryPoint: 'index.jsx',
    id: currentRequestId
  });
}

scheduleCompile = debounce(runCode, 400);

// Load example
function loadExample(name) {
  files = { ...examples[name] };
  currentFile = Object.keys(files)[0];
  if (scheduleCompile) {
    scheduleCompile.cancel();
  }
  updateUI();
  runCode();
}

// Event listeners
runBtn.addEventListener('click', () => {
  if (scheduleCompile) {
    scheduleCompile.cancel();
  }
  runCode();
});

document.querySelectorAll('.example-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const example = e.target.dataset.example;
    loadExample(example);
  });
});

// Initialize with hello example
loadExample('hello');
