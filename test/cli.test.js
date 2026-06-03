import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { existsSync, mkdtempSync } from 'node:fs';
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
});
