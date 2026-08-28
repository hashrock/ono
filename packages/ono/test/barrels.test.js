/**
 * Barrels: a directory of JSX modules becomes one generated module that
 * re-exports them as `entries` (ids) and `posts` (id → { component, meta }).
 * Generation is a pure function of the file names — entries are never
 * evaluated at generation time.
 */
import { test, before, after } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { renderBarrel, generateBarrel, generateBarrels } from "../src/barrels.js";
import { buildFile } from "../src/builder.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = path.join(__dirname, "barrels-test-tmp");
const raw = { serializers: [(value) => value] };

before(async () => {
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
});
after(async () => {
  await rm(tmp, { recursive: true, force: true });
});

test("renderBarrel - is a pure function of the directory name and file list", (t) => {
  const code = renderBarrel("blog", ["hello-world.jsx", "getting-started.tsx", "notes.md", "2nd_post.jsx"]);
  t.assert.snapshot(code, raw);
  // Sorted by id, non-JSX files ignored
  assert.match(code, /entries = \["2nd_post", "getting-started", "hello-world"\]/);
  assert.doesNotMatch(code, /notes/);
});

test("generateBarrel + page build - entries, components and meta are usable from a page", async () => {
  const project = path.join(tmp, "project");
  const blogDir = path.join(project, "barrels", "blog");
  await mkdir(blogDir, { recursive: true });
  await writeFile(
    path.join(blogDir, "hello-world.jsx"),
    `export const meta = { title: "Hello", date: "2025-01-04" };
export default function Hello() { return <article>{meta.title}</article>; }`,
  );
  await writeFile(
    path.join(blogDir, "no-meta.jsx"),
    `export default function NoMeta() { return <article>no meta</article>; }`,
  );
  await mkdir(path.join(project, "pages"), { recursive: true });
  await writeFile(
    path.join(project, "pages", "blog.jsx"),
    `import { entries, posts } from "../barrels/blog.js";
export default function Blog() {
  return (
    <ul>
      {entries.map((id) => {
        const { component: Post, meta } = posts[id];
        return <li data-id={id}>{meta ? meta.title : "(untitled)"}<Post /></li>;
      })}
    </ul>
  );
}`,
  );

  const barrelPath = await generateBarrel(blogDir, { silent: true });
  assert.strictEqual(barrelPath, path.join(project, "barrels", "blog.js"));

  const { html } = await buildFile(path.join(project, "pages", "blog.jsx"), {
    outputDir: path.join(project, "dist"),
    silent: true,
  });
  assert.strictEqual(
    html,
    `<ul><li data-id="hello-world">Hello<article>Hello</article></li><li data-id="no-meta">(untitled)<article>no meta</article></li></ul>`,
  );
});

test("generateBarrels - one barrel per subdirectory, empty dirs skipped, missing root is fine", async () => {
  const root = path.join(tmp, "multi");
  await mkdir(path.join(root, "docs"), { recursive: true });
  await mkdir(path.join(root, "empty"), { recursive: true });
  await writeFile(path.join(root, "docs", "intro.jsx"), `export default () => <p>intro</p>;`);

  const results = await generateBarrels(root, { silent: true });
  assert.deepStrictEqual(results, [path.join(root, "docs.js")]);
  assert.match(await readFile(path.join(root, "docs.js"), "utf-8"), /DO NOT EDIT/);

  assert.deepStrictEqual(await generateBarrels(path.join(tmp, "does-not-exist"), { silent: true }), []);
});
