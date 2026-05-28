# Local-First Safety Model

`brewpack` is intentionally limited to deterministic local files in its MVP.

## Allowed

- Read `brewpack.fixture.json` from a directory you provide.
- Read `package.json` from a directory you provide when no fixture exists.
- Write generated tap starter files only under the explicit `--output` directory.
- Print dry-run previews to stdout.

## Not Allowed

- Publishing taps, npm packages, or GitHub releases.
- Fetching tarballs or calculating remote SHA256 values.
- Reading credentials, environment secrets, or Homebrew configuration.
- Telemetry, analytics, or hidden network calls.

## Human Review Points

- Replace `REPLACE_WITH_SHA256` before using a generated formula publicly.
- Confirm the generated `url` matches the release artifact you intend to ship.
- Review generated install paths against your actual release layout.
