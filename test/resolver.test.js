import { test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseImports, resolveImportPath, collectDependencies } from "../src/resolver.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures");

test("parseImports - single default import", () => {
  const code = `import Button from "./Button.jsx";`;
  const result = parseImports(code);

  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].specifier, "./Button.jsx");
});

test("parseImports - multiple imports", () => {
  const code = `
import Card from "./Card.jsx";
import Button from "./Button.jsx";
  `.trim();

  const result = parseImports(code);

  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].specifier, "./Card.jsx");
  assert.strictEqual(result[1].specifier, "./Button.jsx");
});

test("parseImports - no imports", () => {
  const code = `function test() { return <div />; }`;
  const result = parseImports(code);

  assert.strictEqual(result.length, 0);
});

test("parseImports - named imports", () => {
  const code = `import { foo, bar } from "./utils.js";`;
  const result = parseImports(code);

  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].specifier, "./utils.js");
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

test("collectDependencies - no imports", async () => {
  const entryFile = path.join(fixturesDir, "NoImports.jsx");
  const result = await collectDependencies(entryFile);

  assert.strictEqual(result.modules.size, 1);
  assert.ok(result.modules.has(entryFile));
});

test("collectDependencies - single level imports", async () => {
  const entryFile = path.join(fixturesDir, "Card.jsx");
  const result = await collectDependencies(entryFile);

  // Card.jsx imports Button.jsx
  assert.strictEqual(result.modules.size, 2);
  assert.ok(result.modules.has(entryFile));

  const buttonPath = path.join(fixturesDir, "Button.jsx");
  assert.ok(result.modules.has(buttonPath));
});

test("collectDependencies - nested imports", async () => {
  const entryFile = path.join(fixturesDir, "App.jsx");
  const result = await collectDependencies(entryFile);

  // App.jsx imports Card.jsx and Button.jsx
  // Card.jsx also imports Button.jsx
  // Total: App.jsx, Card.jsx, Button.jsx (3 unique files)
  assert.strictEqual(result.modules.size, 3);

  const appPath = path.join(fixturesDir, "App.jsx");
  const cardPath = path.join(fixturesDir, "Card.jsx");
  const buttonPath = path.join(fixturesDir, "Button.jsx");

  assert.ok(result.modules.has(appPath));
  assert.ok(result.modules.has(cardPath));
  assert.ok(result.modules.has(buttonPath));
});

test("collectDependencies - returns dependency graph", async () => {
  const entryFile = path.join(fixturesDir, "Card.jsx");
  const result = await collectDependencies(entryFile);

  const cardDeps = result.graph.get(entryFile);
  assert.ok(cardDeps);
  assert.strictEqual(cardDeps.length, 1);

  const buttonPath = path.join(fixturesDir, "Button.jsx");
  assert.ok(cardDeps.includes(buttonPath));
});

test("collectDependencies - correct evaluation order", async () => {
  const entryFile = path.join(fixturesDir, "App.jsx");
  const result = await collectDependencies(entryFile);

  // Button should come before Card (Card depends on Button)
  // Card should come before App (App depends on Card)
  const buttonPath = path.join(fixturesDir, "Button.jsx");
  const cardPath = path.join(fixturesDir, "Card.jsx");
  const appPath = path.join(fixturesDir, "App.jsx");

  const buttonIndex = result.order.indexOf(buttonPath);
  const cardIndex = result.order.indexOf(cardPath);
  const appIndex = result.order.indexOf(appPath);

  assert.ok(buttonIndex < cardIndex, "Button should come before Card");
  assert.ok(cardIndex < appIndex, "Card should come before App");
});

test("collectDependencies - handles non-existent file", async () => {
  const entryFile = path.join(fixturesDir, "NonExistent.jsx");

  await assert.rejects(
    async () => await collectDependencies(entryFile),
    /ENOENT|no such file/i
  );
});
