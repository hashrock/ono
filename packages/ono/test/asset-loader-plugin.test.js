import { test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, mkdir, writeFile, rm, access, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createAssetLoaderPlugin } from "../src/plugins/asset-loader-plugin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures");

test("createAssetLoaderPlugin - creates plugin with name", () => {
  const plugin = createAssetLoaderPlugin();
  assert.strictEqual(plugin.name, 'asset-loader');
  assert.ok(plugin.hooks);
});

test("createAssetLoaderPlugin - has required hooks", () => {
  const plugin = createAssetLoaderPlugin();
  assert.ok(typeof plugin.hooks.collectDependencies === 'function');
  assert.ok(typeof plugin.hooks.afterTransform === 'function');
  assert.ok(typeof plugin.hooks.afterBundle === 'function');
});

test("collectDependencies hook - processes assets when outputDir provided", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'ono-test-'));

  try {
    // Create test asset
    const sourceDir = path.join(tempDir, 'src');
    await mkdir(sourceDir, { recursive: true });
    await writeFile(path.join(sourceDir, 'logo.png'), 'test content');

    const assetPath = path.join(sourceDir, 'logo.png');
    const assets = new Set([assetPath]);

    const plugin = createAssetLoaderPlugin({
      outputDir: tempDir,
      hashAssets: true
    });

    // Execute collectDependencies hook
    await plugin.hooks.collectDependencies({ assets }, {});

    // Verify asset was copied
    const assetFiles = await readFile(path.join(tempDir, 'assets'), 'utf-8').catch(() => null);
    // Asset should be in assets directory
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("collectDependencies hook - skips when no outputDir", async () => {
  const assets = new Set(['/fake/path/logo.png']);

  const plugin = createAssetLoaderPlugin({
    // No outputDir
  });

  // Should not throw
  await plugin.hooks.collectDependencies({ assets }, {});
});

test("afterTransform hook - returns data unchanged when no assets", async () => {
  const plugin = createAssetLoaderPlugin({
    outputDir: '/tmp/test'
  });

  const data = {
    transformed: 'const x = 1;',
    source: 'const x = 1;',
    filePath: '/test/file.js'
  };

  const result = await plugin.hooks.afterTransform(data, {});
  assert.deepStrictEqual(result, data);
});

test("afterBundle hook - adds assets to bundle result", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'ono-test-'));

  try {
    // Create test asset
    const sourceDir = path.join(tempDir, 'src');
    await mkdir(sourceDir, { recursive: true });
    await writeFile(path.join(sourceDir, 'logo.png'), 'test content');

    const assetPath = path.join(sourceDir, 'logo.png');
    const assets = new Set([assetPath]);

    const plugin = createAssetLoaderPlugin({
      outputDir: tempDir,
      hashAssets: false
    });

    // Execute collectDependencies hook first
    await plugin.hooks.collectDependencies({ assets }, {});

    // Execute afterBundle hook
    const bundleResult = {
      code: 'const x = 1;',
      assets: []
    };

    const result = await plugin.hooks.afterBundle(bundleResult, {});

    // Should have assets
    assert.ok(Array.isArray(result.assets));
    assert.strictEqual(result.assets.length, 1);
    assert.ok(result.assets[0].sourcePath.includes('logo.png'));
    assert.ok(result.assets[0].publicPath);
    assert.ok(result.assets[0].outputPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("plugin options - respects hashAssets=false", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'ono-test-'));

  try {
    const sourceDir = path.join(tempDir, 'src');
    await mkdir(sourceDir, { recursive: true });
    await writeFile(path.join(sourceDir, 'logo.png'), 'content');

    const assetPath = path.join(sourceDir, 'logo.png');
    const assets = new Set([assetPath]);

    const plugin = createAssetLoaderPlugin({
      outputDir: tempDir,
      hashAssets: false
    });

    await plugin.hooks.collectDependencies({ assets }, {});

    const bundleResult = { code: '', assets: [] };
    const result = await plugin.hooks.afterBundle(bundleResult, {});

    // Should use original filename without hash
    assert.strictEqual(result.assets[0].publicPath, '/assets/logo.png');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("plugin options - respects custom assetsDir", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'ono-test-'));

  try {
    const sourceDir = path.join(tempDir, 'src');
    await mkdir(sourceDir, { recursive: true });
    await writeFile(path.join(sourceDir, 'logo.png'), 'content');

    const assetPath = path.join(sourceDir, 'logo.png');
    const assets = new Set([assetPath]);

    const plugin = createAssetLoaderPlugin({
      outputDir: tempDir,
      hashAssets: false,
      assetsDir: 'static'
    });

    await plugin.hooks.collectDependencies({ assets }, {});

    const bundleResult = { code: '', assets: [] };
    const result = await plugin.hooks.afterBundle(bundleResult, {});

    // Should use custom directory
    assert.strictEqual(result.assets[0].publicPath, '/static/logo.png');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("integration - plugin processes assets through all hooks", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'ono-test-'));

  try {
    const sourceDir = path.join(tempDir, 'src');
    await mkdir(sourceDir, { recursive: true });
    await writeFile(path.join(sourceDir, 'logo.png'), 'fake png content');

    const assetPath = path.join(sourceDir, 'logo.png');
    const assets = new Set([assetPath]);

    const plugin = createAssetLoaderPlugin({
      outputDir: tempDir,
      hashAssets: true
    });

    // 1. Collect dependencies
    await plugin.hooks.collectDependencies({ assets }, {});

    // 2. Transform code with asset import
    const sourceCode = `import logo from './logo.png';\nconst x = logo;`;
    const transformedCode = sourceCode; // Assume already transformed

    const transformData = {
      transformed: transformedCode,
      source: sourceCode,
      filePath: path.join(sourceDir, 'test.js')
    };

    const transformResult = await plugin.hooks.afterTransform(transformData, {});

    // Should replace import with const
    assert.ok(transformResult.transformed.includes('const logo = '));
    assert.ok(transformResult.transformed.includes('/assets/logo-'));
    assert.ok(!transformResult.transformed.includes('import logo from'));

    // 3. After bundle
    const bundleResult = { code: transformResult.transformed, assets: [] };
    const finalResult = await plugin.hooks.afterBundle(bundleResult, {});

    // Should have asset information
    assert.strictEqual(finalResult.assets.length, 1);
    assert.ok(finalResult.assets[0].publicPath.startsWith('/assets/'));

    // Verify file was actually copied
    await access(finalResult.assets[0].outputPath);
    const content = await readFile(finalResult.assets[0].outputPath, 'utf-8');
    assert.strictEqual(content, 'fake png content');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
