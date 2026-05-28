# Release candidate: brewpack initial public build

## Classification

Release candidate for an initial public build.

## Highlights

- TypeScript CLI and library for local Homebrew tap starter generation.
- `inspect`, `init`, and `validate` commands.
- `init --dry-run` prints generated files without writing.
- Metadata discovery from `brewpack.fixture.json`, with `package.json` fallback.
- Fixture-backed unit tests, CLI smoke, package dry-run, and release dry-run workflow.

## Safety

- No publish command is included.
- No network calls are made by the CLI.
- Generated formula hashes use `REPLACE_WITH_SHA256` and require human review.

## Known Limitations

- One formula per package in the MVP.
- No automatic SHA256 calculation for remote release archives.
- Generated install paths assume release artifacts land under `dist/`.
