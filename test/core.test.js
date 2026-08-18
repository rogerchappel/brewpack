import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildPlan, parsePackageFixture, renderFormula, renderTapReadme } from '../src/core.js';
import { initTap, inspectProject, validateTap } from '../src/lib.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, '..', 'fixtures', 'sample-tool');
function assertValidRuby(formula) {
  const result = spawnSync('ruby', ['-c'], { input: formula, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}

test('parsePackageFixture normalises fixture data', async () => {
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  const spec = parsePackageFixture(raw);
  assert.equal(spec.formulaClass, 'TeaTime');
  assert.equal(spec.owner, 'rogerchappel');
  assert.deepEqual(spec.binaries, ['tea-time']);
  assert.equal(spec.artifact.install['tea-time'], 'dist/tea-time');
});

test('parsePackageFixture prefixes a numeric-leading formula class', async () => {
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  raw.package.name = '7zip';
  raw.package.binaries = ['7zip'];
  raw.package.test.command = '7zip --help';
  raw.artifacts[0].install = { '7zip': 'dist/7zip' };
  const spec = parsePackageFixture(raw);
  assert.equal(spec.formulaName, '7zip');
  assert.equal(spec.formulaClass, 'V7zip');
  assert.match(renderFormula(spec), /^class V7zip < Formula$/m);
});

test('parsePackageFixture rejects a package name without a formula slug', async () => {
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  raw.package.name = '---';
  assert.throws(
    () => parsePackageFixture(raw),
    /fixture\.package\.name must produce a non-empty Homebrew formula slug/
  );
});

test('parsePackageFixture accepts scoped and numeric-leading package names', async () => {
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  raw.package.name = '@acme/7zip';
  const spec = parsePackageFixture(raw);
  assert.equal(spec.formulaName, 'acme-7zip');
  assert.equal(spec.formulaClass, 'Acme7zip');
});

test('parsePackageFixture rejects malformed binaries and tap fields', async () => {
  const base = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  const cases = [
    { mutate: (raw) => { raw.package.binaries = ['../tea-time']; }, message: /fixture\.package\.binaries\[0\] must be a valid executable name/ },
    { mutate: (raw) => { raw.package.binaries = ['']; }, message: /fixture\.package\.binaries\[0\] must be a valid executable name/ },
    { mutate: (raw) => { raw.tap.owner = 'bad/owner'; }, message: /fixture\.tap\.owner must be a valid GitHub owner/ },
    { mutate: (raw) => { raw.tap.repo = '../homebrew-tea'; }, message: /fixture\.tap\.repo must be a valid GitHub repository name/ }
  ];
  for (const { mutate, message } of cases) {
    const raw = structuredClone(base);
    mutate(raw);
    assert.throws(() => parsePackageFixture(raw), message);
  }
});

test('buildPlan returns release metadata', async () => {
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  const spec = parsePackageFixture(raw);
  const plan = buildPlan(spec);
  assert.equal(
    plan.releaseArchiveUrl,
    'https://github.com/example/tea-time/releases/download/v1.2.3/tea-time-1.2.3.tar.gz'
  );
  assert.deepEqual(plan.artifactInstall, { 'tea-time': 'dist/tea-time' });
  assert.equal(plan.tapRepository, 'rogerchappel/homebrew-tea-time');
});

test('renderFormula includes caveats and install block', async () => {
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  const formula = renderFormula(parsePackageFixture(raw));
  assert.match(formula, /class TeaTime < Formula/);
  assert.match(formula, /bin\.install "dist\/tea-time"/);
  assert.match(formula, /releases\/download\/v1\.2\.3\/tea-time-1\.2\.3\.tar\.gz/);
  assert.match(formula, /def caveats/);
  assert.match(formula, /  end\nend\n$/);
  assertValidRuby(formula);
});

test('renderFormula separates class and test endings without caveats', async () => {
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  delete raw.package.caveats;
  const formula = renderFormula(parsePackageFixture(raw));
  assert.doesNotMatch(formula, /endend/);
  assert.match(formula, /  end\nend\n$/);
  assertValidRuby(formula);
});

test('renderFormula installs a nested artifact path with its matching basename', async () => {
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  raw.artifacts[0].install['tea-time'] = 'release/bin/tea-time';
  const formula = renderFormula(parsePackageFixture(raw));
  assert.match(formula, /bin\.install "release\/bin\/tea-time"/);
  assert.doesNotMatch(formula, /release\/bin\/tea-time" =>/);
});

test('renderFormula renames a mismatched artifact basename to the declared binary', async () => {
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  raw.artifacts[0].install['tea-time'] = 'release/bin/renamed-tool';
  const formula = renderFormula(parsePackageFixture(raw));
  assert.match(formula, /bin\.install "release\/bin\/renamed-tool" => "tea-time"/);
  assert.match(formula, /shell_output\("#\{bin\}\/tea-time --help"\)/);
});

test('parsePackageFixture rejects incomplete artifact install declarations', async () => {
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  raw.package.binaries.push('tea-helper');
  assert.throws(
    () => parsePackageFixture(raw),
    /install must match fixture\.package\.binaries \(missing install paths for: tea-helper\)/
  );
});

test('parsePackageFixture rejects artifact paths for undeclared binaries', async () => {
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  raw.artifacts[0].install['tea-helper'] = 'dist/tea-helper';
  assert.throws(
    () => parsePackageFixture(raw),
    /install must match fixture\.package\.binaries \(undeclared binaries: tea-helper\)/
  );
});

test('parsePackageFixture rejects install paths outside the artifact', async () => {
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  raw.artifacts[0].install['tea-time'] = '../tea-time';
  assert.throws(
    () => parsePackageFixture(raw),
    /install\.tea-time must be a relative path inside the artifact/
  );
});

test('renderFormula maps the declared test binary into Homebrew bin', async () => {
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  raw.package.test = { command: 'tea-time doctor --json', expect: '"healthy":true' };
  const formula = renderFormula(parsePackageFixture(raw));
  assert.match(formula, /shell_output\("#\{bin\}\/tea-time doctor --json"\)/);
  assert.match(formula, /assert_match "\\"healthy\\":true", output/);
  assert.doesNotMatch(formula, /tea-time --help/);
});

test('renderFormula rejects a test command for an undeclared binary', async () => {
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  raw.package.test.command = 'other-tool doctor';
  assert.throws(
    () => renderFormula(parsePackageFixture(raw)),
    /test\.command must start with a declared binary: tea-time/
  );
});

test('inspectProject reads local fixture', async () => {
  const payload = await inspectProject(fixtureDir);
  assert.equal(payload.spec.packageName, 'tea-time');
  assert.equal(payload.plan.formulaName, 'tea-time');
});

test('initTap generates scaffold and validateTap passes', async () => {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'brewpack-'));
  await initTap(fixtureDir, outputDir, { force: true });
  const formula = await fs.readFile(path.join(outputDir, 'Formula', 'tea-time.rb'), 'utf8');
  assert.match(formula, /TeaTime/);
  await fs.writeFile(
    path.join(outputDir, 'Formula', 'tea-time.rb'),
    formula.replace('REPLACE_WITH_SHA256', 'a'.repeat(64))
  );
  const result = await validateTap(outputDir);
  assert.equal(result.valid, true);
});

test('validateTap rejects the generated checksum placeholder', async () => {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'brewpack-placeholder-'));
  await initTap(fixtureDir, outputDir, { force: true });
  const result = await validateTap(outputDir);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'Formula/tea-time.rb: replace REPLACE_WITH_SHA256 with the release archive checksum'
  ]);
});

test('validateTap rejects malformed checksums and accepts 64 hex characters', async () => {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'brewpack-checksum-'));
  await initTap(fixtureDir, outputDir, { force: true });
  const formulaPath = path.join(outputDir, 'Formula', 'tea-time.rb');
  const formula = await fs.readFile(formulaPath, 'utf8');
  await fs.writeFile(formulaPath, formula.replace('REPLACE_WITH_SHA256', 'not-a-checksum'));
  const malformed = await validateTap(outputDir);
  assert.equal(malformed.valid, false);
  assert.match(malformed.errors[0], /exactly 64 hexadecimal characters/);
  await fs.writeFile(formulaPath, formula.replace('REPLACE_WITH_SHA256', 'ABCDEF0123456789'.repeat(4)));
  assert.equal((await validateTap(outputDir)).valid, true);
});

test('validateTap rejects an invalid formula class declaration', async () => {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'brewpack-class-'));
  await fs.mkdir(path.join(outputDir, 'Formula'));
  await fs.writeFile(path.join(outputDir, 'README.md'), '# demo\n');
  await fs.writeFile(
    path.join(outputDir, 'Formula', '7zip.rb'),
    `class 7zip < Formula\n  sha256 "${'a'.repeat(64)}"\nend\n`
  );
  const result = await validateTap(outputDir);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'Formula/7zip.rb: must declare a valid Formula subclass (for example, class Demo < Formula)'
  ]);
});

test('validateTap rejects malformed Ruby syntax', async () => {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'brewpack-syntax-'));
  await initTap(fixtureDir, outputDir, { force: true });
  const formulaPath = path.join(outputDir, 'Formula', 'tea-time.rb');
  const formula = await fs.readFile(formulaPath, 'utf8');
  await fs.writeFile(
    formulaPath,
    formula.replace('REPLACE_WITH_SHA256', 'a'.repeat(64)).replace(/\nend\n$/, 'endend\n')
  );
  const result = await validateTap(outputDir);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /^Formula\/tea-time\.rb: invalid Ruby syntax:/);
});

test('initTap force replaces a renamed generated formula and preserves unrelated files', async () => {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'brewpack-rename-'));
  const renamedFixture = await fs.mkdtemp(path.join(os.tmpdir(), 'brewpack-fixture-'));
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  await initTap(fixtureDir, outputDir, { force: true });
  await fs.writeFile(path.join(outputDir, 'Formula', 'custom.rb'), 'class Custom < Formula\nend\n');
  await fs.writeFile(path.join(outputDir, 'notes.txt'), 'keep me\n');
  raw.package.name = 'coffee-time';
  raw.package.binaries = ['coffee-time'];
  raw.package.test.command = 'coffee-time --help';
  raw.artifacts[0].install = { 'coffee-time': 'dist/coffee-time' };
  await fs.writeFile(path.join(renamedFixture, 'brewpack.fixture.json'), JSON.stringify(raw));

  await initTap(renamedFixture, outputDir, { force: true });

  assert.deepEqual((await fs.readdir(path.join(outputDir, 'Formula'))).sort(), ['coffee-time.rb', 'custom.rb']);
  assert.equal(await fs.readFile(path.join(outputDir, 'notes.txt'), 'utf8'), 'keep me\n');
  const plan = JSON.parse(await fs.readFile(path.join(outputDir, 'brewpack.plan.json'), 'utf8'));
  assert.equal(plan.formulaName, 'coffee-time');
  assert.deepEqual(plan.generatedFiles, ['Formula/coffee-time.rb', 'README.md', 'brewpack.plan.json']);
  const readme = await fs.readFile(path.join(outputDir, 'README.md'), 'utf8');
  assert.match(readme, /coffee-time/);
  assert.doesNotMatch(readme, /brew install tea-time/);
});

test('initTap refuses nonempty output without force and leaves generated files unchanged', async () => {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'brewpack-no-force-'));
  await initTap(fixtureDir, outputDir, { force: true });
  const formulaBefore = await fs.readFile(path.join(outputDir, 'Formula', 'tea-time.rb'), 'utf8');

  await assert.rejects(initTap(fixtureDir, outputDir), /already exists and is not empty/);
  assert.equal(await fs.readFile(path.join(outputDir, 'Formula', 'tea-time.rb'), 'utf8'), formulaBefore);
});

test('validateTap reports a formula missing from generation metadata', async () => {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'brewpack-owned-missing-'));
  await initTap(fixtureDir, outputDir, { force: true });
  await fs.rename(
    path.join(outputDir, 'Formula', 'tea-time.rb'),
    path.join(outputDir, 'Formula', 'stale-name.rb')
  );
  const result = await validateTap(outputDir);
  assert.equal(result.valid, false);
  assert.deepEqual(result.missing, ['Formula/tea-time.rb']);
});

test('validateTap reports missing formula', async () => {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'brewpack-empty-'));
  await fs.writeFile(path.join(outputDir, 'README.md'), '# demo\n');
  await fs.mkdir(path.join(outputDir, 'Formula'));
  const result = await validateTap(outputDir);
  assert.equal(result.valid, false);
  assert.deepEqual(result.missing, ['Formula/*.rb']);
});

test('validateTap ignores non-formula files in Formula', async () => {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'brewpack-non-formula-'));
  await fs.writeFile(path.join(outputDir, 'README.md'), '# demo\n');
  await fs.mkdir(path.join(outputDir, 'Formula'));
  await fs.writeFile(path.join(outputDir, 'Formula', 'notes.txt'), 'not a formula\n');
  const result = await validateTap(outputDir);
  assert.equal(result.valid, false);
  assert.deepEqual(result.missing, ['Formula/*.rb']);
});


test('renderTapReadme emits copy-pasteable brew commands', async () => {
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  const readme = renderTapReadme(parsePackageFixture(raw));
  assert.ok(readme.includes('```sh\nbrew tap rogerchappel/homebrew-tea-time\nbrew install tea-time\n```'));
  assert.doesNotMatch(readme, /nbrew/);
  assert.match(readme, /Download that exact URL and replace the formula SHA256/);
  assert.match(readme, /releases\/download\/v1\.2\.3\/tea-time-1\.2\.3\.tar\.gz/);
});
