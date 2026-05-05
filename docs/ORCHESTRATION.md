# ORCHESTRATION: brewpack

Single-owner build lane for the OSS factory.

## Owner boundaries
- This repo belongs to exactly one sub-agent during this run.
- Do not edit sibling project repositories.
- Work directly in this freshly scaffolded checkout unless a conflicting checkout/history appears.

## Done means
- Functional local-first MVP.
- Fixture-backed tests.
- Real CLI smoke.
- README/examples/safety docs.
- 30–50 meaningful atomic commits where practical; no fake/no-op commits.
- Public GitHub repo under rogerchappel/brewpack pushed to main.
- Main branch protection attempted with the workspace helper.
