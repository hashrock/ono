// Main REPL logic
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const status = document.getElementById('status');
const runBtn = document.getElementById('runBtn');

// Initialize worker
const worker = new Worker(new URL('./compiler.worker.js', import.meta.url), {
  type: 'module'
});

let currentRequestId = 0;

// Example templates
const examples = {
  hello: `export default function App() {
  return (
    <div style="padding: 2rem; font-family: sans-serif;">
      <h1 style="color: #0e639c;">Hello, Ono!</h1>
      <p>This JSX is compiled by Ono in a Web Worker!</p>
      <p>Edit the code and press Run to see the results.</p>
    </div>
  );
}

App()`,

  component: `function Card(props) {
  return (
    <div style="border: 2px solid #ddd; border-radius: 8px; padding: 1.5rem; margin: 1rem; max-width: 400px;">
      <h2 style="margin: 0 0 1rem 0; color: #333;">{props.title}</h2>
      <div>{props.children}</div>
    </div>
  );
}

export default function App() {
  return (
    <div style="padding: 2rem; font-family: sans-serif;">
      <Card title="Welcome to Ono">
        <p>Powered by Ono's JSX transformer</p>
        <p>Running in a Web Worker!</p>
      </Card>
      <Card title="Features">
        <ul>
          <li>Worker-based compilation</li>
          <li>Real Ono bundler</li>
          <li>TypeScript JSX transform</li>
        </ul>
      </Card>
    </div>
  );
}

App()`,

  list: `function TodoItem(props) {
  const bgColor = props.done ? '#e7f5e7' : '#fff';
  const textDecor = props.done ? 'line-through' : 'none';
  const itemStyle = "padding: 1rem; margin: 0.5rem 0; background: " + bgColor + "; border: 1px solid #ddd; border-radius: 4px; text-decoration: " + textDecor + ";";

  return (
    <li style={itemStyle}>
      {props.text}
    </li>
  );
}

export default function TodoList() {
  const todos = [
    { id: 1, text: 'Learn Ono', done: true },
    { id: 2, text: 'Compile in Worker', done: true },
    { id: 3, text: 'Deploy REPL', done: false }
  ];

  return (
    <div style="padding: 2rem; font-family: sans-serif; max-width: 500px;">
      <h1 style="color: #0e639c;">Todo List</h1>
      <ul style="list-style: none; padding: 0;">
        {todos.map(todo => (
          <TodoItem key={todo.id} text={todo.text} done={todo.done} />
        ))}
      </ul>
    </div>
  );
}

TodoList()`
};

// Handle worker messages
worker.onmessage = (e) => {
  const { type, html, error, stack } = e.data;

  if (type === 'success') {
    // Render HTML in iframe
    const doc = preview.contentDocument || preview.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; }
            * { box-sizing: border-box; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    doc.close();

    status.textContent = 'Success! ✓ Compiled in Worker';
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

// Compile code
function runCode() {
  const code = editor.value;

  status.textContent = 'Compiling in Worker...';
  status.className = 'status processing';

  currentRequestId++;
  worker.postMessage({
    type: 'compile',
    code,
    id: currentRequestId
  });
}

// Load example
function loadExample(name) {
  editor.value = examples[name];
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

// Keyboard shortcut
editor.addEventListener('keydown', (e) => {
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
});

// Initialize with hello example
loadExample('hello');
