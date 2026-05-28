# brewpack

Status: MVP implemented
Decision: release candidate

## Scorecard

Total: 72/100
Band: release candidate
Last scored: 2026-05-29
Scored by: OSS factory

| Criterion | Points | Notes |
|---|---:|---|
| Problem pain | 14/20 | Reduces repeated Homebrew tap starter work for small tools. |
| Demand signal | 8/20 | Seed signal only; public demand still needs validation. |
| V1 buildability | 18/20 | Local deterministic MVP is implemented with tests and smoke. |
| Differentiation | 12/15 | Fresh TypeScript CLI focused on local dry-run generation and validation. |
| Agentic workflow leverage | 13/15 | Clear fixtures, dry runs, and validation fit automated OSS factory use. |
| Distribution potential | 7/10 | Useful README/examples; broader content/demo still pending. |

## Pitch

A reusable Homebrew tap starter kit for small OSS tool portfolios, with formula templates, CI checks, and install docs.

## Why It Matters

This is a renamed backlog idea inspired by an external repo/activity signal. It should be treated as a fresh OSS concept, not a copy of the source project. The first qualification pass should identify Roger-specific workflow value, defensible differentiation, and a tiny local-first V1.

## Qualification

### Pub Test

Can this be explained clearly in one sentence to local-first or agentic-tooling developers? Needs validation.

### Competitors / Adjacent Tools

- `homebrew-tap` — source inspiration: https://github.com/vincentkoc/homebrew-tap (Ruby, stars/forks signal: not listed).

### Star / Demand Signal

Seed signal from the linked public repository list shared by Roger on 2026-05-02. Re-check stars, forks, issues, and recent commits before promoting to ready.

### Real Problem

Needs a qualification pass to separate durable workflow pain from novelty. Prefer local-first, testable, agent-useful slices.

### V1 Buildability

Likely buildable as a deterministic CLI/library/demo if scoped to fixtures, local files, and explicit external calls only.

## V1 Scope

- Generate tap repo structure
- Create formula templates from package metadata
- Validate install block examples
- Keep publish actions explicit and dry-run first

## Out of Scope

- Copying the source repo name or implementation directly.
- Hidden network calls, credential scraping, telemetry, or publishing.
- Broad platform replacement in V1.

## CLI/API Sketch

```bash
brewpack --help
brewpack inspect ./fixtures/sample-tool --output ./out --format both
brewpack init ./fixtures/sample-tool --output ./tmp/homebrew-tea-time --dry-run
brewpack init ./fixtures/sample-tool --output ./tmp/homebrew-tea-time --force
brewpack validate ./tmp/homebrew-tea-time
```

## Verification

- Unit tests for fixture parsing and report generation.
- CLI smoke test using local fixtures.
- README with install, quickstart, safety notes, and source attribution.
- No hidden network, credential, or publish behavior.

## Agent Prompt

Build `brewpack` as a renamed, local-first OSS idea inspired by `homebrew-tap`. Preserve attribution, avoid direct copying, and focus V1 on deterministic fixtures, clear safety boundaries, and practical agent/developer workflow value.
