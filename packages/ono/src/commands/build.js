/**
 * Build command for Ono CLI
 */
import { resolve } from "node:path";
import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadUnoConfig } from "../unocss.js";
import { buildFile, buildFiles, generateUnoCSS } from "../builder.js";
import { generateBarrels } from "../barrels.js";
import { DIRS } from "../constants.js";

/**
 * Parse build command arguments
 * @param {string[]} args - Command line arguments
 * @returns {{ input: string, outputDir: string, showHelp: boolean }}
 */
export function parseBuildArgs(args) {
  const showHelp = args.includes("--help") || args.includes("-h");
  const nonOptionArgs = args.filter((arg) => !arg.startsWith("--"));
  const input = nonOptionArgs[0] || DIRS.PAGES;
  const outputDir = args.includes("--output")
    ? args[args.indexOf("--output") + 1]
    : DIRS.OUTPUT;

  return { input, outputDir, showHelp };
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
  const { input, outputDir, showHelp } = parseBuildArgs(args);

  if (showHelp) {
    showBuildHelp();
    process.exit(0);
  }

  const unocssConfig = await loadUnoConfig();

  // Generate barrel files if barrels directory exists
  await initializeBarrels();

  // Check if input is a directory or a file
  const inputPath = resolve(process.cwd(), input);
  const inputStat = await stat(inputPath);

  if (inputStat.isDirectory()) {
    await buildFiles(input, { outputDir, unocssConfig });
  } else {
    await buildFile(input, { outputDir, unocssConfig });
  }

  // Copy public files
  await copyPublicFiles(outputDir);

  // Generate UnoCSS
  await generateUnoCSS({ outputDir, unocssConfig });

  console.log("\n✨ Build complete!");
}
