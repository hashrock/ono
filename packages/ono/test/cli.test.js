/**
 * Snapshot tests for CLI commands
 * These tests capture the actual CLI output and behavior.
 * Update snapshots with: npm run test:update
 */
import { test, beforeEach, afterEach } from "node:test";
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
