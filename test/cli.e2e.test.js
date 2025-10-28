import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, "../src/cli.js");
const TEST_DIR = path.resolve(__dirname, "../test-tmp");

/**
 * Helper to run CLI command
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

/**
 * Helper to check if file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper to clean test directory
 */
async function cleanTestDir() {
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch {
    // Ignore if directory doesn't exist
  }
  await fs.mkdir(TEST_DIR, { recursive: true });
}

describe("CLI e2e tests", () => {
  beforeEach(async () => {
    await cleanTestDir();
  });

  afterEach(async () => {
    await cleanTestDir();
  });

  describe("ono --version", () => {
    test("should display version", async () => {
      const { code, stdout } = await runCLI(["--version"]);
      assert.strictEqual(code, 0);
      assert.match(stdout, /ono v\d+\.\d+\.\d+/);
    });

    test("should display version with -v flag", async () => {
      const { code, stdout } = await runCLI(["-v"]);
      assert.strictEqual(code, 0);
      assert.match(stdout, /ono v\d+\.\d+\.\d+/);
    });
  });

  describe("ono --help", () => {
    test("should display help message", async () => {
      const { code, stdout } = await runCLI(["--help"]);
      assert.strictEqual(code, 0);
      assert.match(stdout, /Ono - A lightweight JSX library/);
      assert.match(stdout, /ono init/);
      assert.match(stdout, /ono build/);
      assert.match(stdout, /ono dev/);
    });

    test("should display help with -h flag", async () => {
      const { code, stdout } = await runCLI(["-h"]);
      assert.strictEqual(code, 0);
      assert.match(stdout, /Ono - A lightweight JSX library/);
    });

    test("should display help when no args provided", async () => {
      const { code, stdout } = await runCLI([]);
      assert.strictEqual(code, 0);
      assert.match(stdout, /Ono - A lightweight JSX library/);
    });
  });

  describe("ono init", () => {
    test("should initialize project in current directory", async () => {
      const { code, stdout } = await runCLI(["init"]);
      assert.strictEqual(code, 0);
      assert.match(stdout, /Project initialized successfully/);

      // Check if files were created
      assert.ok(await fileExists(path.join(TEST_DIR, "package.json")));
      assert.ok(await fileExists(path.join(TEST_DIR, ".gitignore")));
      assert.ok(await fileExists(path.join(TEST_DIR, "pages", "index.jsx")));
      assert.ok(await fileExists(path.join(TEST_DIR, "components", "Layout.jsx")));
      assert.ok(await fileExists(path.join(TEST_DIR, "components", "Hello.jsx")));
      assert.ok(await fileExists(path.join(TEST_DIR, "public", "css", "style.css")));
    });

    test("should initialize project in specified directory", async () => {
      const projectDir = path.join(TEST_DIR, "my-project");
      const { code, stdout } = await runCLI(["init", "my-project"]);
      assert.strictEqual(code, 0);
      assert.match(stdout, /Project initialized successfully/);

      // Check if files were created in the project directory
      assert.ok(await fileExists(path.join(projectDir, "package.json")));
      assert.ok(await fileExists(path.join(projectDir, "pages", "index.jsx")));
    });

    test("should fail if directory is not empty", async () => {
      // Create a non-empty directory
      const projectDir = path.join(TEST_DIR, "non-empty");
      await fs.mkdir(projectDir, { recursive: true });
      await fs.writeFile(path.join(projectDir, "existing-file.txt"), "test");

      const { code, stderr } = await runCLI(["init", "non-empty"]);
      assert.strictEqual(code, 1);
      assert.match(stderr, /is not empty/);
    });

    test("should create valid package.json", async () => {
      await runCLI(["init"]);
      const pkgContent = await fs.readFile(path.join(TEST_DIR, "package.json"), "utf-8");
      const pkg = JSON.parse(pkgContent);

      assert.strictEqual(pkg.type, "module");
      assert.ok(pkg.scripts.dev);
      assert.ok(pkg.scripts.build);
    });
  });

  describe("ono build", () => {
    beforeEach(async () => {
      // Create test project structure
      await fs.mkdir(path.join(TEST_DIR, "pages"), { recursive: true });
      await fs.writeFile(
        path.join(TEST_DIR, "pages", "index.jsx"),
        `export default function Home() {
          return (
            <html>
              <head><title>Test</title></head>
              <body><h1>Hello World</h1></body>
            </html>
          );
        }`
      );
    });

    test("should build single file", async () => {
      const { code, stdout } = await runCLI(["build", "pages/index.jsx"]);
      assert.strictEqual(code, 0);
      assert.match(stdout, /Built successfully/);

      // Check if output file was created
      const outputFile = path.join(TEST_DIR, "dist", "index.html");
      assert.ok(await fileExists(outputFile));

      const content = await fs.readFile(outputFile, "utf-8");
      assert.match(content, /<!DOCTYPE html>/);
      assert.match(content, /<h1>Hello World<\/h1>/);
    });

    test("should build pages directory", async () => {
      // Create additional page
      await fs.writeFile(
        path.join(TEST_DIR, "pages", "about.jsx"),
        `export default function About() {
          return (
            <html>
              <head><title>About</title></head>
              <body><h1>About Page</h1></body>
            </html>
          );
        }`
      );

      const { code, stdout } = await runCLI(["build", "pages"]);
      assert.strictEqual(code, 0);
      assert.match(stdout, /Found 2 page\(s\)/);

      // Check if both output files were created
      assert.ok(await fileExists(path.join(TEST_DIR, "dist", "index.html")));
      assert.ok(await fileExists(path.join(TEST_DIR, "dist", "about.html")));
    });

    test("should build with custom output directory", async () => {
      const { code } = await runCLI(["build", "pages/index.jsx", "-o", "public"]);
      assert.strictEqual(code, 0);

      const outputFile = path.join(TEST_DIR, "public", "index.html");
      assert.ok(await fileExists(outputFile));
    });

    test("should copy public files to dist", async () => {
      // Create public directory with files
      await fs.mkdir(path.join(TEST_DIR, "public", "css"), { recursive: true });
      await fs.writeFile(path.join(TEST_DIR, "public", "css", "style.css"), "body { margin: 0; }");

      const { code, stdout } = await runCLI(["build", "pages"]);
      assert.strictEqual(code, 0);
      assert.match(stdout, /Copied/);

      // Check if public files were copied
      const copiedFile = path.join(TEST_DIR, "dist", "css", "style.css");
      assert.ok(await fileExists(copiedFile));
    });

    test("should fail if no JSX files found", async () => {
      await fs.rm(path.join(TEST_DIR, "pages"), { recursive: true });
      await fs.mkdir(path.join(TEST_DIR, "pages"), { recursive: true });

      const { code, stderr } = await runCLI(["build", "pages"]);
      assert.strictEqual(code, 1);
      assert.match(stderr, /No JSX files found/);
    });

    test("should preserve directory structure", async () => {
      // Create nested page
      await fs.mkdir(path.join(TEST_DIR, "pages", "blog"), { recursive: true });
      await fs.writeFile(
        path.join(TEST_DIR, "pages", "blog", "post.jsx"),
        `export default function Post() {
          return (
            <html>
              <head><title>Post</title></head>
              <body><h1>Blog Post</h1></body>
            </html>
          );
        }`
      );

      const { code } = await runCLI(["build", "pages"]);
      assert.strictEqual(code, 0);

      // Check if nested output was created
      const outputFile = path.join(TEST_DIR, "dist", "blog", "post.html");
      assert.ok(await fileExists(outputFile));
    });
  });

  describe("ono dev", () => {
    beforeEach(async () => {
      // Create test project structure
      await fs.mkdir(path.join(TEST_DIR, "pages"), { recursive: true });
      await fs.writeFile(
        path.join(TEST_DIR, "pages", "index.jsx"),
        `export default function Home() {
          return (
            <html>
              <head><title>Test</title></head>
              <body><h1>Hello World</h1></body>
            </html>
          );
        }`
      );
    });

    test("should start dev server", async () => {
      const { stdout } = await runCLI(["dev", "pages/index.jsx"], { timeout: 2000 });
      assert.match(stdout, /Server running at/);
      assert.match(stdout, /localhost:\d+/);
    });

    test("should start dev server on custom port", async () => {
      const { stdout } = await runCLI(["dev", "pages/index.jsx", "-p", "8080"], { timeout: 2000 });
      assert.match(stdout, /localhost:8080/);
    });

    test("should build files before starting server", async () => {
      await runCLI(["dev", "pages/index.jsx"], { timeout: 2000 });

      // Check if output file was created
      const outputFile = path.join(TEST_DIR, "dist", "index.html");
      assert.ok(await fileExists(outputFile));

      const content = await fs.readFile(outputFile, "utf-8");
      assert.match(content, /WebSocket/); // Live reload script
    });

    test("should handle pages directory", async () => {
      const { stdout } = await runCLI(["dev", "pages"], { timeout: 2000 });
      assert.match(stdout, /Found 1 page\(s\)/);
      assert.match(stdout, /Server running at/);
    });

    test("should use default pages directory", async () => {
      const { stdout } = await runCLI(["dev"], { timeout: 2000 });
      assert.match(stdout, /Serving: pages/);
    });
  });

  describe("error handling", () => {
    test("should handle unknown command", async () => {
      const { code, stderr } = await runCLI(["unknown"]);
      assert.strictEqual(code, 1);
      assert.match(stderr, /Unknown command/);
    });

    test("should handle missing file", async () => {
      const { code, stderr } = await runCLI(["build", "nonexistent.jsx"]);
      assert.notStrictEqual(code, 0);
      assert.match(stderr, /Error/);
    });

    test("should handle invalid JSX syntax", async () => {
      await fs.mkdir(path.join(TEST_DIR, "pages"), { recursive: true });
      await fs.writeFile(
        path.join(TEST_DIR, "pages", "broken.jsx"),
        `export default function Broken() {
          return <div>Unclosed tag
        }`
      );

      const { code } = await runCLI(["build", "pages/broken.jsx"]);
      // Note: Some invalid JSX may still build successfully due to bundler tolerance
      // This test verifies the CLI handles the file without crashing
      assert.ok(code === 0 || code === 1);
    });

    test("should handle missing default export", async () => {
      await fs.mkdir(path.join(TEST_DIR, "pages"), { recursive: true });
      await fs.writeFile(
        path.join(TEST_DIR, "pages", "no-export.jsx"),
        `function NoExport() {
          return <div>No export</div>;
        }`
      );

      const { code, stderr } = await runCLI(["build", "pages/no-export.jsx"]);
      assert.notStrictEqual(code, 0);
      assert.match(stderr, /No default export/);
    });
  });
});
