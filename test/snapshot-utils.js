/**
 * Snapshot testing utilities for Node.js test runner
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import assert from "node:assert";

const SNAPSHOTS_DIR = "test/__snapshots__";

/**
 * Normalize content for snapshot comparison
 * @param {string} content - Content to normalize
 * @returns {string} Normalized content
 */
function normalizeContent(content) {
  return content
    .trim()
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/\s+$/gm, ""); // Remove trailing whitespace
}

/**
 * Generate snapshot file path
 * @param {string} testFile - Test file name
 * @param {string} testName - Test name
 * @returns {string} Snapshot file path
 */
function getSnapshotPath(testFile, testName) {
  const sanitizedTestName = testName.replace(/[^a-zA-Z0-9-_]/g, "_");
  const sanitizedTestFile = testFile.replace(/\.test\.js$/, "");
  return join(SNAPSHOTS_DIR, `${sanitizedTestFile}.${sanitizedTestName}.snap`);
}

/**
 * Read existing snapshot
 * @param {string} snapshotPath - Path to snapshot file
 * @returns {Promise<string|null>} Snapshot content or null if not exists
 */
async function readSnapshot(snapshotPath) {
  try {
    return await readFile(snapshotPath, "utf-8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Write snapshot to file
 * @param {string} snapshotPath - Path to snapshot file
 * @param {string} content - Content to write
 */
async function writeSnapshot(snapshotPath, content) {
  await mkdir(dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, content, "utf-8");
}

/**
 * Match content against snapshot
 * @param {string} content - Actual content
 * @param {string} testFile - Test file name (e.g., "renderer.test.js")
 * @param {string} testName - Test name
 * @param {object} options - Options
 * @param {boolean} options.updateSnapshots - Update snapshots instead of comparing
 */
export async function matchSnapshot(content, testFile, testName, options = {}) {
  const { updateSnapshots = process.env.UPDATE_SNAPSHOTS === "true" } = options;

  const normalizedContent = normalizeContent(content);
  const snapshotPath = getSnapshotPath(testFile, testName);

  if (updateSnapshots) {
    await writeSnapshot(snapshotPath, normalizedContent);
    console.log(`📸 Updated snapshot: ${snapshotPath}`);
    return;
  }

  const existingSnapshot = await readSnapshot(snapshotPath);

  if (existingSnapshot === null) {
    // First time running this test, create snapshot
    await writeSnapshot(snapshotPath, normalizedContent);
    console.log(`📸 Created snapshot: ${snapshotPath}`);
    return;
  }

  const normalizedSnapshot = normalizeContent(existingSnapshot);

  try {
    assert.strictEqual(normalizedContent, normalizedSnapshot);
  } catch (error) {
    // Provide helpful diff information
    console.error(`❌ Snapshot mismatch in ${testName}`);
    console.error(`Expected (snapshot):`);
    console.error(normalizedSnapshot);
    console.error(`Actual:`);
    console.error(normalizedContent);
    console.error(`\nTo update snapshots, run: UPDATE_SNAPSHOTS=true npm test`);
    throw error;
  }
}

/**
 * Match HTML snapshot with formatting
 * @param {string} html - HTML content
 * @param {string} testFile - Test file name
 * @param {string} testName - Test name
 * @param {object} options - Options
 */
export async function matchHTMLSnapshot(html, testFile, testName, options = {}) {
  // Basic HTML formatting for better readability
  const formattedHTML = html
    .replace(/></g, ">\n<")
    .replace(/\n\s*\n/g, "\n")
    .trim();

  await matchSnapshot(formattedHTML, testFile, testName, options);
}

/**
 * Match JavaScript code snapshot
 * @param {string} code - JavaScript code
 * @param {string} testFile - Test file name
 * @param {string} testName - Test name
 * @param {object} options - Options
 */
export async function matchCodeSnapshot(code, testFile, testName, options = {}) {
  await matchSnapshot(code, testFile, testName, options);
}

/**
 * Check if snapshots directory exists
 * @returns {boolean} True if snapshots directory exists
 */
export function hasSnapshots() {
  return existsSync(SNAPSHOTS_DIR);
}