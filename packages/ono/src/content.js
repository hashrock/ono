import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { marked } from "marked";

/**
 * Parse frontmatter from markdown content
 * @param {string} content - Raw markdown content
 * @returns {{ data: Object, content: string }} Parsed frontmatter and content
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { data: {}, content };
  }

  const [, frontmatterStr, markdownContent] = match;
  const data = {};

  // Simple YAML-like parser (supports basic key: value pairs)
  const lines = frontmatterStr.split("\n");
  let currentKey = null;
  let arrayItems = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Array item
    if (trimmed.startsWith("- ")) {
      if (currentKey) {
        arrayItems.push(trimmed.slice(2).trim());
      }
      continue;
    }

    // If we were collecting array items, save them
    if (currentKey && arrayItems.length > 0) {
      data[currentKey] = arrayItems;
      arrayItems = [];
      currentKey = null;
    }

    // Key-value pair
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex > 0) {
      const key = trimmed.slice(0, colonIndex).trim();
      let value = trimmed.slice(colonIndex + 1).trim();

      // Parse value types
      if (value === "") {
        // Empty value might indicate an array follows
        currentKey = key;
        continue;
      } else if (value === "true") {
        value = true;
      } else if (value === "false") {
        value = false;
      } else if (value.startsWith("[") && value.endsWith("]")) {
        // JSON array - parse with proper quoting for unquoted strings
        try {
          // First try parsing as-is (for properly quoted JSON)
          value = JSON.parse(value);
        } catch {
          // If that fails, try parsing as YAML-style array [item1, item2]
          try {
            const items = value
              .slice(1, -1) // Remove [ ]
              .split(",")
              .map((item) => item.trim())
              .filter((item) => item.length > 0);
            value = items;
          } catch {
            // Keep as string if all parsing fails
          }
        }
      } else if (value.startsWith("{") && value.endsWith("}")) {
        // JSON object
        try {
          value = JSON.parse(value);
        } catch {
          // Keep as string if parsing fails
        }
      } else if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        // Date format
        value = new Date(value);
      } else if (/^\d+$/.test(value)) {
        value = parseInt(value, 10);
      } else if (/^\d+\.\d+$/.test(value)) {
        value = parseFloat(value);
      }

      data[key] = value;
      currentKey = null;
    }
  }

  // Handle final array if exists
  if (currentKey && arrayItems.length > 0) {
    data[currentKey] = arrayItems;
  }

  return { data, content: markdownContent };
}

/**
 * Validate data against schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Schema definition
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateSchema(data, schema) {
  const errors = [];

  for (const [key, definition] of Object.entries(schema)) {
    const value = data[key];

    // Check required fields
    if (definition.required && (value === undefined || value === null)) {
      errors.push(`Missing required field: ${key}`);
      continue;
    }

    // Skip validation if field is not present and not required
    if (value === undefined || value === null) {
      // Apply default if specified
      if (definition.default !== undefined) {
        data[key] = definition.default;
      }
      continue;
    }

    // Type validation
    const actualType = Array.isArray(value) ? "array" : typeof value === "object" && value instanceof Date ? "date" : typeof value;

    if (definition.type !== actualType) {
      errors.push(
        `Invalid type for ${key}: expected ${definition.type}, got ${actualType}`,
      );
      continue;
    }

    // Array item type validation
    if (definition.type === "array" && definition.items) {
      for (let i = 0; i < value.length; i++) {
        const itemType = typeof value[i];
        if (itemType !== definition.items) {
          errors.push(
            `Invalid array item type for ${key}[${i}]: expected ${definition.items}, got ${itemType}`,
          );
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate slug from file path
 * @param {string} filePath - File path relative to content directory
 * @returns {string} Generated slug
 */
function generateSlug(filePath) {
  return filePath
    .replace(/\.md$/, "")
    .split(sep)
    .join("/");
}

/**
 * Read all markdown files from a directory recursively
 * @param {string} dir - Directory path
 * @returns {Promise<string[]>} Array of file paths
 */
async function readMarkdownFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await readMarkdownFiles(fullPath)));
    } else if (entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Load content collection configuration
 * @param {string} configPath - Path to content.config.js
 * @returns {Promise<Object>} Configuration object
 */
async function loadConfig(configPath) {
  const configFile = configPath || join(process.cwd(), "content.config.js");
  try {
    // Convert to file URL for proper import
    const fileUrl = new URL(`file://${configFile}`);
    const config = await import(fileUrl.href);
    return config.collections || {};
  } catch {
    return {};
  }
}

/**
 * Get all entries from a collection
 * @param {string} collection - Collection name
 * @param {Function} [filter] - Optional filter function
 * @returns {Promise<Array>} Array of collection entries
 */
export async function getCollection(collection, filter) {
  const contentDir = join(process.cwd(), "content", collection);
  const config = await loadConfig();
  const schema = config[collection]?.schema;

  try {
    const files = await readMarkdownFiles(contentDir);
    const entries = [];

    for (const file of files) {
      const content = await readFile(file, "utf-8");
      const { data, content: markdown } = parseFrontmatter(content);

      // Validate against schema if provided
      if (schema) {
        const validation = validateSchema(data, schema);
        if (!validation.valid) {
          console.warn(`Validation errors in ${file}:`, validation.errors);
        }
      }

      const html = marked.parse(markdown);
      const relativePath = relative(contentDir, file);
      const slug = generateSlug(relativePath);

      entries.push({
        slug,
        data,
        html,
        file,
      });
    }

    // Apply filter if provided
    if (filter) {
      return entries.filter(filter);
    }

    return entries;
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Get a single entry from a collection
 * @param {string} collection - Collection name
 * @param {string} slug - Entry slug
 * @returns {Promise<Object|null>} Collection entry or null if not found
 */
export async function getEntry(collection, slug) {
  const entries = await getCollection(collection);
  return entries.find((entry) => entry.slug === slug) || null;
}
