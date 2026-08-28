import { test } from "node:test";
import assert from "node:assert";
import { bundle } from "../src/bundler.js";

/** Bundle a virtual file system (browser-style ids) */
function bundleFiles(files, entry, options = {}) {
  return bundle({
    entry,
    resolve: (specifier, fromId) => {
      const fromParts = fromId.split("/").slice(0, -1);
      for (const part of specifier.split("/")) {
        if (!part || part === ".") continue;
        if (part === "..") fromParts.pop();
        else fromParts.push(part);
      }
      return fromParts.join("/");
    },
    load: (id) => {
      if (!(id in files)) throw new Error(`Cannot read file: ${id}`);
      return files[id];
    },
    onExternal: options.onExternal ?? "error",
    exposeEntryFunctions: options.exposeEntryFunctions ?? false,
  });
}

/** Evaluate a bundle (no externals) and return the entry module object */
async function evaluate(files, entry, options) {
  const { code, ...rest } = await bundleFiles(files, entry, options);
  const entryModule = new Function(`${code}\nreturn __ono_entry;`)();
  return { entryModule, code, ...rest };
}

test("bundle - default and named imports across modules", async () => {
  const { entryModule } = await evaluate(
    {
      "lib.js": `export default 10;\nexport const twice = (n) => n * 2;`,
      "index.js": `import ten, { twice } from "./lib.js";\nexport default twice(ten);`,
    },
    "index.js",
  );

  assert.strictEqual(entryModule.default, 20);
});

test("bundle - namespace import and aliases", async () => {
  const { entryModule } = await evaluate(
    {
      "lib.js": `export const a = 1;\nexport const b = 2;`,
      "index.js": `import * as lib from "./lib.js";\nimport { a as first } from "./lib.js";\nexport const sum = lib.a + lib.b + first;`,
    },
    "index.js",
  );

  assert.strictEqual(entryModule.sum, 4);
});

test("bundle - modules are evaluated once and in dependency order", async () => {
  const { entryModule } = await evaluate(
    {
      "log.js": `export const order = [];`,
      "a.js": `import { order } from "./log.js";\norder.push("a");\nexport const a = true;`,
      "b.js": `import { order } from "./log.js";\nimport { a } from "./a.js";\norder.push("b");\nexport const b = a;`,
      "index.js": `import { order } from "./log.js";\nimport { b } from "./b.js";\nimport { a } from "./a.js";\nexport const result = order.join(",");`,
    },
    "index.js",
  );

  assert.strictEqual(entryModule.result, "a,b");
});

test("bundle - nested directory resolution", async () => {
  const { entryModule } = await evaluate(
    {
      "components/Button.js": `export default () => "button";`,
      "components/Card.js": `import Button from "./Button.js";\nexport default () => "card+" + Button();`,
      "index.js": `import Card from "./components/Card.js";\nexport default Card();`,
    },
    "index.js",
  );

  assert.strictEqual(entryModule.default, "card+button");
});

test("bundle - re-exports (barrel pattern)", async () => {
  const { entryModule } = await evaluate(
    {
      "posts/hello.js": `export const meta = { title: "Hello" };\nexport default () => "post";`,
      "blog.js": `import hello, { meta as helloMeta } from "./posts/hello.js";\nexport { hello, helloMeta };`,
      "index.js": `export { hello, helloMeta } from "./blog.js";`,
    },
    "index.js",
  );

  assert.strictEqual(entryModule.hello(), "post");
  assert.strictEqual(entryModule.helloMeta.title, "Hello");
});

test("bundle - export star from", async () => {
  const { entryModule } = await evaluate(
    {
      "lib.js": `export const x = 1;\nexport const y = 2;\nexport default "ignored";`,
      "index.js": `export * from "./lib.js";`,
    },
    "index.js",
  );

  assert.strictEqual(entryModule.x, 1);
  assert.strictEqual(entryModule.y, 2);
  assert.strictEqual(entryModule.default, undefined);
});

test("bundle - import cycles resolve like CommonJS", async () => {
  const { entryModule } = await evaluate(
    {
      "a.js": `import { bName } from "./b.js";\nexport function aName() { return "a->" + bName(); }`,
      "b.js": `import { aName } from "./a.js";\nexport function bName() { return "b"; }\nexport const viaA = () => aName();`,
      "index.js": `import { aName } from "./a.js";\nimport { viaA } from "./b.js";\nexport const result = viaA();`,
    },
    "index.js",
  );

  assert.strictEqual(entryModule.result, "a->b");
});

test("bundle - side-effect import evaluates the module", async () => {
  const { entryModule } = await evaluate(
    {
      "setup.js": `globalThis.__ono_test_flag = "ready";`,
      "index.js": `import "./setup.js";\nexport const flag = globalThis.__ono_test_flag;`,
    },
    "index.js",
  );

  assert.strictEqual(entryModule.flag, "ready");
  delete globalThis.__ono_test_flag;
});

test("bundle - default export declaration keeps its binding usable", async () => {
  const { entryModule } = await evaluate(
    {
      "index.js": `export default function App() { return helper(); }\nfunction helper() { return App.name; }`,
    },
    "index.js",
  );

  assert.strictEqual(entryModule.default(), "App");
});

test("bundle - exposeEntryFunctions exports unexported entry functions", async () => {
  const { entryModule } = await evaluate(
    {
      "index.js": `function App() { return "rendered"; }\nApp();`,
    },
    "index.js",
    { exposeEntryFunctions: true },
  );

  assert.strictEqual(entryModule.App(), "rendered");
});

test("bundle - onExternal error rejects package imports", async () => {
  await assert.rejects(
    () =>
      bundleFiles(
        { "index.js": `import React from "react";` },
        "index.js",
        { onExternal: "error" },
      ),
    /Cannot bundle package import "react"/,
  );
});

test("bundle - onExternal hoist moves package imports to the bundle top", async () => {
  const { code, externals } = await bundleFiles(
    {
      "index.js": `import { readFile } from "node:fs/promises";\nexport default readFile;`,
    },
    "index.js",
    { onExternal: "hoist" },
  );

  assert.ok(code.startsWith(`import * as __ono_ext0 from "node:fs/promises";`));
  assert.deepStrictEqual(externals, ["node:fs/promises"]);
});

test("bundle - missing module rejects with the loader's error", async () => {
  await assert.rejects(
    () =>
      bundleFiles(
        { "index.js": `import missing from "./missing.js";` },
        "index.js",
      ),
    /Cannot read file: missing.js/,
  );
});


// --- Module semantics that must survive a bundler/transformer swap ---------

test("bundle - default export forms: class, `as default`, re-exported default", async () => {
  const { entryModule } = await evaluate(
    {
      "cls.js": `export default class Box { static kind = "box"; }`,
      "alias.js": `const fn = () => "aliased"; export { fn as default };`,
      "reexp.js": `export { default as Box } from "./cls.js";\nexport { default } from "./alias.js";`,
      "index.js": `import Box from "./cls.js";\nimport aliased from "./alias.js";\nimport reDefault, { Box as ReBox } from "./reexp.js";\nexport const out = [Box.kind, aliased(), reDefault(), ReBox === Box];`,
    },
    "index.js",
  );
  assert.deepStrictEqual(entryModule.out, ["box", "aliased", "aliased", true]);
});

test("bundle - a module imported via two paths is a single instance", async () => {
  const { entryModule } = await evaluate(
    {
      "state.js": `export const store = { n: 0 }; export const bump = () => ++store.n;`,
      "a/one.js": `import { bump } from "../state.js"; export const a = bump();`,
      "b/two.js": `import { bump, store } from "../state.js"; export const b = bump(); export { store };`,
      "index.js": `import { a } from "./a/one.js";\nimport { b, store } from "./b/two.js";\nexport const result = [a, b, store.n];`,
    },
    "index.js",
  );
  assert.deepStrictEqual(entryModule.result, [1, 2, 2]);
});

test("bundle - dynamic import() text does not confuse the bundler", async () => {
  const { entryModule } = await evaluate(
    {
      "index.js": `const lazy = () => import("./never.js");\nexport const isFn = typeof lazy === "function";`,
    },
    "index.js",
  );
  assert.strictEqual(entryModule.isFn, true);
});
