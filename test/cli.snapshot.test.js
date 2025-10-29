/**
 * Snapshot tests for CLI commands
 * These tests capture the actual CLI output and behavior
 */
import { test, beforeEach, afterEach } from "node:test";
import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { matchSnapshot } from "./snapshot-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = resolve(__dirname, "../src/cli.js");
const TEST_DIR = resolve(__dirname, "../test-tmp");
const TEST_FILE = "cli.snapshot.test.js";

/**
 * Helper to run CLI command and capture output
 */
function runCLI(args, options = {}) {
  return new Promise((resolve, reject) => {
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
      resolve({ code, stdout, stderr });
    });

    child.on("error", (error) => {
      reject(error);
    });

    // For dev command, kill after timeout
    if (options.timeout) {
      setTimeout(() => {
        child.kill("SIGTERM");
      }, options.timeout);
    }
  });
}

beforeEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

test("snapshot - help message", async () => {
  const { code, stdout, stderr } = await runCLI(["--help"]);

  const output = `Exit Code: ${code}
STDOUT:
${stdout}
STDERR:
${stderr}`;

  await matchSnapshot(output, TEST_FILE, "help message");
});

test("snapshot - help message short flag", async () => {
  const { code, stdout, stderr } = await runCLI(["-h"]);

  const output = `Exit Code: ${code}
STDOUT:
${stdout}
STDERR:
${stderr}`;

  await matchSnapshot(output, TEST_FILE, "help message short flag");
});

test("snapshot - no command provided", async () => {
  const { code, stdout, stderr } = await runCLI([]);

  const output = `Exit Code: ${code}
STDOUT:
${stdout}
STDERR:
${stderr}`;

  await matchSnapshot(output, TEST_FILE, "no command provided");
});

test("snapshot - unknown command", async () => {
  const { code, stdout, stderr } = await runCLI(["unknown-command"]);

  const output = `Exit Code: ${code}
STDOUT:
${stdout}
STDERR:
${stderr}`;

  await matchSnapshot(output, TEST_FILE, "unknown command");
});

test("snapshot - version flag (not supported)", async () => {
  const { code, stdout, stderr } = await runCLI(["--version"]);

  const output = `Exit Code: ${code}
STDOUT:
${stdout}
STDERR:
${stderr}`;

  await matchSnapshot(output, TEST_FILE, "version flag not supported");
});

test("snapshot - build command help", async () => {
  const { code, stdout, stderr } = await runCLI(["build", "--help"]);

  // Normalize file paths to be environment-independent
  const normalizedStderr = stderr
    .replace(/\/Users\/[^\/]+\/[^\/]+\/[^\/]+\/mini-jsx\/test-tmp\//g, "/PATH/test-tmp/")
    .replace(/\/home\/runner\/work\/[^\/]+\/[^\/]+\/test-tmp\//g, "/PATH/test-tmp/");

  const output = `Exit Code: ${code}
STDOUT:
${stdout}
STDERR:
${normalizedStderr}`;

  await matchSnapshot(output, TEST_FILE, "build command help");
});

test("snapshot - build non-existent file", async () => {
  const { code, stdout, stderr } = await runCLI(["build", "non-existent.jsx"]);

  // Normalize file paths to be environment-independent
  const normalizedStderr = stderr
    .replace(/\/Users\/[^\/]+\/[^\/]+\/[^\/]+\/mini-jsx\/test-tmp\//g, "/PATH/test-tmp/")
    .replace(/\/home\/runner\/work\/[^\/]+\/[^\/]+\/test-tmp\//g, "/PATH/test-tmp/");

  const output = `Exit Code: ${code}
STDOUT:
${stdout}
STDERR:
${normalizedStderr}`;

  await matchSnapshot(output, TEST_FILE, "build non-existent file");
});

test("snapshot - build non-existent directory", async () => {
  const { code, stdout, stderr } = await runCLI(["build", "non-existent-dir"]);

  // Normalize file paths to be environment-independent
  const normalizedStderr = stderr
    .replace(/\/Users\/[^\/]+\/[^\/]+\/[^\/]+\/mini-jsx\/test-tmp\//g, "/PATH/test-tmp/")
    .replace(/\/home\/runner\/work\/[^\/]+\/[^\/]+\/test-tmp\//g, "/PATH/test-tmp/");

  const output = `Exit Code: ${code}
STDOUT:
${stdout}
STDERR:
${normalizedStderr}`;

  await matchSnapshot(output, TEST_FILE, "build non-existent directory");
});

test("snapshot - serve command", async () => {
  // Create a simple dist directory with an HTML file
  await mkdir(resolve(TEST_DIR, "dist"), { recursive: true });

  // Use a random high port to avoid conflicts
  const port = 9000 + Math.floor(Math.random() * 1000);
  const { code, stdout, stderr } = await runCLI(["serve", "--port", port.toString()], { timeout: 1000 });

  // Remove any dynamic content like timestamps, process IDs, and port numbers
  const cleanedStdout = stdout
    .replace(/Server running at http:\/\/localhost:\d+/g, "Server running at http://localhost:PORT")
    .replace(/PID: \d+/g, "PID: XXXXX")
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, "TIMESTAMP")
    .replace(/port \d+/g, "port PORT");

  const output = `Exit Code: ${code}
STDOUT:
${cleanedStdout}
STDERR:
${stderr}`;

  await matchSnapshot(output, TEST_FILE, "serve command");
});

test("snapshot - watch command on empty directory", async () => {
  const { code, stdout, stderr } = await runCLI(["watch"], { timeout: 1000 });

  // Clean up any dynamic content
  const cleanedStdout = stdout
    .replace(/Found \d+ page\(s\)/g, "Found N page(s)")
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, "TIMESTAMP")
    .replace(/Watching.*for changes/g, "Watching ... for changes")
    .replace(/port \d+/g, "port PORT")
    .replace(/Server running at http:\/\/localhost:\d+/g, "Server running at http://localhost:PORT");

  const output = `Exit Code: ${code}
STDOUT:
${cleanedStdout}
STDERR:
${stderr}`;

  await matchSnapshot(output, TEST_FILE, "watch command on empty directory");
});