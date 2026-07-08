import { test } from "node:test";
import assert from "node:assert";
import { parseModule, isIdentifierName } from "../src/parser.js";

// --- imports ---------------------------------------------------------------

test("parseModule - default import", () => {
  const { imports } = parseModule(`import Button from "./Button.jsx";`);

  assert.strictEqual(imports.length, 1);
  assert.strictEqual(imports[0].specifier, "./Button.jsx");
  assert.strictEqual(imports[0].defaultBinding, "Button");
});

test("parseModule - named imports with aliases", () => {
  const { imports } = parseModule(`import { foo, bar as baz, default as d } from "./utils.js";`);

  assert.deepStrictEqual(imports[0].named, [
    { imported: "foo", local: "foo" },
    { imported: "bar", local: "baz" },
    { imported: "default", local: "d" },
  ]);
});

test("parseModule - namespace import", () => {
  const { imports } = parseModule(`import * as utils from "./utils.js";`);

  assert.strictEqual(imports[0].namespace, "utils");
  assert.strictEqual(imports[0].specifier, "./utils.js");
});

test("parseModule - default plus named", () => {
  const { imports } = parseModule(`import App, { helper } from "./app.js";`);

  assert.strictEqual(imports[0].defaultBinding, "App");
  assert.deepStrictEqual(imports[0].named, [{ imported: "helper", local: "helper" }]);
});

test("parseModule - side-effect import", () => {
  const { imports } = parseModule(`import "./setup.js";`);

  assert.strictEqual(imports[0].sideEffect, true);
  assert.strictEqual(imports[0].specifier, "./setup.js");
});

test("parseModule - multiline import", () => {
  const source = `import {
  one,
  two as three,
} from "./numbers.js";`;
  const { imports } = parseModule(source);

  assert.deepStrictEqual(imports[0].named, [
    { imported: "one", local: "one" },
    { imported: "two", local: "three" },
  ]);
  assert.strictEqual(source.slice(imports[0].start, imports[0].end), source);
});

test("parseModule - import inside a string is ignored", () => {
  const { imports } = parseModule(`const s = 'import fake from "./fake.js"';`);

  assert.strictEqual(imports.length, 0);
});

test("parseModule - import inside a template literal is ignored", () => {
  const source = "const s = `import fake from \"./fake.js\" ${'import x from \"./y\"'}`;";
  const { imports } = parseModule(source);

  assert.strictEqual(imports.length, 0);
});

test("parseModule - import inside comments is ignored", () => {
  const source = `// import a from "./a.js"
/* import b from "./b.js" */
import real from "./real.js";`;
  const { imports } = parseModule(source);

  assert.strictEqual(imports.length, 1);
  assert.strictEqual(imports[0].specifier, "./real.js");
});

test("parseModule - dynamic import and import.meta are ignored", () => {
  const source = `const mod = import("./dynamic.js");
const url = import.meta.url;`;
  const { imports } = parseModule(source);

  assert.strictEqual(imports.length, 0);
});

test("parseModule - regex literal containing quotes does not break scanning", () => {
  const source = `const re = /['"{]/g;
import real from "./real.js";`;
  const { imports } = parseModule(source);

  assert.strictEqual(imports.length, 1);
});

// --- exports ---------------------------------------------------------------

test("parseModule - export default function declaration", () => {
  const source = `export default function App() { return h("div"); }`;
  const { exports } = parseModule(source);

  assert.strictEqual(exports[0].type, "exportDefaultDeclaration");
  assert.strictEqual(exports[0].name, "App");
});

test("parseModule - export default expression", () => {
  const { exports } = parseModule(`export default App;`);

  assert.strictEqual(exports[0].type, "exportDefaultExpression");
});

test("parseModule - export default anonymous function", () => {
  const { exports } = parseModule(`export default function () { return 1; }`);

  assert.strictEqual(exports[0].type, "exportDefaultExpression");
});

test("parseModule - export function and class declarations", () => {
  const source = `export function foo() {}
export async function bar() {}
export class Baz {}`;
  const { exports } = parseModule(source);

  assert.deepStrictEqual(
    exports.map((e) => e.names[0]),
    ["foo", "bar", "Baz"],
  );
  assert.ok(exports.every((e) => e.type === "exportDeclaration"));
});

test("parseModule - export const with multiple declarators", () => {
  const source = `export const a = fn(1, { b: 2 }), c = [3, 4];`;
  const { exports } = parseModule(source);

  assert.deepStrictEqual(exports[0].names, ["a", "c"]);
});

test("parseModule - export named list", () => {
  const { exports } = parseModule(`const a = 1; export { a, a as b };`);

  assert.strictEqual(exports[0].type, "exportNamed");
  assert.deepStrictEqual(exports[0].named, [
    { local: "a", exported: "a" },
    { local: "a", exported: "b" },
  ]);
});

test("parseModule - re-export from (barrel files)", () => {
  const source = `export { default as helloWorld, meta as helloWorldMeta } from './blog/hello-world.tsx';`;
  const { exports } = parseModule(source);

  assert.strictEqual(exports[0].type, "exportNamedFrom");
  assert.strictEqual(exports[0].specifier, "./blog/hello-world.tsx");
  assert.deepStrictEqual(exports[0].named, [
    { local: "default", exported: "helloWorld" },
    { local: "meta", exported: "helloWorldMeta" },
  ]);
});

test("parseModule - export star from", () => {
  const { exports } = parseModule(`export * from "./all.js";`);

  assert.strictEqual(exports[0].type, "exportStarFrom");
  assert.strictEqual(exports[0].specifier, "./all.js");
});

test("parseModule - destructuring export is rejected with a clear error", () => {
  assert.throws(() => parseModule(`export const { a } = obj;`), /Destructuring/);
});

// --- top-level functions -----------------------------------------------------

test("parseModule - collects top-level function declarations", () => {
  const source = `function App() { return 1; }
async function load() {}
function helper() { function inner() {} }
const expr = function named() {};
App();`;
  const { topLevelFunctions } = parseModule(source);

  assert.deepStrictEqual(topLevelFunctions, ["App", "load", "helper"]);
});

test("isIdentifierName", () => {
  assert.ok(isIdentifierName("valid_$Name1"));
  assert.ok(!isIdentifierName("1bad"));
  assert.ok(!isIdentifierName("has-dash"));
  assert.ok(!isIdentifierName(""));
});
