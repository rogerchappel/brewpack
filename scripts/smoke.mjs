import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outputs = ['tmp/smoke-inspect', 'tmp/smoke-tap'];
const run = (args) => {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Command failed (${result.status}): node ${args.join(' ')}`);
};
const exists = async (file) => fs.access(file).then(() => true, () => false);

try {
  for (const output of outputs) await fs.rm(path.join(root, output), { recursive: true, force: true });
  run(['./bin/brewpack.js', 'inspect', './fixtures/sample-tool', '--output', './tmp/smoke-inspect', '--format', 'both']);
  run(['./bin/brewpack.js', 'init', './fixtures/sample-tool', '--output', './tmp/smoke-tap', '--force']);
  run(['scripts/finalize-smoke-formula.mjs', './tmp/smoke-tap/Formula/tea-time.rb']);
  run(['./bin/brewpack.js', 'validate', './tmp/smoke-tap']);

  for (const file of ['tmp/smoke-inspect/inspection.json', 'tmp/smoke-inspect/inspection.txt', 'tmp/smoke-tap/brewpack.plan.json', 'tmp/smoke-tap/Formula/tea-time.rb']) {
    if (!await exists(path.join(root, file))) throw new Error(`Smoke output missing: ${file}`);
    if (!file.startsWith('tmp/')) throw new Error(`Smoke output escaped tmp/: ${file}`);
  }
  const ignore = await fs.readFile(path.join(root, '.gitignore'), 'utf8');
  if (!ignore.split(/\r?\n/).includes('tmp/')) throw new Error('.gitignore must ignore tmp/ smoke output');
} finally {
  for (const output of outputs) await fs.rm(path.join(root, output), { recursive: true, force: true });
}
for (const output of outputs) {
  if (await exists(path.join(root, output))) throw new Error(`Smoke output was not cleaned: ${output}`);
}
console.log('Smoke output stayed under tmp/, was ignored, and was cleaned up.');
