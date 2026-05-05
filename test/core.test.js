import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPlan, parsePackageFixture, renderFormula } from '../src/core.js';
import { initTap, inspectProject, validateTap } from '../src/lib.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, '..', 'fixtures', 'sample-tool');

test('parsePackageFixture normalises fixture data', async () => {
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  const spec = parsePackageFixture(raw);
  assert.equal(spec.formulaClass, 'TeaTime');
  assert.equal(spec.owner, 'rogerchappel');
  assert.deepEqual(spec.binaries, ['tea-time']);
});

test('buildPlan returns release metadata', async () => {
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  const spec = parsePackageFixture(raw);
  const plan = buildPlan(spec);
  assert.match(plan.releaseArchiveUrl, /v1\.2\.3\.tar\.gz$/);
  assert.equal(plan.tapRepository, 'rogerchappel/homebrew-tea-time');
});

test('renderFormula includes caveats and install block', async () => {
  const raw = JSON.parse(await fs.readFile(path.join(fixtureDir, 'brewpack.fixture.json'), 'utf8'));
  const formula = renderFormula(parsePackageFixture(raw));
  assert.match(formula, /class TeaTime < Formula/);
  assert.match(formula, /bin\.install "dist\/tea-time"/);
  assert.match(formula, /def caveats/);
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
