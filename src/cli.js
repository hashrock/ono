#!/usr/bin/env node

/**
 * CLI Tool for mini-jsx
 */

import fs from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import { bundle } from "./bundler.js";
import { renderToString } from "./renderer.js";
import { WebSocketServer } from "ws";
import { generateCSSFromFiles, loadUnoConfig } from "./unocss.js";
import { createDevServer } from "./server.js";

/**
 * Find an available port starting from the given port
 * @param {number} startPort - Port to start searching from
 * @param {number} maxAttempts - Maximum number of ports to try
 * @returns {Promise<number>} Available port number
 */
async function findAvailablePort(startPort, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    try {
      await new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once("error", reject);
        server.once("listening", () => {
          server.close();
          resolve();
        });
        server.listen(port);
      });
      return port;
    } catch (err) {
      if (err.code !== "EADDRINUSE") {
        throw err;
      }
      // Port is in use, try next one
    }
  }
  throw new Error(`Could not find available port in range ${startPort}-${startPort + maxAttempts - 1}`);
}

/**
 * Parse command line arguments into options object
 * @param {string[]} args - Command line arguments
 * @returns {object} Parsed options
 */
function parseArgs(args) {
  const options = {
    _: [], // Positional arguments
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--watch" || arg === "-w") {
      options.watch = true;
    } else if (arg === "--port" || arg === "-p") {
      options.port = parseInt(args[++i]);
    } else if (arg === "--output" || arg === "-o") {
      options.output = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--version" || arg === "-v") {
      options.version = true;
    } else if (!arg.startsWith("-")) {
      options._.push(arg);
    }
  }

  return options;
}

/**
 * Discover all JSX files in the pages directory
 * @param {string} pagesDir - Path to pages directory
 * @returns {Promise<string[]>} Array of JSX file paths
 */
async function discoverPages(pagesDir) {
  const pages = [];

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".jsx")) {
        pages.push(fullPath);
      }
    }
  }

  try {
    await walk(pagesDir);
    return pages;
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Generate UnoCSS file from built HTML files
 * @param {string} outputDir - Output directory containing HTML files
 * @param {boolean} silent - Suppress console output
 * @returns {Promise<boolean>} True if CSS was generated
 */
async function generateUnoCSSFile(outputDir, silent = false) {
  const outputDirAbs = path.resolve(process.cwd(), outputDir);

  // Find all HTML files
  const htmlFiles = [];

  async function findHTMLFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await findHTMLFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        htmlFiles.push(fullPath);
      }
    }
  }

  try {
    await findHTMLFiles(outputDirAbs);

    if (htmlFiles.length === 0) {
      return false;
    }

    // Load UnoCSS config
    const unoConfig = await loadUnoConfig(path.resolve(process.cwd(), "uno.config.js"));

    // Generate CSS from all HTML files
    const css = await generateCSSFromFiles(htmlFiles, unoConfig);

    if (css) {
      // Write CSS file
      const cssPath = path.join(outputDirAbs, "uno.css");
      await fs.writeFile(cssPath, css);

      if (!silent) {
        console.log(`\n⚡ Generated UnoCSS: uno.css`);
      }

      return true;
    }

    return false;
  } catch (error) {
    if (!silent) {
      console.error(`Warning: UnoCSS generation failed: ${error.message}`);
    }
    return false;
  }
}

/**
 * Copy public directory to output directory
 * @param {string} publicDir - Path to public directory
 * @param {string} outputDir - Path to output directory
 * @param {boolean} silent - Suppress console output
 * @returns {Promise<number>} Number of files copied
 */
async function copyPublicFiles(publicDir, outputDir, silent = false) {
  const publicDirAbs = path.resolve(process.cwd(), publicDir);
  const outputDirAbs = path.resolve(process.cwd(), outputDir);

  try {
    // Check if public directory exists
    await fs.access(publicDirAbs);
  } catch (error) {
    // Public directory doesn't exist, skip
    return 0;
  }

  let fileCount = 0;

  async function copyRecursive(src, dest) {
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true });
        await copyRecursive(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
        fileCount++;
        if (!silent) {
          const relativePath = path.relative(publicDirAbs, srcPath);
          console.log(`📄 Copied: public/${relativePath}`);
        }
      }
    }
  }

  await copyRecursive(publicDirAbs, outputDirAbs);
  return fileCount;
}

/**
 * Build a JSX file to HTML
 * @param {string} inputFile - Path to input JSX file
 * @param {object} options - Build options
 * @param {boolean} options.liveReload - Inject live reload script
 * @param {boolean} options.silent - Suppress console output
 * @param {number} options.wsPort - WebSocket port for live reload
 * @param {string} options.outputDir - Custom output directory
 * @param {string} options.pagesDir - Pages directory for relative path calculation
 * @returns {Promise<{outputPath: string, html: string}>}
 */
async function buildFile(inputFile, options = {}) {
  const { liveReload = false, silent = false, wsPort = 35729, outputDir = "dist", pagesDir = null } = options;
  const absolutePath = path.resolve(process.cwd(), inputFile);

  if (!silent) {
    console.log(`Building ${inputFile}...`);
  }

  // Bundle the JSX file
  const bundledCode = await bundle(absolutePath);

  // Create a temporary module to execute
  // We need to inject our runtime inline (no external dependencies)
  const codeWithRuntime = `
// Inline JSX Runtime - No external dependencies required
function flattenChildren(children) {
  const result = [];
  for (const child of children) {
    if (child === null || child === undefined || typeof child === 'boolean') {
      continue;
    }
    if (Array.isArray(child)) {
      result.push(...flattenChildren(child));
    } else {
      result.push(child);
    }
  }
  return result;
}

function h(tag, props, ...children) {
  return {
    tag,
    props: props || {},
    children: flattenChildren(children)
  };
}

${bundledCode}
`;

  // Write to temporary file
  const tmpFile = path.join(process.cwd(), ".mini-jsx-tmp.js");
  await fs.writeFile(tmpFile, codeWithRuntime);

  // Import and execute
  const moduleUrl = `${tmpFile}?t=${Date.now()}`;
  const module = await import(moduleUrl);
  const App = module.default;

  if (!App) {
    throw new Error("No default export found in entry file");
  }

  // Render to HTML
  let vnode = typeof App === "function" ? App({}) : App;

  // Handle async components
  if (vnode instanceof Promise) {
    vnode = await vnode;
  }

  let html = renderToString(vnode);

  // Inject live reload script if requested
  if (liveReload) {
    const liveReloadScript = `
<script>
(function() {
  const ws = new WebSocket('ws://localhost:${wsPort}');
  ws.onmessage = function(event) {
    if (event.data === 'reload') {
      console.log('Reloading...');
      window.location.reload();
    }
  };
  ws.onclose = function() {
    console.log('Live reload disconnected. Retrying...');
    setTimeout(function() { window.location.reload(); }, 1000);
  };
})();
</script>`;
    html = html.replace("</body>", `${liveReloadScript}\n</body>`);
  }

  // Add DOCTYPE
  const fullHtml = `<!DOCTYPE html>\n${html}`;

  // Output to specified directory
  const outDir = path.resolve(process.cwd(), outputDir);
  await fs.mkdir(outDir, { recursive: true });

  // Output file name - preserve directory structure if pagesDir is specified
  let outputPath;
  let relativeOutput;

  if (pagesDir) {
    // Preserve the directory structure from pages folder
    const pagesDirAbs = path.resolve(process.cwd(), pagesDir);
    const relativePath = path.relative(pagesDirAbs, absolutePath);
    const outputRelative = relativePath.replace(/\.jsx$/, ".html");
    outputPath = path.join(outDir, outputRelative);

    // Create subdirectories if needed
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    relativeOutput = path.relative(process.cwd(), outputPath);
  } else {
    // Single file mode - just use basename
    const inputBasename = path.basename(inputFile, ".jsx");
    const outputFilename = `${inputBasename}.html`;
    outputPath = path.join(outDir, outputFilename);
    relativeOutput = path.relative(process.cwd(), outputPath);
  }

  await fs.writeFile(outputPath, fullHtml);

  // Clean up temp file
  await fs.unlink(tmpFile);

  if (!silent) {
    console.log(`✓ Built successfully: ${relativeOutput}`);
  }

  return { outputPath, html: fullHtml };
}

/**
 * Check if a file path contains dynamic route segments (e.g., [slug])
 * @param {string} filePath - File path to check
 * @returns {boolean}
 */
function isDynamicRoute(filePath) {
  return /\[([^\]]+)\]/.test(filePath);
}

/**
 * Build a dynamic route file by calling getStaticPaths and generating pages
 * @param {string} inputFile - Path to input JSX file with dynamic segments
 * @param {object} options - Build options
 * @returns {Promise<Array>} Array of generated page results
 */
async function buildDynamicRoute(inputFile, options = {}) {
  const { liveReload = false, silent = false, wsPort = 35729, outputDir = "dist", pagesDir = null } = options;
  const absolutePath = path.resolve(process.cwd(), inputFile);

  // Bundle and import the module to get getStaticPaths
  const bundledCode = await bundle(absolutePath);

  const codeWithRuntime = `
// Inline JSX Runtime
function flattenChildren(children) {
  const result = [];
  for (const child of children) {
    if (child === null || child === undefined || typeof child === 'boolean') {
      continue;
    }
    if (Array.isArray(child)) {
      result.push(...flattenChildren(child));
    } else {
      result.push(child);
    }
  }
  return result;
}

function h(tag, props, ...children) {
  return {
    tag,
    props: props || {},
    children: flattenChildren(children)
  };
}

${bundledCode}
`;

  const tmpFile = path.join(process.cwd(), ".mini-jsx-tmp.js");
  await fs.writeFile(tmpFile, codeWithRuntime);

  const moduleUrl = `${tmpFile}?t=${Date.now()}`;
  const module = await import(moduleUrl);

  // Check if getStaticPaths exists
  if (!module.getStaticPaths) {
    throw new Error(`Dynamic route ${inputFile} must export a getStaticPaths function`);
  }

  // Get all paths to generate
  const pathsData = await module.getStaticPaths();
  const paths = Array.isArray(pathsData) ? pathsData : pathsData.paths || [];

  if (!silent) {
    console.log(`Building dynamic route ${inputFile} (${paths.length} pages)...`);
  }

  const results = [];
  const App = module.default;

  if (!App) {
    throw new Error("No default export found in entry file");
  }

  // Generate a page for each path
  for (const pathData of paths) {
    const params = pathData.params || {};

    // Render with params
    let vnode = typeof App === "function" ? App({ params }) : App;

    if (vnode instanceof Promise) {
      vnode = await vnode;
    }

    let html = renderToString(vnode);

    // Inject live reload script if requested
    if (liveReload) {
      const liveReloadScript = `
<script>
(function() {
  const ws = new WebSocket('ws://localhost:${wsPort}');
  ws.onmessage = function(event) {
    if (event.data === 'reload') {
      console.log('Reloading...');
      window.location.reload();
    }
  };
  ws.onclose = function() {
    console.log('Live reload disconnected. Retrying...');
    setTimeout(function() { window.location.reload(); }, 1000);
  };
})();
</script>`;
      html = html.replace("</body>", `${liveReloadScript}\n</body>`);
    }

    const fullHtml = `<!DOCTYPE html>\n${html}`;

    // Calculate output path by replacing [param] with actual value
    let outputPath;
    if (pagesDir) {
      let relativePath = path.relative(pagesDir, absolutePath);
      // Replace [param] with actual values
      for (const [key, value] of Object.entries(params)) {
        relativePath = relativePath.replace(`[${key}]`, value);
      }
      relativePath = relativePath.replace(/\.jsx$/, ".html");
      outputPath = path.join(outputDir, relativePath);
    } else {
      // Replace [param] in filename
      let filename = path.basename(inputFile, ".jsx");
      for (const [key, value] of Object.entries(params)) {
        filename = filename.replace(`[${key}]`, value);
      }
      outputPath = path.join(outputDir, `${filename}.html`);
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, fullHtml);

    if (!silent) {
      const relativeOutput = path.relative(process.cwd(), outputPath);
      console.log(`  ✓ ${relativeOutput}`);
    }

    results.push({ outputPath, html: fullHtml, params });
  }

  // Clean up temp file
  await fs.unlink(tmpFile);

  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const opts = parseArgs(args);

  // Show version
  if (opts.version) {
    const pkg = JSON.parse(
      await fs.readFile(new URL("../package.json", import.meta.url), "utf-8")
    );
    console.log(`ono v${pkg.version}`);
    process.exit(0);
  }

  // Show help
  if (args.length === 0 || opts.help) {
    console.log(`
Ono - A lightweight JSX library for static site generation

Usage:
  ono init [dir]                  Initialize a new Ono project
  ono build <file|dir> [options]  Build JSX file(s) to HTML
  ono dev <file|dir> [options]    Start dev server with live reload

Arguments:
  dir                      Project directory (default: current directory)
  file                     Single JSX file to build/serve
  pages                    Pages directory (default: pages/)

Options:
  -w, --watch              Watch for changes and rebuild (build only)
  -p, --port <port>        Port number (default: 3000) (dev only)
  -o, --output <dir>       Output directory (default: dist)
  -h, --help               Show this help message
  -v, --version            Show version number

Examples:
  # Initialize new project
  ono init
  ono init my-project

  # Single file mode
  ono build example/index.jsx
  ono build example/index.jsx --watch
  ono dev example/index.jsx

  # Pages mode (build all .jsx files in directory)
  ono build pages
  ono build pages --watch
  ono dev pages
  ono dev          # Same as: ono dev pages

  # Custom options
  ono build pages -o public
  ono dev pages -p 8080
    `);
    process.exit(0);
  }

  const command = opts._[0];
  const inputFile = opts._[1];

  if (command === "init") {
    const projectDir = inputFile || ".";
    const projectPath = path.resolve(process.cwd(), projectDir);

    try {
      // Check if directory exists and is not empty
      try {
        const files = await fs.readdir(projectPath);
        if (files.length > 0 && projectDir !== ".") {
          console.error(`Error: Directory ${projectDir} is not empty`);
          process.exit(1);
        }
      } catch (error) {
        if (error.code === "ENOENT") {
          // Directory doesn't exist, create it
          await fs.mkdir(projectPath, { recursive: true });
        } else {
          throw error;
        }
      }

      console.log(`\n🚀 Initializing Ono project in ${projectDir === "." ? "current directory" : projectDir}...\n`);

      // Create directory structure
      await fs.mkdir(path.join(projectPath, "pages"), { recursive: true });
      await fs.mkdir(path.join(projectPath, "components"), { recursive: true });
      await fs.mkdir(path.join(projectPath, "public", "css"), { recursive: true });

      // Create Layout.jsx
      const layoutContent = `// Layout component with slot support
export default function Layout(props) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{props.title || "Ono Site"}</title>
        <link rel="stylesheet" href="/uno.css" />
        <link rel="stylesheet" href="/css/style.css" />
      </head>
      <body class="font-sans max-w-800px mx-auto px-8 py-8 leading-relaxed">
        <header class="mb-8 pb-4 border-b-2 border-gray-200">
          <h1 class="text-3xl font-bold">{props.title}</h1>
          {props.header}
        </header>
        <main>
          {props.children}
        </main>
        <footer class="mt-12 pt-4 border-t border-gray-200 text-secondary text-sm">
          {props.footer || <p>© 2025 Ono</p>}
        </footer>
      </body>
    </html>
  );
}
`;
      await fs.writeFile(path.join(projectPath, "components", "Layout.jsx"), layoutContent);

      // Create Hello.jsx component
      const helloContent = `export default function Hello(props) {
  return (
    <div class="p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
      <h2 class="text-2xl font-semibold text-blue-800 mb-2">
        Hello, {props.name || "World"}!
      </h2>
      <p class="text-blue-600">
        This is a reusable component. Edit components/Hello.jsx to customize it.
      </p>
    </div>
  );
}
`;
      await fs.writeFile(path.join(projectPath, "components", "Hello.jsx"), helloContent);

      // Create index.jsx
      const indexContent = `import Layout from "../components/Layout.jsx";
import Hello from "../components/Hello.jsx";

export default function Home() {
  return (
    <Layout title="Welcome to Ono">
      <Hello name="Developer" />

      <div class="mt-8 space-y-6">
        <section>
          <h2 class="text-2xl font-bold mb-4">Getting Started</h2>
          <p class="mb-4 text-lg">
            You've successfully initialized an Ono project! Here's what you can do next:
          </p>
          <ul class="list-disc ml-6 space-y-2">
            <li>Edit <code class="bg-gray-100 px-2 py-1 rounded text-sm">pages/index.jsx</code> to customize this page</li>
            <li>Create new pages in the <code class="bg-gray-100 px-2 py-1 rounded text-sm">pages/</code> directory</li>
            <li>Add components to <code class="bg-gray-100 px-2 py-1 rounded text-sm">components/</code></li>
            <li>Put static assets in <code class="bg-gray-100 px-2 py-1 rounded text-sm">public/</code></li>
          </ul>
        </section>

        <section>
          <h2 class="text-2xl font-bold mb-4">Commands</h2>
          <div class="space-y-2">
            <div class="p-4 bg-gray-50 rounded border border-gray-200">
              <code class="text-green-600 font-semibold">ono dev</code>
              <p class="text-sm text-secondary mt-1">Start development server with live reload</p>
            </div>
            <div class="p-4 bg-gray-50 rounded border border-gray-200">
              <code class="text-green-600 font-semibold">ono build pages</code>
              <p class="text-sm text-secondary mt-1">Build your site to the dist/ directory</p>
            </div>
          </div>
        </section>

        <section>
          <h2 class="text-2xl font-bold mb-4">Features</h2>
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 border border-gray-200 rounded">
              <h3 class="font-semibold mb-2">🎨 UnoCSS</h3>
              <p class="text-sm text-secondary">Atomic CSS with Tailwind-compatible utilities</p>
            </div>
            <div class="p-4 border border-gray-200 rounded">
              <h3 class="font-semibold mb-2">⚡ Live Reload</h3>
              <p class="text-sm text-secondary">Instant updates during development</p>
            </div>
            <div class="p-4 border border-gray-200 rounded">
              <h3 class="font-semibold mb-2">📦 Component Based</h3>
              <p class="text-sm text-secondary">Reusable JSX components</p>
            </div>
            <div class="p-4 border border-gray-200 rounded">
              <h3 class="font-semibold mb-2">🚀 Static Output</h3>
              <p class="text-sm text-secondary">Fast, SEO-friendly HTML</p>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
`;
      await fs.writeFile(path.join(projectPath, "pages", "index.jsx"), indexContent);

      // Create style.css
      const styleContent = `/* Custom styles for your Ono site */
/* UnoCSS utilities will be automatically generated in uno.css */

body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Add your custom styles here */
`;
      await fs.writeFile(path.join(projectPath, "public", "css", "style.css"), styleContent);

      // Create .gitignore
      const gitignoreContent = `# Build output
dist/
.mini-jsx-tmp.js

# Dependencies
node_modules/

# Environment variables
.env
.env.local
`;
      await fs.writeFile(path.join(projectPath, ".gitignore"), gitignoreContent);

      // Create package.json
      const projectName = projectDir === "." ? path.basename(projectPath) : projectDir;
      const packageJsonContent = {
        name: projectName,
        version: "0.1.0",
        type: "module",
        scripts: {
          dev: "ono dev",
          build: "ono build pages",
          "build:watch": "ono build pages --watch"
        },
        devDependencies: {}
      };
      await fs.writeFile(
        path.join(projectPath, "package.json"),
        JSON.stringify(packageJsonContent, null, 2) + "\n"
      );

      console.log("✅ Created project structure:");
      console.log("   pages/");
      console.log("   ├── index.jsx");
      console.log("   components/");
      console.log("   ├── Layout.jsx");
      console.log("   ├── Hello.jsx");
      console.log("   public/");
      console.log("   ├── css/");
      console.log("   │   └── style.css");
      console.log("   package.json");
      console.log("   .gitignore");
      console.log("");
      console.log("🎉 Project initialized successfully!");
      console.log("");
      console.log("Next steps:");
      if (projectDir !== ".") {
        console.log(`  cd ${projectDir}`);
      }
      console.log("  npm run dev          # Start development server");
      console.log("  npm run build        # Build for production");
      console.log("");
      console.log("Or use ono directly:");
      console.log("  ono dev         # Start development server");
      console.log("  ono build pages # Build for production");
      console.log("");
    } catch (error) {
      console.error(`Error: ${error.message}`);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  } else if (command === "build") {
    const buildOptions = {
      outputDir: opts.output || "dist",
    };

    try {
      // Check if inputFile is a directory (pages mode)
      const isDirectory = inputFile && (await fs.stat(path.resolve(process.cwd(), inputFile)).catch(() => null))?.isDirectory();

      if (isDirectory || inputFile === "pages" || !inputFile) {
        // Pages mode - build all pages in directory
        const pagesDir = inputFile || "pages";
        const pagesDirAbs = path.resolve(process.cwd(), pagesDir);

        const pages = await discoverPages(pagesDirAbs);

        if (pages.length === 0) {
          console.error(`Error: No JSX files found in ${pagesDir}/`);
          process.exit(1);
        }

        console.log(`Found ${pages.length} page(s) in ${pagesDir}/\n`);

        if (opts.watch) {
          // Initial build all pages
          for (const page of pages) {
            if (isDynamicRoute(page)) {
              await buildDynamicRoute(page, { ...buildOptions, pagesDir: pagesDirAbs });
            } else {
              await buildFile(page, { ...buildOptions, pagesDir: pagesDirAbs });
            }
          }

          // Copy public files
          const publicCount = await copyPublicFiles("public", buildOptions.outputDir);
          if (publicCount > 0) {
            console.log(`\n📦 Copied ${publicCount} file(s) from public/\n`);
          }

          // Generate UnoCSS
          await generateUnoCSSFile(buildOptions.outputDir);

          console.log(`👀 Watching for changes in ${pagesDir}/ and public/...`);
          console.log("Press Ctrl+C to stop\n");

          const { watch } = await import("node:fs");

          // Watch pages directory
          watch(pagesDirAbs, { recursive: true }, async (_eventType, filename) => {
            if (filename && filename.endsWith(".jsx")) {
              const changedFile = path.join(pagesDirAbs, filename);
              try {
                if (isDynamicRoute(changedFile)) {
                  await buildDynamicRoute(changedFile, { ...buildOptions, pagesDir: pagesDirAbs, silent: true });
                } else {
                  await buildFile(changedFile, { ...buildOptions, pagesDir: pagesDirAbs, silent: true });
                }
                await generateUnoCSSFile(buildOptions.outputDir, true);
                console.log(`✓ Rebuilt: ${filename}`);
              } catch (error) {
                console.error(`✗ Build error: ${error.message}`);
              }
            }
          });

          // Watch public directory
          const publicDirAbs = path.resolve(process.cwd(), "public");
          try {
            await fs.access(publicDirAbs);
            watch(publicDirAbs, { recursive: true }, async (_eventType, filename) => {
              if (filename) {
                try {
                  await copyPublicFiles("public", buildOptions.outputDir, true);
                  console.log(`✓ Copied: public/${filename}`);
                } catch (error) {
                  console.error(`✗ Copy error: ${error.message}`);
                }
              }
            });
          } catch {
            // Public directory doesn't exist, skip watching
          }

          process.on("SIGINT", () => {
            console.log("\n\n👋 Shutting down...");
            process.exit(0);
          });
        } else {
          // Build all pages
          for (const page of pages) {
            if (isDynamicRoute(page)) {
              await buildDynamicRoute(page, { ...buildOptions, pagesDir: pagesDirAbs });
            } else {
              await buildFile(page, { ...buildOptions, pagesDir: pagesDirAbs });
            }
          }

          // Copy public files
          const publicCount = await copyPublicFiles("public", buildOptions.outputDir);
          if (publicCount > 0) {
            console.log(`\n📦 Copied ${publicCount} file(s) from public/`);
          }

          // Generate UnoCSS
          await generateUnoCSSFile(buildOptions.outputDir);
        }
      } else if (inputFile) {
        // Single file mode
        if (opts.watch) {
          // Initial build
          await buildFile(inputFile, buildOptions);

          // Generate UnoCSS
          await generateUnoCSSFile(buildOptions.outputDir);

          // Watch for changes
          const absolutePath = path.resolve(process.cwd(), inputFile);
          const watchDir = path.dirname(absolutePath);

          console.log(`\n👀 Watching for changes in ${watchDir}...`);
          console.log("Press Ctrl+C to stop\n");

          const { watch } = await import("node:fs");
          watch(watchDir, { recursive: true }, async (_eventType, filename) => {
            if (filename && filename.endsWith(".jsx")) {
              try {
                await buildFile(inputFile, { ...buildOptions, silent: true });
                await generateUnoCSSFile(buildOptions.outputDir, true);
                console.log(`✓ Rebuilt: ${filename}`);
              } catch (error) {
                console.error(`✗ Build error: ${error.message}`);
              }
            }
          });

          process.on("SIGINT", () => {
            console.log("\n\n👋 Shutting down...");
            process.exit(0);
          });
        } else {
          // Single build
          await buildFile(inputFile, buildOptions);

          // Generate UnoCSS
          await generateUnoCSSFile(buildOptions.outputDir);
        }
      } else {
        console.error("Error: Please specify a file or pages directory to build");
        console.error("Usage: mini-jsx build <file|pages> [options]");
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  } else if (command === "dev") {
    const requestedPort = opts.port || 3000;
    const outputDir = opts.output || "dist";

    try {
      // Check if inputFile is a directory (pages mode)
      const isDirectory = inputFile && (await fs.stat(path.resolve(process.cwd(), inputFile)).catch(() => null))?.isDirectory();
      const isPages = isDirectory || inputFile === "pages" || !inputFile;

      // Find available ports
      const wsPort = await findAvailablePort(35729);
      const httpPort = await findAvailablePort(requestedPort);

      if (wsPort !== 35729) {
        console.log(`ℹ️  WebSocket port 35729 is busy, using port ${wsPort} instead`);
      }
      if (httpPort !== requestedPort) {
        console.log(`ℹ️  Port ${requestedPort} is busy, using port ${httpPort} instead`);
      }

      if (isPages) {
        // Pages mode
        const pagesDir = inputFile || "pages";
        const pagesDirAbs = path.resolve(process.cwd(), pagesDir);
        const pages = await discoverPages(pagesDirAbs);

        if (pages.length === 0) {
          console.error(`Error: No JSX files found in ${pagesDir}/`);
          process.exit(1);
        }

        console.log(`Found ${pages.length} page(s) in ${pagesDir}/\n`);

        // Initial build all pages
        for (const page of pages) {
          if (isDynamicRoute(page)) {
            await buildDynamicRoute(page, { liveReload: true, wsPort, outputDir, pagesDir: pagesDirAbs });
          } else {
            await buildFile(page, { liveReload: true, wsPort, outputDir, pagesDir: pagesDirAbs });
          }
        }

        // Copy public files
        const publicCount = await copyPublicFiles("public", outputDir);
        if (publicCount > 0) {
          console.log(`\n📦 Copied ${publicCount} file(s) from public/\n`);
        }

        // Generate UnoCSS
        await generateUnoCSSFile(outputDir);

        // Setup WebSocket server
        const wss = new WebSocketServer({ port: wsPort });
        const clients = new Set();

        wss.on("connection", (ws) => {
          clients.add(ws);
          ws.on("close", () => clients.delete(ws));
        });

        function notifyClients() {
          clients.forEach((client) => {
            if (client.readyState === 1) {
              client.send("reload");
            }
          });
        }

        // Watch for changes
        console.log(`👀 Watching for changes in ${pagesDir}/ and public/...`);

        const { watch } = await import("node:fs");

        // Watch pages directory
        watch(pagesDirAbs, { recursive: true }, async (_eventType, filename) => {
          if (filename && filename.endsWith(".jsx")) {
            const changedFile = path.join(pagesDirAbs, filename);
            try {
              if (isDynamicRoute(changedFile)) {
                await buildDynamicRoute(changedFile, { liveReload: true, silent: true, wsPort, outputDir, pagesDir: pagesDirAbs });
              } else {
                await buildFile(changedFile, { liveReload: true, silent: true, wsPort, outputDir, pagesDir: pagesDirAbs });
              }
              await generateUnoCSSFile(outputDir, true);
              console.log(`✓ Rebuilt: ${filename}`);
              notifyClients();
            } catch (error) {
              console.error(`✗ Build error: ${error.message}`);
            }
          }
        });

        // Watch public directory
        const publicDirAbs = path.resolve(process.cwd(), "public");
        try {
          await fs.access(publicDirAbs);
          watch(publicDirAbs, { recursive: true }, async (_eventType, filename) => {
            if (filename) {
              try {
                await copyPublicFiles("public", outputDir, true);
                console.log(`✓ Copied: public/${filename}`);
                notifyClients();
              } catch (error) {
                console.error(`✗ Copy error: ${error.message}`);
              }
            }
          });
        } catch {
          // Public directory doesn't exist, skip watching
        }

        // Create h3 server
        await createDevServer({
          outputDir,
          port: httpPort,
          mode: "pages",
        });

        console.log(`\n🚀 Server running at http://localhost:${httpPort}`);
        console.log(`📝 Serving: ${pagesDir}/ → ${outputDir}/\n`);
      } else {
        // Single file mode
        if (!inputFile) {
          console.error("Error: Please specify a file or pages directory to serve");
          console.error("Usage: mini-jsx dev <file|pages> [options]");
          process.exit(1);
        }

        // Initial build with live reload
        await buildFile(inputFile, { liveReload: true, wsPort, outputDir });

        // Generate UnoCSS
        await generateUnoCSSFile(outputDir);

        // Setup WebSocket server for live reload
        const wss = new WebSocketServer({ port: wsPort });
        const clients = new Set();

        wss.on("connection", (ws) => {
          clients.add(ws);
          ws.on("close", () => clients.delete(ws));
        });

        function notifyClients() {
          clients.forEach((client) => {
            if (client.readyState === 1) {
              client.send("reload");
            }
          });
        }

        // Watch for changes
        const absolutePath = path.resolve(process.cwd(), inputFile);
        const watchDir = path.dirname(absolutePath);

        console.log(`\n👀 Watching for changes in ${watchDir}...`);

        const { watch } = await import("node:fs");
        watch(watchDir, { recursive: true }, async (_eventType, filename) => {
          if (filename && filename.endsWith(".jsx")) {
            try {
              await buildFile(inputFile, { liveReload: true, silent: true, wsPort, outputDir });
              await generateUnoCSSFile(outputDir, true);
              console.log(`✓ Rebuilt: ${filename}`);
              notifyClients();
            } catch (error) {
              console.error(`✗ Build error: ${error.message}`);
            }
          }
        });

        // Create h3 server
        const inputBasename = path.basename(inputFile, ".jsx");
        const outputFilename = `${inputBasename}.html`;
        const relativeOutput = path.relative(process.cwd(), path.join(outputDir, outputFilename));

        await createDevServer({
          outputDir,
          port: httpPort,
          mode: "single",
          indexFile: outputFilename,
        });

        console.log(`\n🚀 Server running at http://localhost:${httpPort}`);
        console.log(`📝 Serving: ${relativeOutput}\n`);
      }

      // Keep process running
      process.on("SIGINT", () => {
        console.log("\n\n👋 Shutting down...");
        process.exit(0);
      });
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
