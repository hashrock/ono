import { describe, it } from "node:test";
import assert from "node:assert";
import { existsSync, rmSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const createOnoPath = resolve(__dirname, "../index.js");
const templateDir = resolve(__dirname, "../template");

describe("create-ono", () => {
  describe("template files", () => {
    it("should have template directory", () => {
      assert.ok(existsSync(templateDir), "template directory should exist");
    });

    it("should have package.json in template", () => {
      const pkgPath = resolve(templateDir, "package.json");
      assert.ok(existsSync(pkgPath), "template/package.json should exist");
    });

    it("should have valid package.json in template", () => {
      const pkgPath = resolve(templateDir, "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      assert.ok(pkg.name, "package.json should have name");
      assert.ok(pkg.scripts, "package.json should have scripts");
    });

    it("should have index.jsx in template", () => {
      const indexPath = resolve(templateDir, "pages/index.jsx");
      assert.ok(existsSync(indexPath), "pages/index.jsx should exist");
    });
  });

  describe("project creation", () => {
    const testProjectName = "test-project-" + Date.now();
    const testProjectDir = resolve(__dirname, testProjectName);

    it("should create project with custom name", () => {
      try {
        execSync(`node ${createOnoPath} ${testProjectName}`, {
          cwd: __dirname,
          stdio: "pipe",
        });

        assert.ok(existsSync(testProjectDir), "project directory should be created");
        assert.ok(
          existsSync(resolve(testProjectDir, "package.json")),
          "package.json should exist"
        );

        const pkg = JSON.parse(
          readFileSync(resolve(testProjectDir, "package.json"), "utf-8")
        );
        assert.strictEqual(pkg.name, testProjectName, "package name should match");
      } finally {
        if (existsSync(testProjectDir)) {
          rmSync(testProjectDir, { recursive: true });
        }
      }
    });

    it("should fail when directory already exists", () => {
      const existingDir = resolve(__dirname, "existing-dir-" + Date.now());
      try {
        execSync(`node ${createOnoPath} ${existingDir.split("/").pop()}`, {
          cwd: __dirname,
          stdio: "pipe",
        });

        assert.throws(
          () => {
            execSync(`node ${createOnoPath} ${existingDir.split("/").pop()}`, {
              cwd: __dirname,
              stdio: "pipe",
            });
          },
          /already exists/,
          "should throw when directory exists"
        );
      } finally {
        if (existsSync(existingDir)) {
          rmSync(existingDir, { recursive: true });
        }
      }
    });
  });
});
