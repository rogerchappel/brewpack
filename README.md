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
    "binaries": ["tea-time"]
  },
  "tap": {
    "owner": "rogerchappel",
    "repo": "homebrew-tea-time"
  }
}
```

## Commands

- `brewpack inspect <fixture-dir>` — emits a human-readable and/or JSON plan
- `brewpack init <fixture-dir> --output <dir>` — writes a tap scaffold locally
- `brewpack validate <tap-dir>` — checks for a `Formula/` folder, at least one formula, and `README.md`

## Safety boundaries

- Local files only.
- No publishing or release uploads.
- No hash fetching, credential access, analytics, or telemetry.
- Generated formula SHA values are placeholders that must be reviewed by a human.

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
