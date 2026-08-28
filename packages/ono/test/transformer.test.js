/**
 * Transformer tests are behavior-based: transform, evaluate with the real
 * JSX runtime, render. The shape of the emitted JavaScript is an
 * implementation detail (see golden.test.js for end-to-end coverage).
 */
import { test } from "node:test";
import assert from "node:assert";
import { transformJSX, transformModule } from "../src/transformer.js";
import { h, Fragment } from "../src/jsx-runtime.js";
import { renderToString } from "../src/renderer.js";

/** Transform an expression-bodied snippet and render the value of `out` */
function render(source, filename = "input.jsx") {
  const code = transformJSX(`let out; ${source}`, filename);
  return renderToString(new Function("h", "Fragment", `${code}\nreturn out;`)(h, Fragment));
}

test("transformJSX - elements, props and children", () => {
  assert.strictEqual(
    render(`out = <div class="a" id={"x" + 1}><span>hi</span>{[1, 2].map((n) => <b>{n}</b>)}</div>;`),
    `<div class="a" id="x1"><span>hi</span><b>1</b><b>2</b></div>`,
  );
});

test("transformJSX - components and fragments", () => {
  assert.strictEqual(
    render(`function Card({ title, children }) { return <><h2>{title}</h2>{children}</>; }
      out = <Card title="T"><p>body</p></Card>;`),
    `<h2>T</h2><p>body</p>`,
  );
});

test("transformJSX - plain JS without JSX is unchanged in meaning", () => {
  const code = transformJSX(`export const x = 1 + 2;`);
  assert.match(code, /export const x = 1 \+ 2;/);
});

test("transformJSX - keeps ES module syntax", () => {
  const code = transformJSX(`import A from "./A.jsx";\nexport default function P() { return <A />; }`);
  assert.match(code, /^import A from "\.\/A\.jsx";/);
  assert.match(code, /export default function P/);
});

test("transformJSX - .tsx strips types, .ts has no JSX parsing", () => {
  assert.strictEqual(render(`out = <p>{(1 as number) + 1}</p>;`, "a.tsx"), `<p>2</p>`);
  const code = transformJSX(`export const cast = <T,>(v: T): T => v;`, "a.ts");
  assert.match(code, /export const cast = \(v\) => v;/);
});

test("transformModule - rewrites imports/exports to require/exports", () => {
  const code = transformModule(`import A from "./A.jsx";\nexport const x = <A />;`);
  assert.match(code, /require\(['"]\.\/A\.jsx['"]\)/);
  assert.match(code, /exports\.x = x/);
  assert.doesNotMatch(code, /^import /m);
});

test("transformJSX - syntax error reports file, line and column", () => {
  assert.throws(
    () => transformJSX(`function P() {\n  return <div>{x</div>;\n}`, "pages/broken.jsx"),
    (error) => /pages\/broken\.jsx/.test(error.message) && /\(2:\d+\)/.test(error.message),
  );
});
