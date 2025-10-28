import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const requiredPaths = [
  path.join(projectRoot, 'node_modules', 'typescript', 'lib', 'typescript.js'),
  path.join(projectRoot, 'node_modules', '@unocss', 'core', 'dist', 'index.mjs'),
  path.join(projectRoot, 'node_modules', '@unocss', 'preset-uno', 'dist', 'index.mjs'),
];

const missingDeps = requiredPaths.some((depPath) => !existsSync(depPath));

if (missingDeps) {
  const result = spawnSync('npm', ['ci'], {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
