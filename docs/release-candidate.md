# Release candidate readiness

## Summary
- Branch prepared for release-candidate readiness review.
- Local verification status: **PASS**
- Detailed command output is captured in `.rc_check.log`.

## Checks run
1. `npm run release:check`
2. `bash scripts/validate.sh`
3. `node /Users/roger/Developer/my-opensource/releasebox/bin/releasebox.js check .`

## Result
```
Tap layout looks valid.
PASS: smoke
npm notice
npm notice 📦  brewpack@0.1.0
npm notice Tarball Contents
npm notice 1.1kB LICENSE
npm notice 2.6kB README.md
npm notice 3.9kB bin/brewpack.js
npm notice 214B examples/sample-session.md
npm notice 1.3kB package.json
npm notice 4.0kB src/core.js
npm notice 157B src/index.js
npm notice 1.8kB src/lib.js
npm notice Tarball Details
npm notice name: brewpack
npm notice version: 0.1.0
npm notice filename: brewpack-0.1.0.tgz
npm notice package size: 5.6 kB
npm notice unpacked size: 15.0 kB
npm notice shasum: a42afe8399479144d274aae2c33be1bcb78942b8
npm notice integrity: sha512-U+X4dUmEMVM1e[...]cwsr3jlty0Ugg==
npm notice total files: 8
npm notice
brewpack-0.1.0.tgz
PASS: package dry run

Validation passed.

## releasebox
✅ releasebox config: node-cli
✅ ci workflow: .github/workflows/ci.yml
✅ release dry run workflow: .github/workflows/release-dry-run.yml
✅ task breakdown: docs/TASKS.md
✅ orchestration plan: docs/ORCHESTRATION.md
✅ dependabot config: .github/dependabot.yml
✅ npm test script: node --test
✅ build script: node --eval "import('./src/index.js')"
✅ smoke script: node ./bin/brewpack.js inspect ./fixtures/sample-tool --output ./tmp/smoke-inspect --format both && node ./bin/brewpack.js init ./fixtures/sample-tool --output ./tmp/smoke-tap --force && node ./bin/brewpack.js validate ./tmp/smoke-tap
✅ bin entry: {"brewpack":"./bin/brewpack.js"}
RESULT release_check=0 validate=0 releasebox=0
```
