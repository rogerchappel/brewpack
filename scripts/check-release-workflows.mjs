import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const scriptRoot = new URL('../', import.meta.url);
const root = process.env.BREWPACK_RELEASE_ROOT
  ? new URL(`file://${process.env.BREWPACK_RELEASE_ROOT}/`)
  : scriptRoot;
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const [release, dryRun] = await Promise.all([
  readFile(new URL('.github/workflows/release.yml', root), 'utf8'),
  readFile(new URL('.github/workflows/release-dry-run.yml', root), 'utf8'),
]);

const releaseBoxRef = (workflow) => workflow.match(/^\s*RELEASEBOX_REF:\s*([^\s#]+)/m)?.[1];
const requiredDryRunFragments = [
  'node /tmp/releasebox/bin/releasebox.js check .',
  'npm run release:check',
  'node /tmp/releasebox/bin/releasebox.js notes . > RELEASE_NOTES.md',
  'cat RELEASE_NOTES.md',
  '>> "$GITHUB_STEP_SUMMARY"',
];

assert.ok(releaseBoxRef(release), 'release workflow must pin RELEASEBOX_REF');
assert.equal(
  releaseBoxRef(dryRun),
  releaseBoxRef(release),
  'dry-run workflow must use the ReleaseBox version pinned by the release workflow',
);

for (const fragment of requiredDryRunFragments) {
  assert.ok(dryRun.includes(fragment), `dry-run workflow is missing: ${fragment}`);
}

// Inspect the local npm script graph reachable from the workflow's release:check entrypoint.
const scripts = packageJson.scripts ?? {};
const visited = new Set();
const pending = ['release:check'];
const publishingCommand = /\b(?:npm\s+(?:publish|pack)|pnpm\s+publish|yarn\s+publish|gh\s+release\s+create)\b/i;
while (pending.length) {
  const name = pending.pop();
  if (visited.has(name)) continue;
  visited.add(name);
  assert.ok(scripts[name], `release:check references missing npm script: ${name}`);
  const command = scripts[name];
  assert.ok(!publishingCommand.test(command), `release:check script ${name} contains publishing command: ${command}`);
  for (const [, dependency] of command.matchAll(/\bnpm\s+run\s+([\w:-]+)/g)) pending.push(dependency);
}


console.log(`Release workflows agree on ReleaseBox ${releaseBoxRef(release)} and the dry run is non-publishing.`);
