# Contributing

Thanks for helping with `brewpack`.

## Ground rules

- Keep changes small and reviewable.
- Prefer one intent per commit.
- Add or update tests when behavior changes.
- Keep the project local-first and explicit about anything release-related.
- Avoid adding hidden network behavior.

## Setup

```bash
npm install
bash scripts/validate.sh
```

## Development loop

```bash
npm test
npm run smoke
```

## Pull requests

Include:

- a short summary of the problem and fix
- verification steps you ran
- any safety or release implications

If you change CLI behavior, update README examples and fixtures in the same PR.
