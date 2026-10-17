# API reference

CTL2 exposes one package entry point. Import everything from `@lcherone/ctl2`; internal files are not a supported API.

```ts
import {
  CTL_LIMITS,
  classificationSchema,
  compareFormats,
  decode,
  decodeTransferPayload,
  encode,
  handoverTaskSchema,
  operationSchema,
  transferFormatSchema,
  validate,
  type ContextClassification,
  type CtlLimits,
  type DictionaryMode,
  type EncodeOptions,
  type FormatComparison,
  type HandoverTask,
  type Operation,
  type TransferFormat,
  type ValidationFailure,
  type ValidationResult,
  type ValidationSuccess
} from '@lcherone/ctl2';
```

## `encode(task, options?)`

```ts
function encode(task: HandoverTask, options?: EncodeOptions): string;
```

Validates a complete task, applies resource limits, builds the requested payload-local dictionary, and returns canonical CTL2.

Input:

```ts
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
```

Output:

```text
C2|d:|i:demo-1|t:Fix+parser|o:f|g:Reject+invalid+input.|x:src/parser.ts|r:Preserve+API|a:Tests+pass|c:|v:npm+test|u:|e:|k:p
```

Options:

```ts
type DictionaryMode = 'compact' | 'abstract';

interface EncodeOptions {
  dictionaryMode?: DictionaryMode;
}
```

- `compact` is the default and uses a word only when the complete encoded payload gets smaller.
- `abstract` assigns deterministically shuffled codes to repeated words up to the fixed dictionary limit.

Throws:

- `ZodError` when the task violates the strict schema;
- `Error` for invalid runtime options;
- `Error` when an input or generated payload exceeds a resource limit;
- `Error` when source text contains a malformed unpaired UTF-16 surrogate.

## `decode(payload)`

```ts
function decode(payload: string): HandoverTask;
```

Accepts canonical CTL2 beginning with `C2|` or canonical legacy CTL1 beginning with `CTL1|`. It rejects malformed, reordered, incomplete, oversized, or semantically invalid input.

```ts
const task = decode(payload);
console.log(task.id); // demo-1
```

Throws `Error` for wire-format failures and `ZodError` when the decoded values violate the task schema.

## `validate(payload)`

```ts
function validate(payload: string): ValidationResult;

type ValidationResult = ValidationSuccess | ValidationFailure;
```

This is the non-throwing CTL input API:

```ts
const result = validate(payload);

if (result.valid) {
  // result is ValidationSuccess
  console.log(result.task);
} else {
  // result is ValidationFailure
  console.error(result.errors);
}
```

Success:

```ts
interface ValidationSuccess {
  valid: true;
  task: HandoverTask;
  errors: [];
}
```

Failure:

```ts
interface ValidationFailure {
  valid: false;
  task?: undefined;
  errors: string[];
}
```

The current implementation reports one error because decoding stops at the first unsafe or malformed condition. Callers should not parse error-message text as a stable machine protocol.

## `decodeTransferPayload(format, payload)`

```ts
function decodeTransferPayload(format: TransferFormat, payload: string): HandoverTask;
```

Supported formats:

- `ctl`: canonical compact CTL2;
- `ctl-abstract`: canonical abstract-dictionary CTL2;
- `json`: minified or formatted JSON matching `handoverTaskSchema`.

Both CTL modes use `decode()` because dictionary mode does not change the wire grammar. JSON input is parsed and passed through the strict task schema.

```ts
const task = decodeTransferPayload('json', JSON.stringify(input));
```

Untyped JavaScript callers receive an explicit error for unsupported formats rather than an implicit CTL fallback.

## `compareFormats(task)`

```ts
function compareFormats(task: HandoverTask): FormatComparison;
```

Returns all supported output representations and exact UTF-8 byte counts:

```ts
interface FormatComparison {
  ctl: string;
  abstractCtl: string;
  json: string;
  ctlBytes: number;
  abstractCtlBytes: number;
  jsonBytes: number;
}
```

Example:

```ts
const comparison = compareFormats(task);

console.table({
  ctl: comparison.ctlBytes,
  abstractCtl: comparison.abstractCtlBytes,
  json: comparison.jsonBytes
});
```

CTL2 is not guaranteed to be smaller than JSON for every possible task. This helper measures rather than assumes.

## Runtime schemas

### `handoverTaskSchema`

Strict Zod schema for the complete `HandoverTask`. It rejects unknown properties. Each schema and field carries a human-readable `.description` for schema-aware tooling.

```ts
const parsed = handoverTaskSchema.parse(untrustedObject);
```

Aggregate text and list limits are also enforced by the encoder and decoder because they apply across fields.

### `operationSchema`

Accepts `implement`, `fix`, `refactor`, `review`, or `test`.

### `classificationSchema`

Accepts `public`, `internal-approved`, or `restricted`. The value is metadata; the codec does not implement an authorization policy.

### `transferFormatSchema`

Accepts `ctl`, `ctl-abstract`, or `json`.

## `CTL_LIMITS`

Read-only object containing the limits enforced by encoding and decoding:

```ts
interface CtlLimits {
  readonly maxPayloadBytes: number;
  readonly maxDecodedBytes: number;
  readonly maxDictionaryEntries: number;
  readonly maxListItems: number;
  readonly maxDictionaryReferences: number;
}
```

The object is frozen at runtime. Limits are not configurable in the current protocol because two peers with different limits could disagree about whether a payload is valid.

## Error handling guidance

At a trusted internal boundary, direct exceptions are often appropriate:

```ts
try {
  const task = decode(payload);
  await dispatch(task);
} catch (error) {
  logger.warn({ error }, 'Rejected CTL task');
}
```

At an untrusted input boundary, prefer `validate()` so malformed input is an expected result rather than exceptional control flow.

Do not reveal raw payloads in logs when task content may be sensitive. Log a request identifier, declared format, byte length, codec version, and a sanitized error category instead.
