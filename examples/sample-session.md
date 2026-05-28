# brewpack example session

```bash
brewpack inspect ./fixtures/sample-tool --format both
brewpack init ./fixtures/sample-tool --output ./tmp/homebrew-tea-time --dry-run
brewpack init ./fixtures/sample-tool --output ./tmp/homebrew-tea-time --force
brewpack validate ./tmp/homebrew-tea-time
brewpack inspect ./fixtures/package-json-tool --format json
```
