#!/usr/bin/env node

/**
 * Ono CLI - Minimalist SSG framework
 */
import { runBuildCommand } from "./commands/build.js";
import { runDevCommand } from "./commands/dev.js";
import { DIRS, PORTS } from "./constants.js";

const args = process.argv.slice(2);
const command = args[0];

/**
 * Show main help message
 */
function showHelp() {
  console.log(`
Ono - Minimalist SSG Framework

Usage:
  ono <command> [options]

Commands:
  build [input]          Build JSX files to static HTML
                         input: file or directory (default: ${DIRS.PAGES})

  dev [input]            Build, watch, and serve with live reload
                         input: file or directory (default: ${DIRS.PAGES})

Options:
  --output <dir>         Output directory (default: ${DIRS.OUTPUT})
  --port <number>        Server port (default: ${PORTS.SERVER})
  --help                 Show this help message

Examples:
  ono build              Build all pages in ${DIRS.PAGES}/ directory
  ono build pages/index.jsx   Build a single file
  ono dev                Start dev server with live reload
  ono dev --port 8080    Start dev server on port 8080
`);
}

/**
 * Main CLI entry point
 */
async function main() {
  try {
    if (!command || command === "--help" || command === "-h") {
      showHelp();
      process.exit(0);
    }

    const commandArgs = args.slice(1);

    switch (command) {
      case "build":
        await runBuildCommand(commandArgs);
        break;

      case "dev":
        await runDevCommand(commandArgs);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.error('Run "ono --help" for usage information');
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error.message);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
