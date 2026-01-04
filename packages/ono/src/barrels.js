/**
 * Barrels - Auto-generated barrel files with type inference
 */
import { readdir, writeFile, mkdir } from "node:fs/promises";
import { join, basename, dirname, relative } from "node:path";
import { bundle } from "./bundler.js";

/**
 * Convert kebab-case or snake_case to camelCase
 */
function toCamelCase(str) {
  return str.replace(/[-_]([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Infer TypeScript type from a JavaScript value
 */
function inferType(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    // Infer from first element
    return `${inferType(value[0])}[]`;
  }
  if (value instanceof Date) return "Date";
  if (typeof value === "object") {
    // For nested objects, use Record type
    return "Record<string, unknown>";
  }
  return typeof value; // 'string' | 'number' | 'boolean'
}

/**
 * Generate Meta type definition from collected metas
 */
function generateMetaType(metas) {
  if (metas.length === 0) return "export type Meta = Record<string, never>;";

  // Collect all keys and their occurrence count
  const keyCounts = {};
  const keyTypes = {};

  for (const meta of metas) {
    if (!meta) continue;
    for (const [key, value] of Object.entries(meta)) {
      keyCounts[key] = (keyCounts[key] || 0) + 1;
      // Store the first non-undefined value's type
      if (!keyTypes[key] && value !== undefined) {
        keyTypes[key] = inferType(value);
      }
    }
  }

  // Generate type fields
  const fields = Object.entries(keyCounts)
    .map(([key, count]) => {
      const type = keyTypes[key] || "unknown";
      const optional = count < metas.length;
      return `  ${key}${optional ? "?" : ""}: ${type};`;
    })
    .join("\n");

  return `export type Meta = {\n${fields}\n};`;
}

/**
 * Get all entry files from a barrel directory
 */
async function getBarrelEntries(barrelDir) {
  const entries = [];

  try {
    const files = await readdir(barrelDir, { withFileTypes: true });

    for (const file of files) {
      if (file.isFile() && (file.name.endsWith(".tsx") || file.name.endsWith(".jsx"))) {
        const id = basename(file.name, file.name.endsWith(".tsx") ? ".tsx" : ".jsx");
        entries.push({
          id,
          file: file.name,
          path: join(barrelDir, file.name),
        });
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Load meta from an entry file by bundling and evaluating
 */
async function loadMeta(entryPath) {
  try {
    // Bundle the file to resolve imports
    const bundledCode = await bundle(entryPath);

    // Create a temporary module to extract meta
    const tempDir = dirname(entryPath);
    const tempFile = join(tempDir, `_temp_meta_${Date.now()}.js`);

    // Add JSX runtime and extract meta
    const code = `
function h(tag, props, ...children) {
  return { tag, props: props || {}, children };
}
${bundledCode}
`;

    await writeFile(tempFile, code);

    try {
      const moduleUrl = new URL(`file://${tempFile}?t=${Date.now()}`);
      const module = await import(moduleUrl.href);
      return module.meta || null;
    } finally {
      // Clean up
      await import("node:fs/promises").then((fs) => fs.unlink(tempFile).catch(() => {}));
    }
  } catch (error) {
    console.warn(`Warning: Could not load meta from ${entryPath}:`, error.message);
    return null;
  }
}

/**
 * Generate a barrel file for a directory
 */
export async function generateBarrel(barrelDir, options = {}) {
  const { silent = false } = options;

  const entries = await getBarrelEntries(barrelDir);

  if (entries.length === 0) {
    return null;
  }

  // Load all metas
  const metas = await Promise.all(
    entries.map((entry) => loadMeta(entry.path))
  );

  // Generate type definition
  const metaType = generateMetaType(metas);

  // Generate imports with camelCase identifiers
  const imports = entries
    .map((entry, idx) => {
      const camelId = toCamelCase(entry.id);
      const hasExportedMeta = metas[idx] !== null;
      if (hasExportedMeta) {
        return `export { default as ${camelId}, meta as ${camelId}Meta } from './${basename(barrelDir)}/${entry.file}';`;
      }
      return `export { default as ${camelId} } from './${basename(barrelDir)}/${entry.file}';`;
    })
    .join("\n");

  // Generate entries array (keep original IDs for URL paths)
  const entriesArray = `export const entries = [${entries.map((e) => `'${e.id}'`).join(", ")}] as const;`;

  // Generate ID to component mapping
  const mapping = entries
    .map((entry, idx) => {
      const camelId = toCamelCase(entry.id);
      const hasExportedMeta = metas[idx] !== null;
      if (hasExportedMeta) {
        return `  '${entry.id}': { component: ${camelId}, meta: ${camelId}Meta }`;
      }
      return `  '${entry.id}': { component: ${camelId}, meta: null }`;
    })
    .join(",\n");
  const mappingExport = `export const posts = {\n${mapping}\n};`;
  const entryIdType = "export type EntryId = typeof entries[number];";

  // Generate barrel content
  const barrelContent = `// Auto-generated barrel file - DO NOT EDIT
// Generated by Ono SSG

${metaType}

${imports}

${entriesArray}
${entryIdType}

${mappingExport}
`;

  // Write barrel file
  const barrelPath = `${barrelDir}.ts`;
  await writeFile(barrelPath, barrelContent);

  if (!silent) {
    console.log(`  Generated: ${relative(process.cwd(), barrelPath)}`);
  }

  return barrelPath;
}

/**
 * Generate all barrel files in a directory
 */
export async function generateBarrels(barrelsRoot, options = {}) {
  const { silent = false } = options;

  try {
    const entries = await readdir(barrelsRoot, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const barrelDir = join(barrelsRoot, entry.name);
        const result = await generateBarrel(barrelDir, { silent: true });
        if (result) {
          results.push(result);
        }
      }
    }

    if (!silent && results.length > 0) {
      console.log(`Generated ${results.length} barrel file(s)`);
    }

    return results;
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
