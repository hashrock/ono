import { test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "../src/bundler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures");

test("bundle - single file no imports", async () => {
  const entryFile = path.join(fixturesDir, "NoImports.jsx");
  const result = await bundle(entryFile);

  // Should contain the h function
  assert.ok(result.includes("h("));
  assert.ok(result.includes("Hello"));

  // Should be valid JavaScript (no JSX)
  assert.ok(!result.includes("<div>"));
});

test("bundle - with imports", async () => {
  const entryFile = path.join(fixturesDir, "Card.jsx");
  const result = await bundle(entryFile);

  // Should contain both Card and Button code
  assert.ok(result.includes("Card"));
  assert.ok(result.includes("Button"));

  // Should have h function calls
  assert.ok(result.includes("h("));

  // Should not have import statements in output
  assert.ok(!result.includes('import Button'));
});

test("bundle - nested imports", async () => {
  const entryFile = path.join(fixturesDir, "App.jsx");
  const result = await bundle(entryFile);

  // Should contain all components
  assert.ok(result.includes("App"));
  assert.ok(result.includes("Card"));
  assert.ok(result.includes("Button"));

  // Should be transformed (no JSX)
  assert.ok(result.includes("h("));
});

test("bundle - correct module order", async () => {
  const entryFile = path.join(fixturesDir, "App.jsx");
  const result = await bundle(entryFile);

  // Button should come before Card (Card depends on Button)
  const buttonIndex = result.indexOf("function Button");
  const cardIndex = result.indexOf("function Card");
  const appIndex = result.indexOf("function App");

  assert.ok(buttonIndex < cardIndex, "Button should come before Card");
  assert.ok(cardIndex < appIndex, "Card should come before App");
});

test("bundle - export default at the end", async () => {
  const entryFile = path.join(fixturesDir, "App.jsx");
  const result = await bundle(entryFile);

  // Should have export default at the end
  assert.ok(result.includes("export default App"));
});

test("bundle - handles non-existent file", async () => {
  const entryFile = path.join(fixturesDir, "NonExistent.jsx");

  await assert.rejects(
    async () => await bundle(entryFile),
    /Cannot read file/i
  );
});
