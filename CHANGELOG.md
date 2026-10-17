# Changelog

All notable changes are documented here. This project follows [Semantic Versioning](https://semver.org/).

## Unreleased

## 0.3.0 - 2026-10-17

### Changed

- Upgrade the public runtime schema dependency to Zod 4. The CTL task and wire formats are unchanged, while exported schema declaration types now follow Zod 4.
- Group Vitest and its coverage provider into one compatible dependency update.
- Keep TypeScript and Node.js type definitions on their currently supported major versions.

## 0.2.0 - 2026-10-17

### Added

- Comprehensive JSDoc for the public API, task schema, limits, and internal codec pipeline.
- Executable exact input/output and validation examples.
- API, wire-format, architecture, production-adoption, and testing guides.
- Runtime schema descriptions for schema-aware tooling.
- CI documentation validation, package validation, dependency review, static analysis, and automated dependency updates.

### Changed

- `ValidationResult` is now a fully discriminated TypeScript union.
- The encoder rejects invalid runtime options and unsupported transfer formats from untyped callers.
- Compact dictionary construction stops at the decoder's entry limit.
- The encoder refuses to return a payload above the decoder's dictionary-reference limit.

## 0.1.0 - 2026-10-17

### Added

- Deterministic CTL2 encoding with compact and abstract dictionary modes.
- Strict CTL2 decoding and non-throwing validation.
- Backwards-compatible CTL1 decoding.
- Structured task schemas, TypeScript types, and JSON transfer decoding.
- UTF-8 format-size comparison without a Node-specific runtime dependency.
- Fixed payload, decoded-size, dictionary, reference, and list limits.
- ESM, CommonJS, source map, and TypeScript declaration builds.
