/**
 * Build command for Ono CLI
 */
import { resolve, join } from "node:path";
import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { buildFile, buildFiles, generateUnoCSS } from "../builder.js";
import { generateBarrels } from "../barrels.js";
import { DIRS, PORTS } from "../constants.js";

/**
 * Parse arguments shared by the build and dev commands
 * @param {string[]} args - Command line arguments
 * @returns {{ input: string, outputDir: string, port: number, showHelp: boolean }}
 */
export function parseCommandArgs(args) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      output: { type: "string", default: DIRS.OUTPUT },
      port: { type: "string", default: String(PORTS.SERVER) },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });

  return {
    input: positionals[0] || DIRS.PAGES,
    outputDir: values.output,
    port: Number.parseInt(values.port, 10),
    showHelp: values.help,
  };
}

/**
 * Show build command help
 */
export function showBuildHelp() {
  console.log(`
Usage: ono build [input] [options]

Build JSX files to static HTML

Arguments:
  input                  File or directory to build (default: ${DIRS.PAGES})

Options:
  --output <dir>         Output directory (default: ${DIRS.OUTPUT})
  --help                 Show this help message

Examples:
  ono build              Build all pages in ${DIRS.PAGES}/ directory
  ono build pages/index.jsx   Build a single file
  ono build --output build   Build to build/ directory
`);
}

/**
 * Copy public files to output directory
 * @param {string} outputDir - Output directory path
 * @returns {Promise<void>}
 */
export async function copyPublicFiles(outputDir = DIRS.OUTPUT) {
  const publicDir = resolve(process.cwd(), DIRS.PUBLIC);
  const outDir = resolve(process.cwd(), outputDir);

  if (!existsSync(publicDir)) {
    return;
  }

  /**
   * @param {string} src
   * @param {string} dest
   */
  async function copyRecursive(src, dest) {
    const entries = await readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      if (entry.isDirectory()) {
        await mkdir(destPath, { recursive: true });
        await copyRecursive(srcPath, destPath);
      } else {
        await mkdir(dest, { recursive: true });
        await copyFile(srcPath, destPath);
      }
    }
  }

  await copyRecursive(publicDir, outDir);
}

/**
 * Initialize barrels if barrels directory exists
 * @returns {Promise<void>}
 */
export async function initializeBarrels() {
  const barrelsDir = resolve(process.cwd(), DIRS.BARRELS);
  if (existsSync(barrelsDir)) {
    console.log("Generating barrel files...");
    await generateBarrels(barrelsDir);
  }
}

/**
 * Run the build command
 * @param {string[]} args - Command line arguments (after 'build')
 * @returns {Promise<void>}
 */
export async function runBuildCommand(args) {
  const { input, outputDir, showHelp } = parseCommandArgs(args);

  if (showHelp) {
    showBuildHelp();
    process.exit(0);
  }

  // Generate barrel files if barrels directory exists
  await initializeBarrels();

  // Check if input is a directory or a file
  const inputPath = resolve(process.cwd(), input);
  const inputStat = await stat(inputPath);

  if (inputStat.isDirectory()) {
    await buildFiles(input, { outputDir });
  } else {
    await buildFile(input, { outputDir });
  }

  // Copy public files
  await copyPublicFiles(outputDir);

  // Generate UnoCSS
  await generateUnoCSS({ outputDir });

  console.log("\n✨ Build complete!");
}
