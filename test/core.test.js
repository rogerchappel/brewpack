import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPlan, parsePackageFixture, renderFormula, renderTapReadme } from '../src/core.js';
import { initTap, inspectProject, validateTap } from '../src/lib.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, '..', 'fixtures', 'sample-tool');

test('parsePackageFixture normalises fixture data', async () => {
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  const spec = parsePackageFixture(raw);
  assert.equal(spec.formulaClass, 'TeaTime');
  assert.equal(spec.owner, 'rogerchappel');
  assert.deepEqual(spec.binaries, ['tea-time']);
  assert.equal(spec.artifact.install['tea-time'], 'dist/tea-time');
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
  const result = await validateTap(outputDir);
  assert.equal(result.valid, true);
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
