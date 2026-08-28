/**
 * Golden tests: source files in → HTML out.
 *
 * Every case is run through BOTH pipelines and must produce identical HTML:
 *   - Node build   (builder.js: bundle → temp file → import())
 *   - Browser REPL (browser/compiler.js: bundle → new Function)
 * The HTML is also snapshotted so a transformer/bundler swap shows up as a
 * reviewable diff instead of a silent behavior change.
 * Update snapshots with: npm run test:update
 */
import { test, before, after } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildFile } from "../src/builder.js";
import { compileProject } from "../src/browser/compiler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpRoot = path.join(__dirname, "golden-test-tmp");
const raw = { serializers: [(value) => value] };

before(async () => {
  await rm(tmpRoot, { recursive: true, force: true });
  await mkdir(tmpRoot, { recursive: true });
});
after(async () => {
  await rm(tmpRoot, { recursive: true, force: true });
});

let caseCounter = 0;

/** Build the same virtual project with the Node pipeline */
async function buildWithNode(files, entry) {
  const dir = path.join(tmpRoot, `case-${caseCounter++}`);
  for (const [name, source] of Object.entries(files)) {
    const file = path.join(dir, name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, source);
  }
  const { html } = await buildFile(path.join(dir, entry), {
    outputDir: path.join(dir, "dist"),
    silent: true,
  });
  return html;
}

/** Build the same virtual project with the browser pipeline */
async function buildWithBrowser(files, entry) {
  const { html } = await compileProject(files, entry, { enableUno: false });
  return html;
}

/** Register a golden case: both pipelines agree, and the HTML is snapshotted */
function golden(name, files, entry = "index.jsx") {
  test(`golden - ${name}`, async (t) => {
    const [node, browser] = await Promise.all([
      buildWithNode(files, entry),
      buildWithBrowser(files, entry),
    ]);
    assert.strictEqual(browser, node, "Node and browser pipelines must render identically");
    t.assert.snapshot(node, raw);
  });
}

// --- JSX text and whitespace ------------------------------------------------

golden("whitespace - multi-line text, explicit space, inline elements", {
  "index.jsx": `export default function Page() {
  return (
    <p>
      Leading and trailing newlines are trimmed,
      but   inner   spaces   stay.
      <b>bold</b>{" "}
      <i>italic</i> after explicit space
    </p>
  );
}`,
});

golden("entities - decoded in text and attributes", {
  "index.jsx": `export default function Page() {
  return (
    <p title="a &amp; b &quot;q&quot;">
      nbsp:[&nbsp;] copy:&copy; lt:&lt;tag&gt; amp:&amp; quote:"raw"
    </p>
  );
}`,
});

golden("unicode - japanese, emoji, script content", {
  "index.jsx": `export default function Page() {
  const data = { msg: "</script>", ja: "日本語" };
  return (
    <div>
      <h1>こんにちは、世界 🌏🚀</h1>
      <p>絵文字: 👨‍👩‍👧‍👦 とサロゲートペア: 𠮷野家</p>
      <script>{"const x = " + JSON.stringify(data) + ";"}</script>
    </div>
  );
}`,
});

// --- Attributes ----------------------------------------------------------------

// Note: namespaced JSX attributes (xlink:href="...") are not supported by
// sucrase; spread an object literal instead, as below.
golden("attributes - class/className, data/aria, boolean, spread, style, template", {
  "index.jsx": `export default function Page() {
  const extra = { id: "from-spread", class: "spread-class", "data-x": 1 };
  const size = 3;
  return (
    <form>
      <input type="checkbox" disabled checked={true} readOnly={false} />
      <div class="a" data-count={size} aria-hidden="true" />
      <div className="b" style={{ marginTop: "1em", fontSize: 12, "--custom": "1px" }} />
      <div {...extra} class="explicit-wins" />
      <div class="pre" {...extra} />
      <a href={\`/items/\${size}?q=\${"a&b"}\`}>link</a>
      <svg><use href="#icon" {...{ "xlink:href": "#icon" }} /></svg>
    </form>
  );
}`,
});

// --- Element kinds -----------------------------------------------------------

golden("elements - components, member expressions, fragments", {
  "index.jsx": `const UI = {
  Button: ({ children, kind = "default" }) => <button class={"btn-" + kind}>{children}</button>,
};
function List({ items }) {
  return (
    <>
      {items.map((item) => <li>{item}</li>)}
    </>
  );
}
export default function Page() {
  return (
    <div>
      <UI.Button kind="primary">OK</UI.Button>
      <ul><List items={["a", "b"]} /></ul>
      <>
        <>nested fragment</>
        <></>
      </>
    </div>
  );
}`,
});

golden("expressions - conditionals, map, comments, falsy children", {
  "index.jsx": `export default function Page() {
  const user = null;
  const n = 0;
  const items = [{ id: 1, name: "one" }, { id: 2, name: "two" }];
  return (
    <div>
      {/* a JSX comment renders nothing */}
      {user && <p>never</p>}
      {user ? <p>yes</p> : <p>no</p>}
      <span>{n}</span>
      <span>{null}{undefined}{false}{true}{""}</span>
      <ol>{items.map(({ id, name }) => <li data-id={id}>{name}</li>)}</ol>
    </div>
  );
}`,
});

// --- Surrounding JavaScript syntax --------------------------------------------

golden("javascript - modern syntax passes through", {
  "index.jsx": `class Counter {
  count = 0;
  static label = "counter";
  #secret = "hidden";
  get value() { return this.count ?? -1; }
}
const quoteRegex = /"[^"]*"|'[^']*'/g;
const tpl = \`outer \${"inner \`tick\`"} done\`;
export default function Page() {
  const c = new Counter();
  const maybe = undefined;
  return (
    <div>
      <p>{Counter.label}:{c.value}</p>
      <p>{maybe?.nested?.value ?? "fallback"}</p>
      <p>{'say "hi" and \\'bye\\''.match(quoteRegex).join("|")}</p>
      <p>{tpl}</p>
      <p>{[1, 2, 3].map((x) => x ** 2).join(",")}</p>
    </div>
  );
}`,
});

golden("typescript - .ts/.tsx modules with types are stripped", {
  "meta.ts": `export interface Meta { title: string; tags: readonly string[] }
export type Tag = Meta["tags"][number];
export const meta = { title: "Typed", tags: ["a", "b"] } as const satisfies Meta;
export function pick<T extends Meta>(m: T): T["title"] { return m.title; }`,
  "Card.tsx": `import type { Meta } from "./meta.ts";
export default function Card({ meta }: { meta: Meta }) {
  return <section class="card"><h2>{meta.title}</h2>{meta.tags.map((t: string) => <em>{t}</em>)}</section>;
}`,
  "index.tsx": `import Card from "./Card.tsx";
import { meta, pick } from "./meta.ts";
export default function Page(): unknown {
  const title = pick(meta);
  return <main><Card meta={meta} /><p>{title as string}</p></main>;
}`,
}, "index.tsx");

// --- Modules -----------------------------------------------------------------

golden("modules - components dir, barrel re-exports, default aliases", {
  "components/Button.jsx": `export default function Button({ children }) { return <button>{children}</button>; }`,
  "components/Card.jsx": `function Card({ title, children }) {
  return <div class="card"><h2>{title}</h2>{children}</div>;
}
export { Card as default, Card };`,
  "components/index.js": `export { default as Button } from "./Button.jsx";
export { default as Card } from "./Card.jsx";
export * from "./Card.jsx";
export const VERSION = "1";`,
  "shared.js": `let calls = 0;
export function hit() { return ++calls; }`,
  "pages/Inner.jsx": `import { hit } from "../shared.js";
export default function Inner() { return <span>inner {hit()}</span>; }`,
  "index.jsx": `import { Button, Card, VERSION } from "./components/index.js";
import Inner from "./pages/Inner.jsx";
import { hit } from "./shared.js";
export default function Page() {
  return (
    <Card title={"v" + VERSION}>
      <Button>Go</Button>
      <Inner />
      <span>outer {hit()}</span>
    </Card>
  );
}`,
});

golden("modules - cyclic imports between components", {
  "A.jsx": `import B from "./B.jsx";
export default function A({ depth = 0 }) {
  return <div class="a">{depth < 1 ? <B depth={depth + 1} /> : "leaf"}</div>;
}`,
  "B.jsx": `import A from "./A.jsx";
export default function B({ depth }) {
  return <div class="b"><A depth={depth} /></div>;
}`,
  "index.jsx": `import A from "./A.jsx";
export default function Page() { return <A />; }`,
});
