# Architecture and invariants

CTL2 has three source modules and one public package entry point. The small surface is intentional: protocol logic is easier to audit when canonicalization, limits, and compatibility are not distributed across adapters.

## Module ownership

| Module | Responsibility |
| --- | --- |
| `src/schema.ts` | Task field meanings, enum values, strict runtime schemas, and public task types |
| `src/codec.ts` | Dictionary construction, escaping, canonical serialization, decoding, limits, and format helpers |
| `src/index.ts` | The only supported public export surface |

Consumers must import from `@lcherone/ctl2`, not `dist` files or source subpaths.

## Encode path

```text
untrusted object
    │
    ▼
handoverTaskSchema.parse
    │
    ▼
list and decoded-text limits
    │
    ▼
dictionary mode validation
    │
    ▼
word counting and canonical dictionary construction
    │
    ▼
literal escaping and dictionary substitution
    │
    ▼
reference and encoded-payload limits
    │
    ▼
canonical C2 payload
```

No cache or global task state is retained. The only shared runtime object is a stateless `TextEncoder` used for UTF-8 byte counts.

## Decode path

```text
untrusted string
    │
    ▼
encoded-payload limit
    │
    ├── C2 ──► exact segments ──► dictionary ──► bounded fields/lists
    │
    └── CTL1 ► exact segments ──► legacy text ─► bounded fields/lists
                                               │
                                               ▼
                                    handoverTaskSchema.parse
                                               │
                                               ▼
                                      canonical task object
```

Dictionary lookups use `Map`, so a reference does not require scanning every dictionary entry. Byte and reference counters are request-local and monotonic.

## Core invariants

### Semantic round trip

For every task accepted by `encode()`:

```ts
decode(encode(task)) deep-equals handoverTaskSchema.parse(task)
```

The test suite checks this with canonical fixtures, reserved characters, Unicode, every enum value, and deterministic generated tasks.

### Determinism

Encoding must not depend on object insertion order, locale collation, current time, process randomness, platform paths, or Node-specific globals.

Determinism is enforced by:

- fixed task-field traversal;
- fixed protocol-field order;
- lexical tie-breaking with direct string comparison;
- sequential lower-case base-36 codes;
- a seed derived only from semantic task values;
- explicit UTF-8 measurement.

### Self-decodable output

The encoder must not return output that the decoder rejects under the same package version. Dictionary entry and reference limits therefore apply during encoding as well as decoding.

### Fail closed

A payload with an unknown version, field, token, dictionary code, escape, or ordering is rejected. The decoder does not guess intent or silently discard data.

### One canonical task contract

CTL, abstract CTL, and JSON transfer paths all end at the same strict runtime schema. Representation cannot add fields or relax task semantics.

## Dictionary cost model

Compact mode considers a word only when it occurs more than once and its encoded form is longer than two characters.

For a candidate word:

```text
raw cost        = occurrence count × encoded word length
dictionary cost = code length + '=' + encoded word + optional leading comma
reference cost  = occurrence count × ('~' + code length)
```

The word is included only when raw cost is greater than dictionary cost plus reference cost. This is a local candidate decision; `compareFormats()` is available when an application needs the exact total sizes of different representations.

## Abstract dictionary seed

Abstract mode uses a 32-bit FNV-like accumulation over task values followed by a xorshift-driven Fisher-Yates shuffle. This makes assignments stable for the same task and sensitive to task changes.

The algorithm is intentionally non-cryptographic. A deterministic mapping cannot provide secrecy.

## Compatibility boundary

The following are public compatibility surfaces:

- the `HandoverTask` field set and enum meanings;
- canonical CTL2 bytes for a given task and mode;
- accepted CTL1 records;
- resource limits;
- package exports and their TypeScript signatures.

Internal helper names and implementation layout are not public API. Nevertheless, helpers are documented because they encode protocol reasoning that maintainers need to audit safely.

## Release discipline

A release that touches codec behaviour should include:

1. a canonical fixture demonstrating intended output;
2. a round-trip test;
3. malformed counterparts for new syntax;
4. limit tests when allocation or expansion changes;
5. README, wire-format, API, and changelog updates;
6. package smoke tests for ESM, CommonJS, and declarations;
7. an explicit semantic-versioning assessment.
