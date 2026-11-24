import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cwd = process.platform === 'win32' ? fs.realpathSync.native(appRoot) : appRoot;
const vitestCli = path.join(cwd, 'node_modules', 'vitest', 'vitest.mjs');
const extraArgs = process.argv.slice(2);
const result = spawnSync(process.execPath, [vitestCli, ...(extraArgs.length ? extraArgs : ['run'])], {
  cwd,
  stdio: 'inherit',
  env: process.env,
  windowsHide: true,
});
process.exit(result.status === null ? 1 : result.status);
