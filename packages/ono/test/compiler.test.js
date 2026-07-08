/**
 * Tests for the browser compiler (REPL path).
 * browser/compiler.js has no Node dependencies, so it can be tested here.
 */
import { test } from "node:test";
import assert from "node:assert";
import { compileProject } from "../src/browser/compiler.js";

test("compileProject - default export page", async () => {
  const files = {
    "index.jsx": `export default function App() {
  return <div class="p-4">Hello REPL</div>;
}`,
  };

  const { html } = await compileProject(files, "index.jsx", { enableUno: false });
  assert.strictEqual(html, `<div class="p-4">Hello REPL</div>`);
});

test("compileProject - multi-file project with imports", async () => {
  const files = {
    "components/Card.jsx": `export function Card(props) {
  return <div class="card">{props.children}</div>;
}`,
    "index.jsx": `import { Card } from './components/Card.jsx';

export default function App() {
  return <Card><p>content</p></Card>;
}`,
  };

  const { html } = await compileProject(files, "index.jsx", { enableUno: false });
  assert.strictEqual(html, `<div class="card"><p>content</p></div>`);
});

test("compileProject - REPL style entry without exports", async () => {
  const files = {
    "index.jsx": `function App() {
  return (
    <>
      <h1>Title</h1>
      <p>Fragment in the REPL</p>
    </>
  );
}

App()`,
  };

  const { html } = await compileProject(files, "index.jsx", { enableUno: false });
  assert.strictEqual(html, "<h1>Title</h1><p>Fragment in the REPL</p>");
});

test("compileProject - generates UnoCSS when enabled", async () => {
  const files = {
    "index.jsx": `export default function App() {
  return <div class="text-red-500">styled</div>;
}`,
  };

  const { css } = await compileProject(files, "index.jsx");
  assert.ok(css.includes(".text-red-500"));
});

test("compileProject - missing import produces a clear error", async () => {
  const files = {
    "index.jsx": `import Missing from './missing.jsx';
export default () => <Missing />;`,
  };

  await assert.rejects(
    () => compileProject(files, "index.jsx", { enableUno: false }),
    /Cannot find module '.\/missing.jsx'/,
  );
});

test("compileProject - package imports are rejected in the browser", async () => {
  const files = {
    "index.jsx": `import React from 'react';
export default () => <div />;`,
  };

  await assert.rejects(
    () => compileProject(files, "index.jsx", { enableUno: false }),
    /Cannot bundle package import "react"/,
  );
});
