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

// Example projects
const examples = {
  hello: {
    'index.jsx': `function App() {
  return (
    <div style="padding: 2rem; font-family: sans-serif;">
      <h1 style="color: #0e639c;">Hello, Ono!</h1>
      <p>This JSX is compiled by Ono in a Web Worker!</p>
      <p>Try the multi-file examples to see imports in action.</p>
    </div>
  );
}

App()`
  },

  multifile: {
    'components/Card.jsx': `export function Card(props) {
  return (
    <div style="border: 2px solid #ddd; border-radius: 8px; padding: 1.5rem; margin: 1rem; max-width: 400px;">
      <h2 style="margin: 0 0 1rem 0; color: #333;">{props.title}</h2>
      <div>{props.children}</div>
    </div>
  );
}`,
    'index.jsx': `import { Card } from './components/Card.jsx';

function App() {
  return (
    <div style="padding: 2rem; font-family: sans-serif;">
      <h1 style="color: #0e639c;">Multi-file Example</h1>
      <Card title="Component from another file">
        <p>This Card component is imported from components/Card.jsx</p>
      </Card>
      <Card title="How it works">
        <p>The REPL bundles all files together</p>
        <p>You can use ES6 imports between files</p>
      </Card>
    </div>
  );
}

App()`
  },

  blog: {
    'components/Layout.jsx': `export function Layout(props) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>{props.title}</title>
        <style>{\`
          body { margin: 0; font-family: sans-serif; }
          nav { background: #0e639c; padding: 1rem 2rem; color: white; }
          main { max-width: 800px; margin: 2rem auto; padding: 0 2rem; }
        \`}</style>
      </head>
      <body>
        <nav>
          <h1>{props.title}</h1>
        </nav>
        <main>{props.children}</main>
      </body>
    </html>
  );
}`,
    'components/Post.jsx': `export function Post(props) {
  return (
    <article style="margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid #ddd;">
      <h2 style="color: #333;">{props.title}</h2>
      <p style="color: #666; font-size: 0.875rem;">{props.date}</p>
      <div>{props.children}</div>
    </article>
  );
}`,
    'index.jsx': `import { Layout } from './components/Layout.jsx';
import { Post } from './components/Post.jsx';

function App() {
  return (
    <Layout title="My Blog">
      <Post title="Getting Started with Ono" date="2025-10-28">
        <p>Ono is a minimalist SSG framework with JSX, powered by TypeScript's JSX transformer.</p>
        <p>This example shows how you can create a blog with multiple components!</p>
      </Post>
      <Post title="Multi-file Projects" date="2025-10-29">
        <p>The REPL supports multiple files with imports.</p>
        <p>Create components in separate files and import them as needed.</p>
      </Post>
    </Layout>
  );
}

App()`
  }
};

// Handle worker messages
worker.onmessage = (e) => {
  const { type, html, error, stack } = e.data;

  if (type === 'success') {
    // Render HTML in iframe
    const doc = preview.contentDocument || preview.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    status.textContent = 'Success! ✓ Compiled ' + Object.keys(files).length + ' file(s) in Worker';
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
    });

    editor.addEventListener('keydown', handleEditorKeydown);

    editorContainer.appendChild(editor);
  });
}

function handleEditorKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
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

// Load example
function loadExample(name) {
  files = { ...examples[name] };
  currentFile = Object.keys(files)[0];
  updateUI();
  runCode();
}

// Event listeners
runBtn.addEventListener('click', runCode);

document.querySelectorAll('.example-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const example = e.target.dataset.example;
    loadExample(example);
  });
});

// Initialize with hello example
loadExample('hello');
