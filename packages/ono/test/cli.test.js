/**
 * Snapshot tests for CLI commands
 * These tests capture the actual CLI output and behavior.
 * Update snapshots with: npm run test:update
 */
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = resolve(__dirname, "../src/cli.js");
const TEST_DIR = resolve(__dirname, "../test-tmp");

// Keep CLI output readable in the snapshot file
const raw = { serializers: [(value) => value] };

/**
 * Helper to run CLI command and capture output
 */
function runCLI(args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("node", [CLI_PATH, ...args], {
      cwd: options.cwd || TEST_DIR,
      env: { ...process.env, ...options.env },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolvePromise({ code, stdout, stderr });
    });

    child.on("error", rejectPromise);
  });
}

/** Normalize file paths so snapshots are environment-independent */
function normalizePaths(output) {
  return output.replace(/\/[^\s'"]+\/test-tmp\//g, "/PATH/test-tmp/");
}

function formatResult({ code, stdout, stderr }) {
  return `Exit Code: ${code}
STDOUT:
${stdout}
STDERR:
${normalizePaths(stderr)}`;
}

beforeEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

test("cli - help message", async (t) => {
  t.assert.snapshot(formatResult(await runCLI(["--help"])), raw);
});

test("cli - help message short flag", async (t) => {
  t.assert.snapshot(formatResult(await runCLI(["-h"])), raw);
});

test("cli - no command provided", async (t) => {
  t.assert.snapshot(formatResult(await runCLI([])), raw);
});

test("cli - unknown command", async (t) => {
  t.assert.snapshot(formatResult(await runCLI(["unknown-command"])), raw);
});

test("cli - version flag (not supported)", async (t) => {
  t.assert.snapshot(formatResult(await runCLI(["--version"])), raw);
});

test("cli - build command help", async (t) => {
  t.assert.snapshot(formatResult(await runCLI(["build", "--help"])), raw);
});

test("cli - build non-existent file", async (t) => {
  t.assert.snapshot(formatResult(await runCLI(["build", "non-existent.jsx"])), raw);
});

test("cli - build non-existent directory", async (t) => {
  t.assert.snapshot(formatResult(await runCLI(["build", "non-existent-dir"])), raw);
});

// --- End-to-end: build real projects ------------------------------------------

import { cp, readFile, readdir } from "node:fs/promises";

/** Recursively list files under dir, sorted, as relative posix paths */
async function listFiles(dir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await listFiles(resolve(dir, entry.name), rel)));
    else out.push(rel);
  }
  return out;
}

/** Copy a project into TEST_DIR (without node_modules / build output) and run `ono build` */
async function buildProject(sourceDir) {
  await cp(sourceDir, TEST_DIR, {
    recursive: true,
    filter: (src) => !/node_modules|\/dist(\/|$)|\.ono/.test(src),
  });
  const result = await runCLI(["build"]);
  assert.strictEqual(result.code, 0, `build failed:\n${result.stderr}`);
  return {
    ...result,
    files: await listFiles(resolve(TEST_DIR, "dist")),
    read: (file) => readFile(resolve(TEST_DIR, "dist", file), "utf-8"),
  };
}

test("cli e2e - example project builds pages, barrels, public and uno.css", async (t) => {
  const built = await buildProject(resolve(__dirname, "../../example"));
  t.assert.snapshot(built.files.join("\n"), raw);

  const blog = await built.read("blog.html");
  assert.ok(blog.includes("Hello World"), "barrel entry is rendered into blog page");
  assert.ok(blog.includes("2025-01-04"), "barrel meta is available to the page");

  const css = await built.read("uno.css");
  assert.ok(css.includes("#0ea5e9") || css.includes("14 165 233"), "uno.config.js theme color is applied");
  assert.ok(/\.btn-primary/.test(css), "uno.config.js shortcuts are applied");
  assert.ok(!built.stdout.includes("Warning"), `no warnings:\n${built.stdout}`);
});

test("cli e2e - create-ono template builds", async (t) => {
  const built = await buildProject(resolve(__dirname, "../../create-ono/template"));
  t.assert.snapshot(built.files.join("\n"), raw);

  const index = await built.read("index.html");
  assert.ok(index.includes("Welcome to Ono!"));
  assert.ok(index.includes("<title>My Ono Site</title>"));
});

test("cli e2e - rebuilding twice yields identical output", async () => {
  const first = await buildProject(resolve(__dirname, "../../create-ono/template"));
  const html1 = await first.read("index.html");
  const second = await runCLI(["build"]);
  assert.strictEqual(second.code, 0);
  assert.strictEqual(await first.read("index.html"), html1);
});
