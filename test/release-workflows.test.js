import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm, writeFile, cp } from 'node:fs/promises';

test('release workflow guard follows npm scripts and rejects publishing commands', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const temp = await mkdtemp(path.join(os.tmpdir(), 'brewpack-release-guard-'));
  try {
    await writeFile(path.join(temp, 'package.json'), JSON.stringify({ scripts: { ...pkg.scripts, smoke: 'npm publish' } }));
    await writeFile(path.join(temp, 'check.mjs'), await readFile(path.join(root, 'scripts/check-release-workflows.mjs'), 'utf8'));
    await cp(path.join(root, '.github'), path.join(temp, '.github'), { recursive: true });
    const guard = path.join(temp, 'check.mjs');
    assert.throws(
      () => execFileSync(process.execPath, [guard], {
        cwd: temp,
        stdio: 'pipe',
        env: { ...process.env, BREWPACK_RELEASE_ROOT: `${temp}${path.sep}` },
      }),
      (error) => /publishing command/.test(error.stderr.toString()),
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
