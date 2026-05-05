#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

failed=0

pass() { printf 'PASS: %s\n' "$1"; }
fail() { printf 'FAIL: %s\n' "$1" >&2; failed=1; }
run() {
  local label="$1"
  shift
  if "$@"; then
    pass "$label"
  else
    fail "$label"
  fi
}

for file in README.md CONTRIBUTING.md SECURITY.md package.json bin/brewpack.js src/index.js fixtures/sample-tool/brewpack.fixture.json; do
  test -f "$file" && pass "required file exists: $file" || fail "missing required file: $file"
done

run "unit tests" npm test
run "check" npm run check
run "build" npm run build
run "smoke" npm run smoke
run "package dry run" npm pack --dry-run

if [ "$failed" -ne 0 ]; then
  printf '\nValidation failed.\n' >&2
  exit 1
fi

printf '\nValidation passed.\n'
