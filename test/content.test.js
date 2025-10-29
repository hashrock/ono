import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { getCollection, getEntry } from "../src/content.js";

const TEST_DIR = join(process.cwd(), "test-content");
const BLOG_DIR = join(TEST_DIR, "content", "blog");

describe("Content Collections", () => {
  beforeEach(async () => {
    // Clean up and create test directories
    await rm(TEST_DIR, { recursive: true, force: true });
    await mkdir(BLOG_DIR, { recursive: true });

    // Create test markdown files
    await writeFile(
      join(BLOG_DIR, "post1.md"),
      `---
title: First Post
date: 2024-01-01
author: John
tags:
  - javascript
  - web
draft: false
---

# Hello World

This is the first post.`,
    );

    await writeFile(
      join(BLOG_DIR, "post2.md"),
      `---
title: Second Post
date: 2024-01-02
author: Jane
tags: [react, jsx]
draft: true
---

# React JSX

This is about JSX.`,
    );

    await writeFile(
      join(BLOG_DIR, "post3.md"),
      `---
title: Third Post
date: 2024-01-03
author: Bob
---

# No tags

This post has no tags.`,
    );

    // Create config file
    await writeFile(
      join(TEST_DIR, "content.config.js"),
      `export const collections = {
  blog: {
    schema: {
      title: { type: "string", required: true },
      date: { type: "date", required: true },
      author: { type: "string", required: true },
      tags: { type: "array", items: "string" },
      draft: { type: "boolean", default: false }
    }
  }
};`,
    );

    // Change to test directory
    process.chdir(TEST_DIR);
  });

  describe("getCollection", () => {
    it("should return all entries from a collection", async () => {
      const entries = await getCollection("blog");

      assert.strictEqual(entries.length, 3);
      assert.ok(entries.every((e) => e.slug && e.data && e.html && e.file));
    });

    it("should parse frontmatter correctly", async () => {
      const entries = await getCollection("blog");
      const post1 = entries.find((e) => e.slug === "post1");

      assert.strictEqual(post1.data.title, "First Post");
      assert.ok(post1.data.date instanceof Date);
      assert.strictEqual(post1.data.author, "John");
      assert.deepStrictEqual(post1.data.tags, ["javascript", "web"]);
      assert.strictEqual(post1.data.draft, false);
    });

    it("should parse JSON-style arrays in frontmatter", async () => {
      const entries = await getCollection("blog");
      const post2 = entries.find((e) => e.slug === "post2");

      assert.deepStrictEqual(post2.data.tags, ["react", "jsx"]);
    });

    it("should apply default values from schema", async () => {
      const entries = await getCollection("blog");
      const post3 = entries.find((e) => e.slug === "post3");

      assert.strictEqual(post3.data.draft, false); // default value
    });

    it("should convert markdown to HTML", async () => {
      const entries = await getCollection("blog");
      const post1 = entries.find((e) => e.slug === "post1");

      assert.ok(post1.html.includes("<h1"));
      assert.ok(post1.html.includes("Hello World"));
      assert.ok(post1.html.includes("<p>"));
      assert.ok(post1.html.includes("first post"));
    });

    it("should filter entries with filter function", async () => {
      const entries = await getCollection("blog", (post) => !post.data.draft);

      assert.strictEqual(entries.length, 2);
      assert.ok(entries.every((e) => e.data.draft === false));
    });

    it("should return empty array for non-existent collection", async () => {
      const entries = await getCollection("nonexistent");

      assert.strictEqual(entries.length, 0);
    });

    it("should generate correct slugs", async () => {
      const entries = await getCollection("blog");
      const slugs = entries.map((e) => e.slug).sort();

      assert.deepStrictEqual(slugs, ["post1", "post2", "post3"]);
    });
  });

  describe("getEntry", () => {
    it("should return a single entry by slug", async () => {
      const entry = await getEntry("blog", "post1");

      assert.ok(entry);
      assert.strictEqual(entry.slug, "post1");
      assert.strictEqual(entry.data.title, "First Post");
    });

    it("should return null for non-existent slug", async () => {
      const entry = await getEntry("blog", "nonexistent");

      assert.strictEqual(entry, null);
    });
  });

  describe("nested directories", () => {
    beforeEach(async () => {
      const nestedDir = join(BLOG_DIR, "2024", "january");
      await mkdir(nestedDir, { recursive: true });

      await writeFile(
        join(nestedDir, "nested-post.md"),
        `---
title: Nested Post
date: 2024-01-15
author: Alice
---

# Nested

This is in a subdirectory.`,
      );
    });

    it("should read markdown files from nested directories", async () => {
      const entries = await getCollection("blog");

      assert.strictEqual(entries.length, 4);
      const nested = entries.find((e) => e.slug === "2024/january/nested-post");
      assert.ok(nested);
      assert.strictEqual(nested.data.title, "Nested Post");
    });

    it("should generate slugs with directory structure", async () => {
      const entry = await getEntry("blog", "2024/january/nested-post");

      assert.ok(entry);
      assert.strictEqual(entry.data.title, "Nested Post");
    });
  });
});
