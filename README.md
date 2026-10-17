# CTL2

[![CI](https://github.com/lcherone/ctl2/actions/workflows/ci.yml/badge.svg)](https://github.com/lcherone/ctl2/actions/workflows/ci.yml)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

CTL2 is a small TypeScript codec for deterministic, reversible task handovers. It turns a validated structured task into a compact, canonical string and decodes that string without asking a model to infer missing information.

It is designed for systems that need to preview, compare, store, sign, or transmit the exact task that an agent will receive.

## Properties

- Lossless: `decode(encode(task))` returns the complete canonical task.
- Deterministic: equal tasks produce byte-for-byte equal payloads.
- Strict: unknown versions, reordered fields, malformed escapes, invalid dictionary references, and invalid task shapes fail closed.
- Bounded: payload size, decoded size, dictionary entries, references, and list lengths have fixed limits.
- Unicode-safe: text and byte counts use UTF-8 semantics.
- Portable: browser-compatible ESM and Node-compatible ESM/CommonJS builds are included.
- Backwards-compatible: stored canonical `CTL1` payloads can still be decoded.

CTL2 is compact serialization, not encryption. It does not hide content from a provider, workspace administrator, log, or recipient.

## Install

The source and releases are public on GitHub:

```bash
npm install github:lcherone/ctl2#v0.1.0
```

GitHub Packages installation is also supported when your npm client is authenticated for `npm.pkg.github.com`:

```bash
npm config set @lcherone:registry https://npm.pkg.github.com
npm install @lcherone/ctl2@0.1.0
```

## Quick start

```ts
import { decode, encode, validate, type HandoverTask } from '@lcherone/ctl2';

const task: HandoverTask = {
  version: 1,
  id: 'TASK-42',
  title: 'Fix category traversal',
  objective: 'Preserve the public API while removing recursive queries.',
  operation: 'fix',
  targets: ['src/categories.ts'],
  requirements: ['Keep result ordering stable'],
  acceptanceCriteria: ['Existing and regression tests pass'],
  constraints: ['Do not change the database schema'],
  verification: ['npm test'],
  assumptions: [],
  exclusions: ['No UI changes'],
  contextClassification: 'internal-approved'
};

const payload = encode(task);
const decoded = decode(payload);
const result = validate(payload);

console.log(payload);        // C2|d:...|i:TASK-42|...
console.log(decoded);        // the validated task
console.log(result.valid);   // true
```

CommonJS is supported too:

```js
const { encode, decode } = require('@lcherone/ctl2');
```

## API

### `encode(task, options?)`

Validates a `HandoverTask` and returns canonical CTL2.

```ts
encode(task);
encode(task, { dictionaryMode: 'compact' });
encode(task, { dictionaryMode: 'abstract' });
```

`compact` is the default. It creates a payload-local dictionary only for repeated words whose references make the complete payload smaller.

`abstract` assigns every repeated word a deterministically shuffled base-36 code. It remains reversible and deterministic but may be larger. It is not a security or privacy feature.

### `decode(payload)`

Decodes and validates canonical CTL2 or legacy CTL1. Invalid input throws an `Error` or a Zod validation error.

### `validate(payload)`

Returns a non-throwing discriminated result:

```ts
const result = validate(payload);

if (result.valid) {
  console.log(result.task);
} else {
  console.error(result.errors);
}
```

### `compareFormats(task)`

Returns compact CTL2, abstract CTL2, minified JSON, and the UTF-8 byte length of each representation.

### `decodeTransferPayload(format, payload)`

Decodes `ctl`, `ctl-abstract`, or `json` transfer payloads through the same strict task schema.

### Schemas and types

The package exports:

- `handoverTaskSchema`
- `operationSchema`
- `classificationSchema`
- `transferFormatSchema`
- `HandoverTask`
- `Operation`
- `ContextClassification`
- `TransferFormat`
- `EncodeOptions`
- `FormatComparison`
- `ValidationResult`
- `CTL_LIMITS`

## Task schema

| Field | Type | Notes |
| --- | --- | --- |
| `version` | `1` | Version of the structured task schema |
| `id` | string | 1–160 characters |
| `title` | string | 1–240 characters |
| `objective` | string | Required |
| `operation` | enum | `implement`, `fix`, `refactor`, `review`, or `test` |
| `targets` | string[] | Files, modules, repositories, or other explicit targets |
| `requirements` | string[] | Required behaviour |
| `acceptanceCriteria` | string[] | Observable completion conditions |
| `constraints` | string[] | Boundaries the implementer must preserve |
| `verification` | string[] | Checks to run |
| `assumptions` | string[] | Facts not yet proven |
| `exclusions` | string[] | Explicitly out-of-scope work |
| `contextClassification` | enum | `public`, `internal-approved`, or `restricted` |

The schema is strict: extra object properties are rejected.

## Wire format

```text
C2|d:dictionary|i:text|t:text|o:operation|g:text|x:list|r:list|a:list|c:list|v:list|u:list|e:list|k:classification
```

| Token | Meaning |
| --- | --- |
| `d` | Dictionary entries in canonical `code=word` order |
| `i` | Task ID |
| `t` | Title |
| `o` | Operation: `i`, `f`, `r`, `v`, or `t` |
| `g` | Objective/goal |
| `x` | Targets |
| `r` | Requirements |
| `a` | Acceptance criteria |
| `c` | Constraints |
| `v` | Verification |
| `u` | Assumptions |
| `e` | Exclusions |
| `k` | Classification: `p`, `a`, or `s` |

Spaces encode as `+`, path separators stay readable as `/`, list items are comma-separated, and empty lists use an empty field. Reserved or ambiguous characters are percent-encoded. A dictionary reference such as `~0` expands to the corresponding `d` entry; literal `~` is always escaped.

The canonical order is part of the format. A decoder rejects missing, extra, unknown, or reordered fields.

## Resource limits

`CTL_LIMITS` currently defines:

| Limit | Value |
| --- | ---: |
| Encoded payload | 1,000,000 UTF-8 bytes |
| Decoded task text | 1,000,000 UTF-8 bytes |
| Dictionary entries | 4,096 |
| Items in each list | 4,096 |
| Dictionary references | 65,536 |

These limits are enforced for both trusted and untrusted input. They are part of the current implementation contract and may become configurable only in a future major version.

## Security model

Use CTL2 after applying your own authorization, classification, secret scanning, and policy checks to the canonical task. Compact tokens must never be used to bypass those checks. See [SECURITY.md](SECURITY.md) for the threat boundary and reporting process.

## Development

The published runtime supports Node.js 18 or later. Building from source requires Node.js 22.18 or later because of the development toolchain.

```bash
npm ci
npm run check
npm pack --dry-run
```

`npm run check` runs linting, strict TypeScript checks, tests with enforced coverage thresholds, dual-format builds, and ESM/CommonJS package smoke tests.

## Versioning

The package follows semantic versioning. Changes to canonical CTL2 encoding, accepted wire grammar, exported task shape, or public API require a compatible migration or a major release. Decoders may continue accepting older formats after encoders move forward.

## License

[MIT](LICENSE)
