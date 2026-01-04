#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const projectName = args[0] || "my-ono-project";

const targetDir = resolve(process.cwd(), projectName);
const templateDir = resolve(__dirname, "template");

console.log(`\n  Creating Ono project in ${targetDir}...\n`);

if (existsSync(targetDir)) {
  console.error(`  Error: Directory "${projectName}" already exists.\n`);
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });

cpSync(templateDir, targetDir, { recursive: true });

const pkgPath = resolve(targetDir, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
pkg.name = basename(projectName);
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

console.log(`  Done! Now run:\n`);
console.log(`    cd ${projectName}`);
console.log(`    npm install`);
console.log(`    npx ono dev\n`);
