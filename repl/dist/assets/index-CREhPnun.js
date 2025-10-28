(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))n(t);new MutationObserver(t=>{for(const o of t)if(o.type==="childList")for(const d of o.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&n(d)}).observe(document,{childList:!0,subtree:!0});function i(t){const o={};return t.integrity&&(o.integrity=t.integrity),t.referrerPolicy&&(o.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?o.credentials="include":t.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(t){if(t.ep)return;t.ep=!0;const o=i(t);fetch(t.href,o)}})();const l=document.getElementById("editor"),p=document.getElementById("preview"),s=document.getElementById("status"),f=document.getElementById("runBtn"),a=new Worker(new URL("/assets/compiler.worker-BkiDAxmX.js",import.meta.url),{type:"module"});let u=0;const y={hello:`export default function App() {
  return (
    <div style="padding: 2rem; font-family: sans-serif;">
      <h1 style="color: #0e639c;">Hello, Ono!</h1>
      <p>This JSX is compiled by Ono in a Web Worker!</p>
      <p>Edit the code and press Run to see the results.</p>
    </div>
  );
}

App()`,component:`function Card(props) {
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

App()`,list:`function TodoItem(props) {
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

TodoList()`};a.onmessage=e=>{const{type:r,html:i,error:n,stack:t}=e.data;if(r==="success"){const o=p.contentDocument||p.contentWindow.document;o.open(),o.write(`
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
        <body>${i}</body>
      </html>
    `),o.close(),s.textContent="Success! ✓ Compiled in Worker",s.className="status"}else r==="error"&&(s.textContent="Error: "+n,s.className="status error",console.error(n,t))};a.onerror=e=>{s.textContent="Worker Error: "+e.message,s.className="status error",console.error(e)};function c(){const e=l.value;s.textContent="Compiling in Worker...",s.className="status processing",u++,a.postMessage({type:"compile",code:e,id:u})}function m(e){l.value=y[e],c()}f.addEventListener("click",c);document.querySelectorAll(".example-btn").forEach(e=>{e.addEventListener("click",r=>{const i=r.target.dataset.example;m(i)})});l.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key==="Enter"&&(e.preventDefault(),c()),e.key==="Tab"){e.preventDefault();const r=e.target.selectionStart,i=e.target.selectionEnd,n=e.target.value;e.target.value=n.substring(0,r)+"  "+n.substring(i),e.target.selectionStart=e.target.selectionEnd=r+2}});m("hello");
