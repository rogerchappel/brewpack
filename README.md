# brewpack 🔧

`brewpack` is a local-first toolkit for scaffolding and checking small Homebrew tap repositories from deterministic package fixtures.

It is inspired by the general problem space around Homebrew tap starter repos, including adjacent projects like [`vincentkoc/homebrew-tap`](https://github.com/vincentkoc/homebrew-tap), but this project is a fresh implementation focused on safe local workflows, fixture-backed tests, and agent-friendly automation.

## What it does

- inspects local package fixtures and turns them into a release plan
- generates a tap skeleton with a formula, README, and plan file
- validates that a generated tap has the minimum expected shape
- never publishes, never reaches for credentials, and never makes hidden network calls

## Install

```bash
npm install
```

For local CLI use without publishing:

```bash
node ./bin/brewpack.js --help
```

## Quickstart

Inspect a local fixture:

```bash
node ./bin/brewpack.js inspect ./fixtures/sample-tool --format both
```

Generate a tap starter repo:

```bash
node ./bin/brewpack.js init ./fixtures/sample-tool --output ./tmp/homebrew-tea-time --force
```

Validate the generated tap:

```bash
node ./bin/brewpack.js validate ./tmp/homebrew-tea-time
```

## Fixture format

Create a `brewpack.fixture.json` file in a local directory:

```json
{
  "package": {
    "name": "tea-time",
    "version": "1.2.3",
    "description": "Brew a pleasant cup of CLI tea.",
    "license": "MIT",
    "repository": "https://github.com/example/tea-time",
    "binaries": ["tea-time"],
    "test": {
      "command": "tea-time doctor --json",
      "expect": "\"healthy\":true"
    }
  },
  "artifacts": [
    {
      "url": "https://github.com/example/tea-time/releases/download/v1.2.3/tea-time-1.2.3.tar.gz",
      "install": {
        "tea-time": "dist/tea-time"
      }
    }
  ],
  "tap": {
    "owner": "rogerchappel",
    "repo": "homebrew-tea-time"
  }
}
```

The first word of `package.test.command` must match an entry in `package.binaries`.
brewpack maps that word to Homebrew's `#{bin}/<binary>` path and preserves the
remaining arguments. `package.test.expect` is rendered as the formula's expected
output. When `test` is omitted, brewpack uses `<package-name> --help` and expects
`Usage`.

`artifacts` must declare exactly one downloadable release archive. Its `install`
object maps every entry in `package.binaries` to the relative path that archive
contains. The keys must match the declared binaries exactly; missing, extra,
absolute, and parent-traversing paths are rejected. The generated formula and
checksum instructions both use the declared artifact URL.

## Commands

- `brewpack inspect <fixture-dir> [--output <dir>] [--format json|text|both]` — emits a human-readable and/or JSON plan; `--output` also writes `inspection.json` and `inspection.txt`
- `brewpack init <fixture-dir> --output <dir> [--force]` — writes a tap scaffold locally; plain `--force` replaces brewpack-owned output, including a formula renamed by the fixture, while preserving unrelated files
- `brewpack validate <tap-dir>` — checks the tap layout, verifies the formula recorded in brewpack generation metadata, and requires every formula to contain a 64-hex-character SHA256

Each command accepts exactly one positional directory. Options are command-specific,
and options such as `--output` and `--format` require a value. The `--force` option is
a boolean switch and does not accept a value such as `--force false`.

## Safety boundaries

- Local files only.
- No publishing or release uploads.
- No hash fetching, credential access, analytics, or telemetry.
- Generated formula SHA values are placeholders that must be replaced with the downloaded release archive's real 64-character hexadecimal SHA256. Validation rejects both `REPLACE_WITH_SHA256` and malformed checksums.

## Verification

Run the full local gate:

```bash
bash scripts/validate.sh
```

Useful targeted commands:

```bash
npm test
npm run build
npm run smoke
npm pack --dry-run
```

## Examples

See [examples/sample-session.md](examples/sample-session.md) for a minimal end-to-end run.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## License

MIT

## Release verification

Run the same checks locally before opening a release PR:

```bash
npm run check
npm test
npm run build
npm run smoke
npm run package:smoke
npm run release:check
```
