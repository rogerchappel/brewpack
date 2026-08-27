import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
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

for (const publishingCommand of ['npm publish', 'gh release create']) {
  assert.ok(!dryRun.includes(publishingCommand), `dry-run workflow must not run: ${publishingCommand}`);
}

console.log(`Release workflows agree on ReleaseBox ${releaseBoxRef(release)} and the dry run is non-publishing.`);
