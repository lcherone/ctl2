# CTL2 wire-format specification

This document describes the canonical `C2` representation emitted by version 0.1.x of `@lcherone/ctl2`.

The words **must**, **must not**, **should**, and **may** describe interoperability requirements. The implementation remains authoritative when prose and executable fixtures disagree.

## Complete grammar

```text
payload        = "C2" "|" dictionary-field "|" id-field "|" title-field
                 "|" operation-field "|" objective-field "|" targets-field
                 "|" requirements-field "|" acceptance-field
                 "|" constraints-field "|" verification-field
                 "|" assumptions-field "|" exclusions-field
                 "|" classification-field

dictionary-field     = "d:" dictionary
id-field             = "i:" text
title-field          = "t:" text
operation-field      = "o:" operation-token
objective-field      = "g:" text
targets-field        = "x:" list
requirements-field   = "r:" list
acceptance-field     = "a:" list
constraints-field    = "c:" list
verification-field   = "v:" list
assumptions-field    = "u:" list
exclusions-field     = "e:" list
classification-field = "k:" classification-token

dictionary      = "" | dictionary-entry *( "," dictionary-entry )
dictionary-entry = base36-code "=" encoded-word
list            = "" | text *( "," text )
text            = *( encoded-literal | dictionary-reference )
dictionary-reference = "~" base36-code
```

Encoded literals follow `encodeURIComponent`, with three canonical adjustments:

1. spaces are represented as `+`;
2. `/` remains unescaped for readable paths;
3. literal `~` is always encoded as `%7E`.

All other delimiter characters that could conflict with `|`, `,`, `:`, `=`, `+`, `%`, or dictionary references are percent-encoded as needed.

## Canonical field order

| Position | Token | Task field |
| ---: | --- | --- |
| 1 | `d` | Payload-local dictionary |
| 2 | `i` | `id` |
| 3 | `t` | `title` |
| 4 | `o` | `operation` |
| 5 | `g` | `objective` |
| 6 | `x` | `targets` |
| 7 | `r` | `requirements` |
| 8 | `a` | `acceptanceCriteria` |
| 9 | `c` | `constraints` |
| 10 | `v` | `verification` |
| 11 | `u` | `assumptions` |
| 12 | `e` | `exclusions` |
| 13 | `k` | `contextClassification` |

The order is mandatory. A decoder must reject missing, extra, duplicated, unknown, or reordered fields.

## Operation tokens

| Task value | Token |
| --- | --- |
| `implement` | `i` |
| `fix` | `f` |
| `refactor` | `r` |
| `review` | `v` |
| `test` | `t` |

## Classification tokens

| Task value | Token |
| --- | --- |
| `public` | `p` |
| `internal-approved` | `a` |
| `restricted` | `s` |

## Lists

Lists preserve item order. Encoded commas inside an item are `%2C`, so a literal comma cannot create a second item. An empty list is represented by an empty field value such as `c:`.

An empty string is not a valid item because every task-list item must contain at least one character.

## Dictionary construction

The dictionary is local to one payload. Codes are sequential lower-case base-36 integers beginning at `0`:

```text
d:0=category,1=compatibility,2=behaviour
```

A dictionary word must match the Unicode-aware pattern `Letter`, `Number`, underscore, or hyphen for its entire decoded value.

### Compact mode

The encoder counts words across every task text field. Candidates must occur more than once and have an encoded length greater than two characters.

Candidates are ranked by gross repeated-text savings, then lexically for deterministic ties. A word is included only when:

```text
raw repeated cost > dictionary entry cost + all reference costs
```

The dictionary stops at 4,096 entries.

### Abstract mode

Every repeated word is eligible up to the same 4,096-entry limit. Words are shuffled with a deterministic seed derived from every semantic task value and then assigned sequential codes.

The shuffle is not cryptographic. Abstract mode remains readable, reversible, and unsuitable as a privacy mechanism.

## Exact example

Input:

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

Canonical output:

```text
C2|d:|i:demo-1|t:Fix+parser|o:f|g:Reject+invalid+input.|x:src/parser.ts|r:Preserve+API|a:Tests+pass|c:|v:npm+test|u:|e:|k:p
```

## Validation sequence

A conforming decoder performs these checks before returning a task:

1. Reject an encoded payload above the byte limit.
2. Select only a known version prefix.
3. Require the exact field count and canonical order.
4. Validate dictionary entry count, code order, word grammar, escapes, and uniqueness.
5. Validate operation and classification tokens.
6. Decode text and lists while accounting for aggregate bytes and references.
7. Enforce each list's item limit before allocating decoded items.
8. Validate the complete decoded task against the strict task schema.

Validation stops at the first failure.

## Resource limits

| Resource | Maximum |
| --- | ---: |
| Encoded UTF-8 payload | 1,000,000 bytes |
| Aggregate decoded UTF-8 task text | 1,000,000 bytes |
| Dictionary entries | 4,096 |
| Items per task-list field | 4,096 |
| Expanded dictionary references | 65,536 |

The encoder checks its generated dictionary and reference count against the same decoder limits before returning a payload.

## CTL1 compatibility

CTL1 is decode-only. Its canonical shape is:

```text
CTL1|ID:text|T:text|O:operation|G:text|X:list|R:list|A:list|C:list|V:list|U:list|E:list|K:classification
```

CTL1 uses standard percent-encoded text, commas for list separators, and `-` for an empty list. Supported operation tokens are `IMP`, `FIX`, `REF`, `REV`, and `TST`; classification tokens are `PUB`, `INT`, and `RES`.

New encodes must use CTL2. CTL1 support exists only so previously stored records can be read and migrated.

## Compatibility rules

Any change that makes the same task produce different canonical CTL2, changes accepted field order, changes token meaning, or changes task semantics is a protocol compatibility change. It must include new canonical fixtures, migration notes, and an explicit semantic-versioning decision.
