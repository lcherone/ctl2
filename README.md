# CTL2

[![CI](https://github.com/lcherone/ctl2/actions/workflows/ci.yml/badge.svg)](https://github.com/lcherone/ctl2/actions/workflows/ci.yml)
[![GitHub release](https://img.shields.io/github/v/release/lcherone/ctl2)](https://github.com/lcherone/ctl2/releases)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

CTL2 is a small TypeScript codec for deterministic, reversible task handovers. It turns a validated structured task into a compact canonical string and decodes that string without asking a model to infer missing information.

It is intended for systems that need to preview, compare, store, sign, or transmit the exact task that an agent or worker will receive.

## When CTL2 is a good fit

Use CTL2 when you need:

- one explicit task contract shared by producers and consumers;
- byte-for-byte deterministic serialization;
- a compact, human-reviewable transport representation;
- strict rejection of unknown, reordered, truncated, or malformed fields;
- fixed decoder limits for untrusted input;
- backwards-compatible decoding of existing CTL1 records.

Do not use CTL2 as encryption, authentication, authorization, secret scanning, digital signing, or a general-purpose object serializer. CTL2 serializes one deliberately narrow task schema.

## Guarantees

- **Lossless:** `decode(encode(task))` returns the complete validated task.
- **Deterministic:** equal tasks and options produce byte-for-byte equal payloads.
- **Canonical:** field order, token spelling, escaping, and dictionary-code order are fixed.
- **Strict:** unknown versions, fields, tokens, references, and malformed escapes fail closed.
- **Bounded:** payload bytes, decoded bytes, dictionaries, references, and lists have fixed limits.
- **Unicode-safe:** text and byte counts use Unicode-aware matching and UTF-8 measurement.
- **Portable:** browser-compatible ESM plus Node-compatible ESM and CommonJS builds are included.
- **Compatible:** stored canonical CTL1 payloads remain decodable; new payloads are CTL2.

CTL2 is compact serialization, not a privacy boundary. Anyone who can read a payload can decode its content.

## Install

Install directly from the immutable public GitHub release tag without registry authentication:

```bash
npm install github:lcherone/ctl2#v0.2.0
```

Or install from GitHub Packages after authenticating npm for `npm.pkg.github.com`:

```bash
npm config set @lcherone:registry https://npm.pkg.github.com
npm install @lcherone/ctl2@0.2.0
```

The runtime supports Node.js 18 and later. The ESM build also works in modern browsers that provide `TextEncoder`.

## Complete input and output example

This is the exact input used by [`examples/basic.mjs`](examples/basic.mjs):

```ts
import { decode, encode, type HandoverTask } from '@lcherone/ctl2';

const task: HandoverTask = {
  version: 1,
  id: 'demo-1',
  title: 'Fix parser',
  objective: 'Reject invalid input.',
  operation: 'fix',
  targets: ['src/parser.ts'],
  requirements: ['Preserve API'],
  acceptanceCriteria: ['Tests pass'],
  constraints: [],
  verification: ['npm test'],
  assumptions: [],
  exclusions: [],
  contextClassification: 'public'
};

const payload = encode(task);
const decoded = decode(payload);
```

`encode(task)` returns this exact CTL2 payload:

```text
C2|d:|i:demo-1|t:Fix+parser|o:f|g:Reject+invalid+input.|x:src/parser.ts|r:Preserve+API|a:Tests+pass|c:|v:npm+test|u:|e:|k:p
```

`decode(payload)` returns:

```json
{
  "version": 1,
  "id": "demo-1",
  "title": "Fix parser",
  "objective": "Reject invalid input.",
  "operation": "fix",
  "targets": ["src/parser.ts"],
  "requirements": ["Preserve API"],
  "acceptanceCriteria": ["Tests pass"],
  "constraints": [],
  "verification": ["npm test"],
  "assumptions": [],
  "exclusions": [],
  "contextClassification": "public"
}
```

The checked-in example is executed in the test suite, including the exact serialized output.

## Validate untrusted input without throwing

Use `validate()` at user-input or network boundaries:

```ts
import { validate } from '@lcherone/ctl2';

const result = validate(incomingPayload);

if (result.valid) {
  console.log(result.task.objective);
} else {
  console.error(result.errors[0]);
}
```

`ValidationResult` is a discriminated union, so TypeScript makes `task` available only after `result.valid` is true.

## Dictionary modes

Compact mode is the default:

```ts
const payload = encode(task);
const samePayload = encode(task, { dictionaryMode: 'compact' });
```

It assigns dictionary codes only to repeated words whose entry plus all references makes the complete payload smaller.

Abstract mode assigns deterministically shuffled codes to repeated words, up to the fixed dictionary limit:

```ts
const abstractPayload = encode(task, { dictionaryMode: 'abstract' });
```

The same task always receives the same abstract mapping. A semantic task change can reshuffle it. Abstract mode may be larger than compact mode and is not encryption, obfuscation, or a privacy feature.

Both modes use the same `C2` wire grammar and `decode()` function.

## API summary

| Export | Purpose |
| --- | --- |
| `encode(task, options?)` | Validate and serialize a task as canonical CTL2 |
| `decode(payload)` | Decode canonical CTL2 or legacy CTL1 and validate the result |
| `validate(payload)` | Decode without throwing and return a discriminated result |
| `compareFormats(task)` | Produce compact CTL2, abstract CTL2, JSON, and UTF-8 byte counts |
| `decodeTransferPayload(format, payload)` | Decode `ctl`, `ctl-abstract`, or strict JSON input |
| `handoverTaskSchema` | Strict Zod runtime schema for a complete task |
| `operationSchema` | Runtime schema for task operations |
| `classificationSchema` | Runtime schema for context classifications |
| `transferFormatSchema` | Runtime schema for supported transfer formats |
| `CTL_LIMITS` | Read-only codec resource limits |

All public functions, options, result fields, schemas, and task fields include generated JSDoc. See [API.md](docs/API.md) for signatures, errors, and focused examples.

## Task schema

| Field | Type | Meaning |
| --- | --- | --- |
| `version` | `1` | Structured task schema version |
| `id` | string | Stable identifier, 1–160 characters |
| `title` | string | Human-readable title, 1–240 characters |
| `objective` | string | Complete required outcome |
| `operation` | enum | `implement`, `fix`, `refactor`, `review`, or `test` |
| `targets` | string[] | Explicit files, modules, repositories, URLs, or systems in scope |
| `requirements` | string[] | Required behaviour and implementation requirements |
| `acceptanceCriteria` | string[] | Observable completion conditions |
| `constraints` | string[] | Compatibility, safety, and change-scope boundaries |
| `verification` | string[] | Commands or human checks expected to verify the outcome |
| `assumptions` | string[] | Facts relied upon but not yet verified |
| `exclusions` | string[] | Work explicitly outside the task |
| `contextClassification` | enum | `public`, `internal-approved`, or `restricted` |

The object schema is strict: missing required fields, empty strings, unsupported enum values, and extra object properties are rejected. Every list must be present even when empty.

## Wire format at a glance

```text
C2|d:dictionary|i:text|t:text|o:operation|g:text|x:list|r:list|a:list|c:list|v:list|u:list|e:list|k:classification
```

Spaces encode as `+`, path separators stay readable as `/`, list items are comma-separated, and empty lists use an empty field. Reserved or ambiguous characters are percent-encoded. A reference such as `~0` expands to the matching dictionary entry; a literal `~` is always percent-encoded.

Canonical field order is part of the protocol. A decoder rejects missing, extra, duplicated, unknown, or reordered fields. See [WIRE_FORMAT.md](docs/WIRE_FORMAT.md) for the complete grammar and decoding rules.

## Resource limits

`CTL_LIMITS` defines:

| Limit | Value |
| --- | ---: |
| Encoded payload | 1,000,000 UTF-8 bytes |
| Aggregate decoded task text | 1,000,000 UTF-8 bytes |
| Dictionary entries | 4,096 |
| Items in each task list | 4,096 |
| Dictionary references | 65,536 |

The encoder applies the same limits as the decoder and never returns a payload that its own decoder would reject for dictionary size or reference count.

## Module formats

ES modules:

```js
import { decode, encode } from '@lcherone/ctl2';
```

CommonJS:

```js
const { decode, encode } = require('@lcherone/ctl2');
```

Browser bundlers should consume the ESM export. The runtime does not use Node's `Buffer`, filesystem, process, network, or native modules.

## Production adoption checklist

Before accepting CTL2 in a production boundary:

1. Validate and authorize the canonical task before encoding it.
2. Apply secret scanning and data-classification rules to task fields, not compact tokens.
3. Pin a released version or immutable Git tag.
4. Catch `decode()` errors or use `validate()` for untrusted payloads.
5. Keep the default resource limits unless a future version explicitly makes them configurable.
6. Add transport integrity or signatures when payload tampering matters.
7. Store the declared format and package version beside long-lived payloads.
8. Test a representative production payload against a new release before upgrading.

See [ADOPTION.md](docs/ADOPTION.md) for boundary patterns, migration guidance, observability, and rollout advice.

## Documentation

- [API reference and examples](docs/API.md)
- [Wire-format specification](docs/WIRE_FORMAT.md)
- [Architecture and invariants](docs/ARCHITECTURE.md)
- [Production adoption guide](docs/ADOPTION.md)
- [Testing strategy](docs/TESTING.md)
- [Security policy and threat boundary](SECURITY.md)
- [Contribution guide](CONTRIBUTING.md)
- [Release history](CHANGELOG.md)

## Repository map

| Path | Responsibility |
| --- | --- |
| `src/schema.ts` | Public task contract and runtime Zod schemas |
| `src/codec.ts` | Canonical encoding, strict decoding, limits, and format comparison |
| `src/index.ts` | Single supported public export surface |
| `examples/` | Executable input/output and validation examples |
| `test/` | Canonical fixtures, compatibility, malformed input, limits, fuzzing, and package smoke tests |
| `docs/` | Protocol, API, architecture, adoption, and testing documentation |
| `.github/workflows/` | CI, dependency review, static analysis, and release publication |

## Development

The published runtime supports Node.js 18 or later. Building from source uses Node.js 22.22.2 or later because the documentation and lint toolchain intentionally tracks current supported releases.

```bash
npm ci
npm run check
npm run build
npm pack --dry-run
```

`npm run check` runs source and Markdown linting, strict TypeScript checks, API-documentation validation, tests with coverage thresholds, dual-format builds, example tests, package smoke tests, and package-manifest validation.

See [TESTING.md](docs/TESTING.md) for individual commands and CI coverage.

## Versioning

CTL2 follows semantic versioning. Changes to canonical CTL2 encoding, accepted wire grammar, exported task shape, decoder limits, or public API require an explicit compatibility decision. Decoders may continue accepting older formats after encoders move forward.

## License

[MIT](LICENSE)
