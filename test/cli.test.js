import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execFileSync, execSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
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
