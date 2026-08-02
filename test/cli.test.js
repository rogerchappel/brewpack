import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execFileSync, execSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const cli = join(process.cwd(), 'bin/brewpack.js');

describe('brewpack CLI', () => {
  it('should show help output', () => {
    const out = execSync(`node ${cli} --help`, { encoding: 'utf8' });
    assert.ok(out.includes('brewpack') || out.includes('Homebrew'), 'help should mention brewpack or Homebrew');
  });

  it('should inspect a fixture without error', () => {
    const out = execSync(`node ${cli} inspect fixtures/sample-tool --format json`, { encoding: 'utf8' });
    assert.ok(out.includes('"'), 'should produce JSON output');
  });

  it('should fail gracefully for missing tool', () => {
    try {
      execSync(`node ${cli} inspect nonexistent-tool`, { stdio: 'pipe', encoding: 'utf8' });
      assert.ok(false, 'should have failed');
    } catch (e) {
      assert.ok(e.status !== 0, 'should exit non-zero for missing tool');
    }
  });

  it('rejects unsupported formats before writing output', () => {
    const parent = mkdtempSync(join(tmpdir(), 'brewpack-cli-format-'));
    const output = join(parent, 'inspection');
    const result = spawnSync(process.execPath, [cli, 'inspect', 'fixtures/sample-tool', '--output', output, '--format', 'xml'], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--format must be one of: json, text, both/);
    assert.equal(existsSync(output), false);
  });

  it('rejects unknown options', () => {
    const result = spawnSync(process.execPath, [cli, 'validate', 'fixtures/sample-tool', '--verbose'], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /validate does not support --verbose/);
  });

  it('rejects options with missing values', () => {
    const result = spawnSync(process.execPath, [cli, 'inspect', 'fixtures/sample-tool', '--output'], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--output requires a value/);
  });

  it('rejects extra positional arguments', () => {
    const result = spawnSync(process.execPath, [cli, 'validate', 'fixtures/sample-tool', 'another-tap'], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /validate requires exactly one <tap-dir>/);
  });

  it('rejects values supplied to --force without touching the target', () => {
    const target = mkdtempSync(join(tmpdir(), 'brewpack-cli-force-value-'));
    writeFileSync(join(target, 'keep.txt'), 'keep\n');
    const result = spawnSync(process.execPath, [cli, 'init', 'fixtures/sample-tool', '--output', target, '--force', 'false'], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--force does not take a value/);
    assert.deepEqual(readdirSync(target), ['keep.txt']);
  });

  it('requires plain --force to overwrite a nonempty target', () => {
    const target = mkdtempSync(join(tmpdir(), 'brewpack-cli-force-'));
    writeFileSync(join(target, 'keep.txt'), 'replace me\n');
    const withoutForce = spawnSync(process.execPath, [cli, 'init', 'fixtures/sample-tool', '--output', target], { encoding: 'utf8' });
    assert.equal(withoutForce.status, 1);
    assert.deepEqual(readdirSync(target), ['keep.txt']);

    const withForce = spawnSync(process.execPath, [cli, 'init', 'fixtures/sample-tool', '--output', target, '--force'], { encoding: 'utf8' });
    assert.equal(withForce.status, 0);
    assert.equal(existsSync(join(target, 'Formula', 'tea-time.rb')), true);
  });

  it('rejects a Formula directory containing no .rb files', () => {
    const tap = mkdtempSync(join(tmpdir(), 'brewpack-cli-invalid-'));
    mkdirSync(join(tap, 'Formula'));
    writeFileSync(join(tap, 'Formula', 'notes.txt'), 'not a formula\n');
    writeFileSync(join(tap, 'README.md'), '# demo\n');
    const result = spawnSync(process.execPath, [cli, 'validate', tap], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Missing: Formula\/\*\.rb/);
  });

  it('accepts a Formula directory containing a .rb formula', () => {
    const tap = mkdtempSync(join(tmpdir(), 'brewpack-cli-valid-'));
    mkdirSync(join(tap, 'Formula'));
    writeFileSync(join(tap, 'Formula', 'demo.rb'), 'class Demo < Formula\nend\n');
    writeFileSync(join(tap, 'README.md'), '# demo\n');
    const output = execFileSync(process.execPath, [cli, 'validate', tap], { encoding: 'utf8' });
    assert.match(output, /Tap layout looks valid/);
  });
});
