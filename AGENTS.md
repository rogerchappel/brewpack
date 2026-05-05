# Agent Operating Instructions for brewpack

## Project context

- Repository: `https://github.com/rogerchappel/brewpack`
- Default branch: `main`
- Package manager: `npm`
- Primary verification: `bash scripts/validate.sh`

## Core principle

Make small, verifiable changes. Keep output deterministic and local-first.

## Safety rules

Ask before adding:

- hidden network calls
- publishing automation
- credential handling
- telemetry or analytics
- destructive file deletion outside generated temp paths

## Commit shape

Use conventional commits and prefer one reviewable intent per commit.

## Verification

For meaningful changes, run the smallest relevant gate first, then `bash scripts/validate.sh` before final handoff.
