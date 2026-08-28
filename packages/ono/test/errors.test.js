/**
 * Error contract: what users see when a build fails.
 * Messages are asserted loosely (what they must mention), not snapshotted,
 * so wording can improve without churn — but the *presence* of file/line
 * information is part of the contract.
 */
import { test, before, after } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildFile } from "../src/builder.js";
import { compileProject } from "../src/browser/compiler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpRoot = path.join(__dirname, "errors-test-tmp");

before(async () => {
  await rm(tmpRoot, { recursive: true, force: true });
  await mkdir(tmpRoot, { recursive: true });
});
after(async () => {
  await rm(tmpRoot, { recursive: true, force: true });
});

let n = 0;
async function nodeBuild(files, entry = "index.jsx") {
  const dir = path.join(tmpRoot, `case-${n++}`);
  for (const [name, source] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(dir, name)), { recursive: true });
    await writeFile(path.join(dir, name), source);
  }
  return buildFile(path.join(dir, entry), { outputDir: path.join(dir, "dist"), silent: true });
}
const browserBuild = (files, entry = "index.jsx") =>
  compileProject(files, entry, { enableUno: false });

/** Assert both pipelines reject and the message matches */
function rejectsBoth(name, files, pattern, options = {}) {
  test(`errors - ${name} (node)`, options, async () => {
    await assert.rejects(() => nodeBuild(files), pattern);
  });
  test(`errors - ${name} (browser)`, options, async () => {
    await assert.rejects(() => browserBuild(files), pattern);
  });
}

rejectsBoth(
  "syntax error names the file and line",
  { "index.jsx": `export default function Page() {\n  return <div>{x</div>;\n}` },
  /index\.jsx.*\(2:\d+\)/s,
);

rejectsBoth(
  "syntax error in an imported component names that file",
  {
    "index.jsx": `import Broken from "./Broken.jsx";\nexport default function Page() { return <Broken />; }`,
    "Broken.jsx": `export default function Broken() {\n\n  return <div>\n}`,
  },
  /Broken\.jsx.*\(\d+:\d+\)/s,
);

rejectsBoth(
  "missing relative import names specifier and importer",
  { "index.jsx": `import Nope from "./Nope.jsx";\nexport default function Page() { return <Nope />; }` },
  /Nope\.jsx/,
);

rejectsBoth(
  "runtime error inside a component propagates",
  { "index.jsx": `export default function Page() { throw new Error("boom from component"); }` },
  /boom from component/,
);

rejectsBoth(
  "top-level await is unsupported and does not pass silently",
  { "index.jsx": `const data = await Promise.resolve(1);\nexport default function Page() { return <p>{data}</p>; }` },
  /await|reserved word/i,
);

test("errors - no default export (node)", async () => {
  await assert.rejects(
    () => nodeBuild({ "index.jsx": `export const meta = { title: "x" };` }),
    /No default export/i,
  );
});
