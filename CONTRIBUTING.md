# Contributing

Issues and pull requests are welcome. CTL2 is deliberately small, so changes should preserve a narrow public contract and make protocol reasoning easier to audit.

## Development setup

Use the Node version in `.nvmrc`:

```bash
nvm use
npm ci
npm run check
```

The published runtime supports older Node versions than the development toolchain. Do not lower or raise runtime compatibility based only on the Node version used to lint and build.

## Change requirements

Before opening a pull request:

1. Keep wire-format changes backwards-compatible unless the change is intentionally scheduled for a major release.
2. Add focused tests for valid behaviour, semantic round trips, and malformed counterparts.
3. Analyse payload, decoded-size, dictionary, reference, and list limits.
4. Add or update JSDoc for every affected public and internal symbol.
5. Update README examples and the relevant API, wire-format, architecture, adoption, or testing guide.
6. Add an entry under `Unreleased` in the changelog.
7. Run `npm ci`, `npm run check`, `npm audit`, and `npm pack --dry-run`.

## Canonical fixtures

Canonical fixtures are intentionally byte-exact. If a fixture changes, the pull request must explain:

- why the same task must now produce different bytes;
- whether existing signatures, hashes, caches, or stored payloads are affected;
- how older payloads will be decoded or migrated;
- which semantic-version increment is appropriate.

Do not update a fixture merely to make a failing test pass.

## Pull-request scope

Keep protocol changes separate from mechanical refactors when possible. Avoid unrelated dependency updates or generated-file churn. Commit rebuilt `dist` output whenever public source or declarations change so Git-tag installations remain usable without a build step.

## Security reports

Do not open public issues for suspected vulnerabilities. Follow [SECURITY.md](SECURITY.md).
