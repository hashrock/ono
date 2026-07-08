import { test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseImports, resolveImportPath, collectModules } from "../src/resolver.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures");

test("parseImports - single default import", () => {
  const code = `import Button from "./Button.jsx";`;
  const result = parseImports(code);

  assert.deepStrictEqual(result, ["./Button.jsx"]);
});

test("parseImports - multiple imports", () => {
  const code = `
import Card from "./Card.jsx";
import Button from "./Button.jsx";
  `.trim();

  const result = parseImports(code);

  assert.deepStrictEqual(result, ["./Card.jsx", "./Button.jsx"]);
});

test("parseImports - no imports", () => {
  const code = `function test() { return <div />; }`;
  const result = parseImports(code);

  assert.strictEqual(result.length, 0);
});

test("parseImports - named imports", () => {
  const code = `import { foo, bar } from "./utils.js";`;
  const result = parseImports(code);

  assert.deepStrictEqual(result, ["./utils.js"]);
});

test("parseImports - re-exports (barrel files)", () => {
  const code = `
export { default as helloWorld, meta as helloWorldMeta } from './blog/hello-world.tsx';
export * from './blog/getting-started.tsx';
export const entries = ['hello-world'];
  `.trim();

  const result = parseImports(code);

  assert.deepStrictEqual(result, [
    "./blog/hello-world.tsx",
    "./blog/getting-started.tsx",
  ]);
});

test("parseImports - mixed imports", () => {
  const code = `
import React from "react";
import Button from "./Button.jsx";
import { helper } from "./utils.js";
  `.trim();

  const result = parseImports(code);

  assert.strictEqual(result.length, 3);
});

test("resolveImportPath - relative path same directory", () => {
  const fromFile = path.join(fixturesDir, "App.jsx");
  const importPath = "./Button.jsx";

  const result = resolveImportPath(importPath, fromFile);
  const expected = path.join(fixturesDir, "Button.jsx");

  assert.strictEqual(result, expected);
});

test("resolveImportPath - relative path parent directory", () => {
  const fromFile = path.join(fixturesDir, "sub", "Component.jsx");
  const importPath = "../Button.jsx";

  const result = resolveImportPath(importPath, fromFile);
  const expected = path.join(fixturesDir, "Button.jsx");

  assert.strictEqual(result, expected);
});

test("resolveImportPath - absolute stays absolute", () => {
  const fromFile = path.join(fixturesDir, "App.jsx");
  const importPath = "/absolute/path/Button.jsx";

  const result = resolveImportPath(importPath, fromFile);

  assert.strictEqual(result, importPath);
});

test("collectModules - no imports", async () => {
  const entryFile = path.join(fixturesDir, "NoImports.jsx");
  const result = await collectModules(entryFile);

  assert.strictEqual(result.size, 1);
  assert.ok(result.has(entryFile));
});

test("collectModules - single level imports", async () => {
  const entryFile = path.join(fixturesDir, "Card.jsx");
  const result = await collectModules(entryFile);

  // Card.jsx imports Button.jsx
  assert.strictEqual(result.size, 2);
  assert.ok(result.has(entryFile));

  const buttonPath = path.join(fixturesDir, "Button.jsx");
  assert.ok(result.has(buttonPath));
});

test("collectModules - nested imports", async () => {
  const entryFile = path.join(fixturesDir, "App.jsx");
  const result = await collectModules(entryFile);

  // App.jsx imports Card.jsx and Button.jsx
  // Card.jsx also imports Button.jsx
  // Total: App.jsx, Card.jsx, Button.jsx (3 unique files)
  assert.strictEqual(result.size, 3);

  assert.ok(result.has(path.join(fixturesDir, "App.jsx")));
  assert.ok(result.has(path.join(fixturesDir, "Card.jsx")));
  assert.ok(result.has(path.join(fixturesDir, "Button.jsx")));
});

test("collectModules - handles non-existent file", async () => {
  const entryFile = path.join(fixturesDir, "NonExistent.jsx");

  await assert.rejects(
    async () => await collectModules(entryFile),
    /Cannot read file/i
  );
});
