# Contributing

Issues and pull requests are welcome.

Before opening a pull request:

1. Keep wire-format changes backwards-compatible unless the change is intentionally scheduled for a major release.
2. Add focused tests for new behaviour and malformed counterparts.
3. Run `npm ci` and `npm run check` on Node.js 18 or later.
4. Update the README and changelog when the public API, grammar, limits, or compatibility changes.

Canonical fixtures are intentionally exact. If a fixture changes, explain why the wire representation must change and describe the migration impact.
