import { test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  isAssetFile,
  generateFileHash,
  generateAssetFilename,
  copyAsset,
  replaceAssetImports,
  collectAssetImports,
  ASSET_EXTENSIONS
} from "../src/asset-loader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("ASSET_EXTENSIONS - contains common image formats", () => {
  assert.ok(ASSET_EXTENSIONS.has('.png'));
  assert.ok(ASSET_EXTENSIONS.has('.jpg'));
  assert.ok(ASSET_EXTENSIONS.has('.jpeg'));
  assert.ok(ASSET_EXTENSIONS.has('.gif'));
  assert.ok(ASSET_EXTENSIONS.has('.svg'));
  assert.ok(ASSET_EXTENSIONS.has('.webp'));
});

test("ASSET_EXTENSIONS - contains font formats", () => {
  assert.ok(ASSET_EXTENSIONS.has('.woff'));
  assert.ok(ASSET_EXTENSIONS.has('.woff2'));
  assert.ok(ASSET_EXTENSIONS.has('.ttf'));
  assert.ok(ASSET_EXTENSIONS.has('.otf'));
});

test("isAssetFile - returns true for image files", () => {
  assert.strictEqual(isAssetFile('logo.png'), true);
  assert.strictEqual(isAssetFile('photo.jpg'), true);
  assert.strictEqual(isAssetFile('icon.svg'), true);
});

test("isAssetFile - returns true for font files", () => {
  assert.strictEqual(isAssetFile('font.woff'), true);
  assert.strictEqual(isAssetFile('font.woff2'), true);
  assert.strictEqual(isAssetFile('font.ttf'), true);
});

test("isAssetFile - returns false for JS/JSX files", () => {
  assert.strictEqual(isAssetFile('component.jsx'), false);
  assert.strictEqual(isAssetFile('script.js'), false);
  assert.strictEqual(isAssetFile('module.ts'), false);
});

test("isAssetFile - case insensitive", () => {
  assert.strictEqual(isAssetFile('LOGO.PNG'), true);
  assert.strictEqual(isAssetFile('Photo.JPG'), true);
});

test("generateFileHash - generates consistent hash", () => {
  const content1 = "test content";
  const content2 = "test content";
  const content3 = "different content";

  const hash1 = generateFileHash(content1);
  const hash2 = generateFileHash(content2);
  const hash3 = generateFileHash(content3);

  assert.strictEqual(hash1, hash2, "Same content should produce same hash");
  assert.notStrictEqual(hash1, hash3, "Different content should produce different hash");
});

test("generateFileHash - returns 8 character hash", () => {
  const hash = generateFileHash("test");
  assert.strictEqual(hash.length, 8);
});

test("generateAssetFilename - adds hash before extension", () => {
  const result = generateAssetFilename('logo.png', 'abc12345');
  assert.strictEqual(result, 'logo-abc12345.png');
});

test("generateAssetFilename - handles multiple dots in filename", () => {
  const result = generateAssetFilename('my.logo.png', 'abc12345');
  assert.strictEqual(result, 'my.logo-abc12345.png');
});

test("copyAsset - copies file to output directory with hash", async () => {
  // Create temporary directories
  const tempDir = await mkdtemp(path.join(tmpdir(), 'ono-test-'));
  const sourceDir = path.join(tempDir, 'src');
  const outputDir = path.join(tempDir, 'dist');

  try {
    // Create source directory and file
    await mkdir(sourceDir, { recursive: true });
    await writeFile(path.join(sourceDir, 'logo.png'), 'fake png content');
    const sourcePath = path.join(sourceDir, 'logo.png');

    // Copy asset
    const result = await copyAsset(sourcePath, outputDir, { hash: true });

    // Verify result structure
    assert.ok(result.outputPath, "Should have outputPath");
    assert.ok(result.publicPath, "Should have publicPath");

    // Verify public path format
    assert.ok(result.publicPath.startsWith('/assets/'), "Public path should start with /assets/");
    assert.ok(result.publicPath.includes('logo-'), "Should include filename");
    assert.ok(result.publicPath.endsWith('.png'), "Should preserve extension");

    // Verify file was copied
    const copiedContent = await readFile(result.outputPath, 'utf-8');
    assert.strictEqual(copiedContent, 'fake png content');
  } finally {
    // Clean up
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("copyAsset - without hash uses original filename", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'ono-test-'));
  const sourceDir = path.join(tempDir, 'src');
  const outputDir = path.join(tempDir, 'dist');

  try {
    await mkdir(sourceDir, { recursive: true });
    await writeFile(path.join(sourceDir, 'logo.png'), 'content');
    const sourcePath = path.join(sourceDir, 'logo.png');

    const result = await copyAsset(sourcePath, outputDir, { hash: false });

    assert.strictEqual(result.publicPath, '/assets/logo.png');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("copyAsset - respects custom assetsDir", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'ono-test-'));
  const sourceDir = path.join(tempDir, 'src');
  const outputDir = path.join(tempDir, 'dist');

  try {
    await mkdir(sourceDir, { recursive: true });
    await writeFile(path.join(sourceDir, 'logo.png'), 'content');
    const sourcePath = path.join(sourceDir, 'logo.png');

    const result = await copyAsset(sourcePath, outputDir, {
      hash: false,
      assetsDir: 'static'
    });

    assert.strictEqual(result.publicPath, '/static/logo.png');
    assert.ok(result.outputPath.includes('static'));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("replaceAssetImports - replaces default import", () => {
  const code = `import logo from './logo.png';`;
  const assetMap = new Map([['./logo.png', '/assets/logo-abc123.png']]);

  const result = replaceAssetImports(code, assetMap);

  assert.strictEqual(result, `const logo = "/assets/logo-abc123.png";`);
});

test("replaceAssetImports - replaces multiple imports", () => {
  const code = `
import logo from './logo.png';
import icon from './icon.svg';
`.trim();

  const assetMap = new Map([
    ['./logo.png', '/assets/logo-abc123.png'],
    ['./icon.svg', '/assets/icon-def456.svg']
  ]);

  const result = replaceAssetImports(code, assetMap);

  assert.ok(result.includes('const logo = "/assets/logo-abc123.png"'));
  assert.ok(result.includes('const icon = "/assets/icon-def456.svg"'));
  assert.ok(!result.includes('import'));
});

test("replaceAssetImports - handles default as syntax", () => {
  const code = `import { default as logo } from './logo.png';`;
  const assetMap = new Map([['./logo.png', '/assets/logo-abc123.png']]);

  const result = replaceAssetImports(code, assetMap);

  assert.strictEqual(result, `const logo = "/assets/logo-abc123.png";`);
});

test("replaceAssetImports - preserves code without matching imports", () => {
  const code = `import Component from './Component.jsx';`;
  const assetMap = new Map([['./logo.png', '/assets/logo-abc123.png']]);

  const result = replaceAssetImports(code, assetMap);

  assert.strictEqual(result, code);
});

test("collectAssetImports - filters asset imports from parsed imports", () => {
  const imports = [
    { specifier: './Button.jsx', resolved: '/path/to/Button.jsx' },
    { specifier: './logo.png', resolved: '/path/to/logo.png' },
    { specifier: './icon.svg', resolved: '/path/to/icon.svg' },
    { specifier: 'react', resolved: null },
  ];

  const result = collectAssetImports(imports);

  assert.strictEqual(result.length, 2);
  assert.ok(result.includes('/path/to/logo.png'));
  assert.ok(result.includes('/path/to/icon.svg'));
  assert.ok(!result.includes('/path/to/Button.jsx'));
});

test("collectAssetImports - returns empty array when no assets", () => {
  const imports = [
    { specifier: './Button.jsx', resolved: '/path/to/Button.jsx' },
    { specifier: './Card.jsx', resolved: '/path/to/Card.jsx' },
  ];

  const result = collectAssetImports(imports);

  assert.strictEqual(result.length, 0);
});
