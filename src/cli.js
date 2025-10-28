#!/usr/bin/env node

/**
 * CLI Tool for mini-jsx
 */

import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "./bundler.js";
import { createElement as h } from "./jsx-runtime.js";
import { renderToString } from "./renderer.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Mini JSX - A lightweight JSX library for static site generation

Usage:
  mini-jsx build <file>    Build a JSX file to HTML
  mini-jsx --help          Show this help message

Example:
  mini-jsx build example/index.jsx
    `);
    process.exit(0);
  }

  const command = args[0];

  if (command === "build") {
    if (args.length < 2) {
      console.error("Error: Please specify a file to build");
      console.error("Usage: mini-jsx build <file>");
      process.exit(1);
    }

    const inputFile = args[1];
    const absolutePath = path.resolve(process.cwd(), inputFile);

    try {
      console.log(`Building ${inputFile}...`);

      // Bundle the JSX file
      const bundledCode = await bundle(absolutePath);

      // Create a temporary module to execute
      // We need to inject our runtime
      const codeWithRuntime = `
import { createElement as h } from "${path.resolve(process.cwd(), "src/jsx-runtime.js")}";
${bundledCode}
`;

      // Write to temporary file
      const tmpFile = path.join(process.cwd(), ".mini-jsx-tmp.js");
      await fs.writeFile(tmpFile, codeWithRuntime);

      // Import and execute
      const module = await import(tmpFile);
      const App = module.default;

      if (!App) {
        throw new Error("No default export found in entry file");
      }

      // Render to HTML
      const vnode = typeof App === "function" ? App({}) : App;
      const html = renderToString(vnode);

      // Add DOCTYPE
      const fullHtml = `<!DOCTYPE html>\n${html}`;

      // Output file name (replace .jsx with .html)
      const outputFile = inputFile.replace(/\.jsx$/, ".html");
      const outputPath = path.resolve(process.cwd(), outputFile);

      await fs.writeFile(outputPath, fullHtml);

      // Clean up temp file
      await fs.unlink(tmpFile);

      console.log(`✓ Built successfully: ${outputFile}`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  } else {
    console.error(`Unknown command: ${command}`);
    console.error('Run "mini-jsx --help" for usage information');
    process.exit(1);
  }
}

main();
