import { test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, rm, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { bundle } from "../src/bundler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures");

test("bundle - single file no imports", async () => {
  const entryFile = path.join(fixturesDir, "NoImports.jsx");
  const result = await bundle(entryFile);

  // Result should be an object with code and assets
  assert.ok(result.code);
  assert.ok(Array.isArray(result.assets));

  // Should contain the h function
  assert.ok(result.code.includes("h("));
  assert.ok(result.code.includes("Hello"));

  // Should be valid JavaScript (no JSX)
  assert.ok(!result.code.includes("<div>"));
});

test("bundle - with imports", async () => {
  const entryFile = path.join(fixturesDir, "Card.jsx");
  const result = await bundle(entryFile);

  // Should contain both Card and Button code
  assert.ok(result.code.includes("Card"));
  assert.ok(result.code.includes("Button"));

  // Should have h function calls
  assert.ok(result.code.includes("h("));

  // Should not have import statements in output
  assert.ok(!result.code.includes('import Button'));
});

test("bundle - nested imports", async () => {
  const entryFile = path.join(fixturesDir, "App.jsx");
  const result = await bundle(entryFile);

  // Should contain all components
  assert.ok(result.code.includes("App"));
  assert.ok(result.code.includes("Card"));
  assert.ok(result.code.includes("Button"));

  // Should be transformed (no JSX)
  assert.ok(result.code.includes("h("));
});

test("bundle - correct module order", async () => {
  const entryFile = path.join(fixturesDir, "App.jsx");
  const result = await bundle(entryFile);

  // Button should come before Card (Card depends on Button)
  const buttonIndex = result.code.indexOf("function Button");
  const cardIndex = result.code.indexOf("function Card");
  const appIndex = result.code.indexOf("function App");

  assert.ok(buttonIndex < cardIndex, "Button should come before Card");
  assert.ok(cardIndex < appIndex, "Card should come before App");
});

test("bundle - export default at the end", async () => {
  const entryFile = path.join(fixturesDir, "App.jsx");
  const result = await bundle(entryFile);

  // Should have export default at the end
  assert.ok(result.code.includes("export default App"));
});

test("bundle - handles non-existent file", async () => {
  const entryFile = path.join(fixturesDir, "NonExistent.jsx");

  await assert.rejects(
    async () => await bundle(entryFile),
    /Cannot read file/i
  );
});

test("bundle - without outputDir does not process assets", async () => {
  const entryFile = path.join(fixturesDir, "SingleAsset.jsx");
  const result = await bundle(entryFile);

  // Should still bundle successfully
  assert.ok(result.code);
  assert.ok(Array.isArray(result.assets));

  // No assets should be processed without outputDir
  assert.strictEqual(result.assets.length, 0);

  // Import statement should be removed (bundler removes all relative imports)
  // but the code should still reference logo since it's used in JSX
  assert.ok(!result.code.includes('import logo from'));
});

test("bundle - with outputDir processes single asset", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'ono-test-'));

  try {
    const entryFile = path.join(fixturesDir, "SingleAsset.jsx");
    const result = await bundle(entryFile, { outputDir: tempDir });

    // Should have one asset
    assert.strictEqual(result.assets.length, 1);

    const asset = result.assets[0];
    assert.ok(asset.sourcePath.includes('logo.png'));
    assert.ok(asset.publicPath.startsWith('/assets/'));
    assert.ok(asset.publicPath.includes('logo-'));
    assert.ok(asset.publicPath.endsWith('.png'));

    // Asset file should exist
    await access(asset.outputPath);
    const content = await readFile(asset.outputPath, 'utf-8');
    assert.strictEqual(content, 'fake png content for testing');

    // Import should be replaced with const assignment
    assert.ok(result.code.includes('const logo = '));
    assert.ok(result.code.includes(asset.publicPath));
    assert.ok(!result.code.includes('import logo from'));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("bundle - with outputDir processes multiple assets", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'ono-test-'));

  try {
    const entryFile = path.join(fixturesDir, "WithAssets.jsx");
    const result = await bundle(entryFile, { outputDir: tempDir });

    // Should have two assets
    assert.strictEqual(result.assets.length, 2);

    // Check both assets
    const logoAsset = result.assets.find(a => a.sourcePath.includes('logo.png'));
    const iconAsset = result.assets.find(a => a.sourcePath.includes('icon.svg'));

    assert.ok(logoAsset, 'Should have logo asset');
    assert.ok(iconAsset, 'Should have icon asset');

    // Both files should exist
    await access(logoAsset.outputPath);
    await access(iconAsset.outputPath);

    // Both imports should be replaced
    assert.ok(result.code.includes('const logo = '));
    assert.ok(result.code.includes('const icon = '));
    assert.ok(result.code.includes(logoAsset.publicPath));
    assert.ok(result.code.includes(iconAsset.publicPath));
    assert.ok(!result.code.includes('import logo from'));
    assert.ok(!result.code.includes('import icon from'));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("bundle - asset without hash uses original filename", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'ono-test-'));

  try {
    const entryFile = path.join(fixturesDir, "SingleAsset.jsx");
    const result = await bundle(entryFile, {
      outputDir: tempDir,
      hashAssets: false
    });

    assert.strictEqual(result.assets.length, 1);
    const asset = result.assets[0];

    // Should use original filename without hash
    assert.strictEqual(asset.publicPath, '/assets/logo.png');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("bundle - custom assetsDir", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'ono-test-'));

  try {
    const entryFile = path.join(fixturesDir, "SingleAsset.jsx");
    const result = await bundle(entryFile, {
      outputDir: tempDir,
      assetsDir: 'static'
    });

    assert.strictEqual(result.assets.length, 1);
    const asset = result.assets[0];

    // Should use custom assets directory
    assert.ok(asset.publicPath.startsWith('/static/'));
    assert.ok(asset.outputPath.includes('static'));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
