import { test } from "node:test";
import assert from "node:assert";
import { transformJSX } from "../src/transformer.js";

test("transformJSX - simple JSX element", () => {
  const input = `const elem = <div>Hello</div>;`;
  const result = transformJSX(input);

  assert.ok(result.includes('h("div"'));
  assert.ok(result.includes('"Hello"'));
});

test("transformJSX - JSX with props", () => {
  const input = `const elem = <div className="test">Hello</div>;`;
  const result = transformJSX(input);

  assert.ok(result.includes('h("div"'));
  assert.ok(result.includes('className: "test"'));
});

test("transformJSX - nested JSX", () => {
  const input = `const elem = <div><span>child</span></div>;`;
  const result = transformJSX(input);

  assert.ok(result.includes('h("div"'));
  assert.ok(result.includes('h("span"'));
});

test("transformJSX - component function", () => {
  const input = `
function Greeting(props) {
  return <div>Hello, {props.name}</div>;
}
  `.trim();

  const result = transformJSX(input);

  assert.ok(result.includes('function Greeting'));
  assert.ok(result.includes('h("div"'));
  assert.ok(result.includes('props.name'));
});

test("transformJSX - component invocation", () => {
  const input = `const elem = <Greeting name="World" />;`;
  const result = transformJSX(input);

  assert.ok(result.includes('h(Greeting'));
  assert.ok(result.includes('name: "World"'));
});

test("transformJSX - preserve imports", () => {
  const input = `import Button from "./Button.jsx";`;
  const result = transformJSX(input);

  assert.ok(result.includes('import Button'));
  assert.ok(result.includes('./Button.jsx'));
});

test("transformJSX - preserve exports", () => {
  const input = `export default function App() { return <div />; }`;
  const result = transformJSX(input);

  assert.ok(result.includes('export default'));
  assert.ok(result.includes('function App'));
});

test("transformJSX - self-closing tags", () => {
  const input = `const elem = <img src="test.jpg" />;`;
  const result = transformJSX(input);

  assert.ok(result.includes('h("img"'));
  assert.ok(result.includes('src: "test.jpg"'));
});

test("transformJSX - children prop", () => {
  const input = `
function Card(props) {
  return <div>{props.children}</div>;
}
  `.trim();

  const result = transformJSX(input);

  assert.ok(result.includes('props.children'));
});

test("transformJSX - multiple children", () => {
  const input = `const elem = <div><h1>Title</h1><p>Content</p></div>;`;
  const result = transformJSX(input);

  assert.ok(result.includes('h("h1"'));
  assert.ok(result.includes('h("p"'));
});

test("transformJSX - expressions in JSX", () => {
  const input = `const elem = <div>{variable}</div>;`;
  const result = transformJSX(input);

  assert.ok(result.includes('variable'));
});

test("transformJSX - style prop", () => {
  const input = `const elem = <div style={{ color: "red" }}>Test</div>;`;
  const result = transformJSX(input);

  assert.ok(result.includes('style:'));
  assert.ok(result.includes('color'));
});

test("transformJSX - return original if no JSX", () => {
  const input = `const x = 5;`;
  const result = transformJSX(input);

  // Should be transformed (imports added) but variable preserved
  assert.ok(result.includes('const x = 5'));
});

test("transformJSX - add jsx-runtime import", () => {
  const input = `const elem = <div>Hello</div>;`;
  const result = transformJSX(input);

  // Should have import for h function
  assert.ok(result.includes('import') || result.includes('h('));
});

test("transformJSX - Fragment short syntax", () => {
  const input = `const elem = <><div>A</div><div>B</div></>;`;
  const result = transformJSX(input);

  assert.ok(result.includes('h(Fragment'));
  assert.ok(result.includes('h("div"'));
});

test("transformJSX - empty Fragment", () => {
  const input = `const elem = <></>;`;
  const result = transformJSX(input);

  assert.ok(result.includes('h(Fragment'));
});

test("transformJSX - Fragment with text children", () => {
  const input = `const elem = <>Hello World</>;`;
  const result = transformJSX(input);

  assert.ok(result.includes('h(Fragment'));
  assert.ok(result.includes('Hello World'));
});

test("transformJSX - nested Fragment", () => {
  const input = `const elem = <div><>A<span>B</span></></div>;`;
  const result = transformJSX(input);

  assert.ok(result.includes('h(Fragment'));
  assert.ok(result.includes('h("div"'));
  assert.ok(result.includes('h("span"'));
});

// --- Output snapshots (update with: npm run test:update) ---

const raw = { serializers: [(value) => value] };

test("transformJSX snapshot - component function with JSX", (t) => {
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
  t.assert.snapshot(transformJSX(input), raw);
});

test("transformJSX snapshot - JSX with expressions", (t) => {
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
  t.assert.snapshot(transformJSX(input), raw);
});

test("transformJSX snapshot - JSX fragments", (t) => {
  const input = `
const content = (
  <>
    <h1>Title</h1>
    <p>First paragraph</p>
    <p>Second paragraph</p>
  </>
);`;
  t.assert.snapshot(transformJSX(input), raw);
});

test("transformJSX snapshot - complex component with imports", (t) => {
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
      </main>
      <Footer />
    </div>
  );
}`;
  t.assert.snapshot(transformJSX(input), raw);
});

test("transformJSX snapshot - style prop object", (t) => {
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
  t.assert.snapshot(transformJSX(input), raw);
});

test("transformJSX snapshot - conditional rendering", (t) => {
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
  t.assert.snapshot(transformJSX(input), raw);
});
