import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildFile, buildFiles, importJSXModule } from "../src/builder.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures");
const outDir = path.join(__dirname, "builder-test-tmp");

beforeEach(async () => {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
});

afterEach(async () => {
  await rm(outDir, { recursive: true, force: true });
});

test("importJSXModule - returns the module namespace", async () => {
  const module = await importJSXModule(path.join(fixturesDir, "App.jsx"));
  assert.strictEqual(typeof module.default, "function");
});

test("importJSXModule - rejects on non-existent file", async () => {
  await assert.rejects(
    () => importJSXModule(path.join(fixturesDir, "NonExistent.jsx")),
    /Cannot read file/i
  );
});

test("importJSXModule - cleans up its temp directory", async () => {
  await importJSXModule(path.join(fixturesDir, "App.jsx"));
  const tempDir = path.join(process.cwd(), ".ono");
  if (existsSync(tempDir)) {
    const { readdir } = await import("node:fs/promises");
    const leftovers = await readdir(tempDir);
    assert.deepStrictEqual(leftovers, []);
  }
});

test("buildFile - single file with imports renders all components", async () => {
  const { html, outputPath } = await buildFile(path.join(fixturesDir, "App.jsx"), {
    outputDir: outDir,
    silent: true,
  });

  assert.ok(html.includes("<h1>App</h1>"));
  assert.ok(html.includes("My Card"));
  assert.ok(html.includes("<button>Submit</button>"));
  assert.strictEqual(outputPath, path.join(outDir, "App.html"));
  assert.ok(existsSync(outputPath));
});

test("buildFile - JSX fragments render without a wrapper", async () => {
  const pageDir = path.join(outDir, "src");
  await mkdir(pageDir, { recursive: true });
  const page = path.join(pageDir, "fragment.jsx");
  await writeFile(
    page,
    `export default function Page() {
  return (
    <>
      <h1>Title</h1>
      <p>Body</p>
    </>
  );
}`
  );

  const { html } = await buildFile(page, { outputDir: outDir, silent: true });
  assert.strictEqual(html, "<h1>Title</h1><p>Body</p>");
});

test("buildFile - rejects when there is no default export", async () => {
  const page = path.join(outDir, "no-default.jsx");
  await writeFile(page, `export const meta = { title: "x" };`);

  await assert.rejects(
    () => buildFile(page, { outputDir: outDir, silent: true }),
    /No default export/i
  );
});

test("buildFiles - preserves nested directory structure", async () => {
  const pagesDir = path.join(outDir, "pages");
  await mkdir(path.join(pagesDir, "blog"), { recursive: true });
  await writeFile(
    path.join(pagesDir, "index.jsx"),
    `export default () => <h1>Home</h1>;`
  );
  await writeFile(
    path.join(pagesDir, "blog", "first-post.jsx"),
    `export default () => <article>Post</article>;`
  );

  const results = await buildFiles(pagesDir, { outputDir: outDir, silent: true });
  const outputs = results.map((r) => r.outputPath).sort();

  assert.deepStrictEqual(outputs, [
    path.join(outDir, "blog", "first-post.html"),
    path.join(outDir, "index.html"),
  ]);
  assert.ok(existsSync(path.join(outDir, "blog", "first-post.html")));
});
