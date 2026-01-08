import { test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { bundle } from "../src/bundler.js";
import { createAssetLoaderPlugin } from "../src/plugins/asset-loader-plugin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures");

test("bundle - accepts custom plugins", async () => {
  let pluginExecuted = false;

  const customPlugin = {
    name: 'custom-plugin',
    hooks: {
      afterBundle: async (bundleResult) => {
        pluginExecuted = true;
        return bundleResult;
      }
    }
  };

  const entryFile = path.join(fixturesDir, "NoImports.jsx");
  await bundle(entryFile, { plugins: [customPlugin] });

  assert.ok(pluginExecuted, 'Custom plugin should have been executed');
});

test("bundle - plugin can modify bundle result", async () => {
  const customPlugin = {
    name: 'add-metadata',
    hooks: {
      afterBundle: async (bundleResult) => {
        return {
          ...bundleResult,
          metadata: { plugin: 'custom' }
        };
      }
    }
  };

  const entryFile = path.join(fixturesDir, "NoImports.jsx");
  const result = await bundle(entryFile, { plugins: [customPlugin] });

  assert.ok(result.metadata);
  assert.strictEqual(result.metadata.plugin, 'custom');
});

test("bundle - multiple plugins execute in order", async () => {
  const executionOrder = [];

  const plugin1 = {
    name: 'plugin1',
    hooks: {
      afterBundle: async (bundleResult) => {
        executionOrder.push('plugin1');
        return bundleResult;
      }
    }
  };

  const plugin2 = {
    name: 'plugin2',
    hooks: {
      afterBundle: async (bundleResult) => {
        executionOrder.push('plugin2');
        return bundleResult;
      }
    }
  };

  const entryFile = path.join(fixturesDir, "NoImports.jsx");
  await bundle(entryFile, { plugins: [plugin1, plugin2] });

  assert.deepStrictEqual(executionOrder, ['plugin1', 'plugin2']);
});

test("bundle - plugin can transform code", async () => {
  const transformPlugin = {
    name: 'add-comment',
    hooks: {
      afterTransform: async (data) => {
        return {
          ...data,
          transformed: `/* Modified by plugin */\n${data.transformed}`
        };
      }
    }
  };

  const entryFile = path.join(fixturesDir, "NoImports.jsx");
  const result = await bundle(entryFile, { plugins: [transformPlugin] });

  assert.ok(result.code.includes('/* Modified by plugin */'));
});

test("bundle - explicit asset loader plugin works", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'ono-test-'));

  try {
    // Create test asset
    const sourceDir = path.join(tempDir, 'src');
    await mkdir(sourceDir, { recursive: true });
    await writeFile(path.join(sourceDir, 'test.png'), 'content');

    // Create a JSX file that imports the asset
    const jsxFile = path.join(sourceDir, 'App.jsx');
    await writeFile(jsxFile, `
      import img from './test.png';
      export default function App() {
        return <img src={img} />;
      }
    `);

    const assetPlugin = createAssetLoaderPlugin({
      outputDir: tempDir,
      hashAssets: false
    });

    const result = await bundle(jsxFile, {
      plugins: [assetPlugin]
    });

    // Should have processed the asset
    assert.strictEqual(result.assets.length, 1);
    assert.strictEqual(result.assets[0].publicPath, '/assets/test.png');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("bundle - auto-adds asset loader when outputDir provided", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'ono-test-'));

  try {
    const entryFile = path.join(fixturesDir, "SingleAsset.jsx");

    // Should auto-add asset loader plugin when outputDir is provided
    const result = await bundle(entryFile, { outputDir: tempDir });

    assert.strictEqual(result.assets.length, 1);
    assert.ok(result.assets[0].publicPath.startsWith('/assets/'));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("bundle - does not duplicate asset loader plugin", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'ono-test-'));

  try {
    const entryFile = path.join(fixturesDir, "SingleAsset.jsx");

    // Explicitly add asset loader plugin
    const assetPlugin = createAssetLoaderPlugin({
      outputDir: tempDir,
      hashAssets: false
    });

    // Should not add another asset loader plugin
    const result = await bundle(entryFile, {
      outputDir: tempDir,
      plugins: [assetPlugin]
    });

    // Should still process assets correctly (only once)
    assert.strictEqual(result.assets.length, 1);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("bundle - plugin receives correct data in afterTransform hook", async () => {
  let receivedData = null;

  const inspectorPlugin = {
    name: 'inspector',
    hooks: {
      afterTransform: async (data) => {
        receivedData = data;
        return data;
      }
    }
  };

  const entryFile = path.join(fixturesDir, "NoImports.jsx");
  await bundle(entryFile, { plugins: [inspectorPlugin] });

  assert.ok(receivedData);
  assert.ok(receivedData.transformed);
  assert.ok(receivedData.source);
  assert.ok(receivedData.filePath);
  assert.strictEqual(typeof receivedData.isEntry, 'boolean');
});
