/**
 * Snapshot tests for JSX transformer
 */
import { test } from "node:test";
import { transformJSX } from "../src/transformer.js";
import { matchCodeSnapshot } from "./snapshot-utils.js";

const TEST_FILE = "transformer.snapshot.test.js";

test("snapshot - simple JSX element", async () => {
  const input = `const elem = <div>Hello</div>;`;
  const result = transformJSX(input);
  await matchCodeSnapshot(result, TEST_FILE, "simple JSX element");
});

test("snapshot - JSX with props", async () => {
  const input = `const elem = <div className="test" id="main">Hello</div>;`;
  const result = transformJSX(input);
  await matchCodeSnapshot(result, TEST_FILE, "JSX with props");
});

test("snapshot - nested JSX", async () => {
  const input = `
const elem = (
  <div className="container">
    <h1>Title</h1>
    <p>Paragraph with <strong>bold</strong> text</p>
    <ul>
      <li>Item 1</li>
      <li>Item 2</li>
    </ul>
  </div>
);`;
  const result = transformJSX(input);
  await matchCodeSnapshot(result, TEST_FILE, "nested JSX");
});

test("snapshot - component function with JSX", async () => {
  const input = `
function BlogPost({ title, children }) {
  return (
    <article className="blog-post">
      <h1>{title}</h1>
      <div className="content">
        {children}
      </div>
    </article>
  );
}`;
  const result = transformJSX(input);
  await matchCodeSnapshot(result, TEST_FILE, "component function with JSX");
});

test("snapshot - JSX with expressions", async () => {
  const input = `
const todos = items.map(item => (
  <li key={item.id} className={item.completed ? 'completed' : ''}>
    <input
      type="checkbox"
      checked={item.completed}
      onChange={() => toggle(item.id)}
    />
    <span>{item.text}</span>
    <button onClick={() => remove(item.id)}>×</button>
  </li>
));`;
  const result = transformJSX(input);
  await matchCodeSnapshot(result, TEST_FILE, "JSX with expressions");
});

test("snapshot - self-closing tags", async () => {
  const input = `
const form = (
  <form>
    <input type="text" name="name" required />
    <input type="email" name="email" required />
    <br />
    <hr />
    <img src="/logo.png" alt="Logo" />
  </form>
);`;
  const result = transformJSX(input);
  await matchCodeSnapshot(result, TEST_FILE, "self-closing tags");
});

test("snapshot - JSX fragments", async () => {
  const input = `
const content = (
  <>
    <h1>Title</h1>
    <p>First paragraph</p>
    <p>Second paragraph</p>
  </>
);`;
  const result = transformJSX(input);
  await matchCodeSnapshot(result, TEST_FILE, "JSX fragments");
});

test("snapshot - complex component with imports", async () => {
  const input = `
import { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <Header title="My App" />
      <main>
        <h1>Counter: {count}</h1>
        <button onClick={() => setCount(count + 1)}>
          Increment
        </button>
        <button onClick={() => setCount(count - 1)}>
          Decrement
        </button>
      </main>
      <Footer />
    </div>
  );
}`;
  const result = transformJSX(input);
  await matchCodeSnapshot(result, TEST_FILE, "complex component with imports");
});

test("snapshot - style prop object", async () => {
  const input = `
const styledDiv = (
  <div
    style={{
      backgroundColor: 'red',
      fontSize: '16px',
      padding: '10px',
      border: '1px solid black'
    }}
  >
    Styled content
  </div>
);`;
  const result = transformJSX(input);
  await matchCodeSnapshot(result, TEST_FILE, "style prop object");
});

test("snapshot - conditional rendering", async () => {
  const input = `
const content = (
  <div>
    {isLoggedIn ? (
      <div>
        <h1>Welcome back!</h1>
        <button onClick={logout}>Logout</button>
      </div>
    ) : (
      <div>
        <h1>Please log in</h1>
        <button onClick={login}>Login</button>
      </div>
    )}
    {showMessage && <p className="message">{message}</p>}
  </div>
);`;
  const result = transformJSX(input);
  await matchCodeSnapshot(result, TEST_FILE, "conditional rendering");
});