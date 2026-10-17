# Production adoption guide

This guide covers the application boundary around CTL2. It does not replace organisation-specific security, privacy, retention, or authorization requirements.

## Choose the boundary

CTL2 should sit after task construction and policy checks, but before transport or persistence:

```text
user or planner
    │
    ▼
canonical HandoverTask
    │
    ├── authorization
    ├── classification
    ├── secret scanning
    └── scope review
    │
    ▼
encode(task)
    │
    ├── store
    ├── sign
    └── transport
```

Do not scan only the compact payload for secrets or policy violations. Dictionary references change surface text but not meaning.

## Pin a release

For public Git installation, pin an immutable tag:

```json
{
  "dependencies": {
    "@lcherone/ctl2": "github:lcherone/ctl2#v0.3.0"
  }
}
```

Commit the application lockfile and verify that it resolves the expected repository commit.

For GitHub Packages, configure the `@lcherone` scope and pin an exact version. GitHub's npm registry requires client authentication even when package metadata is publicly visible.

## Validate producer input

Use the exported schema when task data comes from forms, models, files, or APIs:

```ts
const task = handoverTaskSchema.parse(candidate);
authorize(task);
scanForSecrets(task);

const payload = encode(task);
```

The encoder validates again. The explicit boundary validation is still useful because it separates malformed task construction from serialization failure.

## Validate consumer input

For an expected untrusted-input path:

```ts
const result = validate(incoming.payload);

if (!result.valid) {
  metrics.increment('ctl.rejected');
  return rejectRequest(result.errors[0]);
}

authorize(result.task);
await dispatch(result.task);
```

For internal exception-oriented code, use `decode()` inside a narrow `try`/`catch`.

Decoding proves syntax and task shape. It does not prove who created the payload or whether that creator was allowed to request the task.

## Preserve format metadata

For long-lived storage, keep an envelope outside CTL2:

```json
{
  "format": "ctl",
  "codec": "@lcherone/ctl2",
  "codecVersion": "0.1.0",
  "createdAt": "2026-10-17T20:00:00.000Z",
  "payload": "C2|d:|i:demo-1|..."
}
```

Add your own authenticated signature or message authentication code when tampering matters. Sign the exact payload bytes plus any envelope fields whose integrity matters.

## Logging and observability

Recommended metrics:

- encoded and decoded payload byte distributions;
- chosen format and dictionary mode;
- validation rejection count by sanitized category;
- encode/decode latency percentiles;
- legacy CTL1 decode volume during migration.

Avoid logging raw payloads by default. They may contain source code, paths, internal identifiers, or restricted context.

An operational log can safely include:

```ts
logger.info({
  taskId: task.id,
  format: 'ctl',
  bytes: new TextEncoder().encode(payload).byteLength,
  codecVersion
}, 'Task encoded');
```

Whether `task.id` itself is safe to log depends on the application.

## Error responses

Do not expose stack traces or complete rejected payloads to remote callers. Map failures to an application error such as `invalid_task_payload`, retain the original exception in protected diagnostics, and include a correlation identifier.

Human-readable messages returned by `validate()` are diagnostic text, not stable error codes. Do not branch application logic on exact wording.

## Performance

The encoder and decoder are linear over task text plus dictionary/reference processing within fixed limits. Dictionary lookup uses `Map`.

Use `compareFormats()` only when an application actually needs every representation; it intentionally performs two encodes and one JSON serialization. For a known format, call `encode()` once and reuse its result.

## Browser use

The ESM runtime uses standards available in modern browsers: `TextEncoder`, `encodeURIComponent`, `decodeURIComponent`, `Map`, Unicode regular expressions, and `String.prototype.matchAll`.

The package performs no network, storage, filesystem, process, or credential access. Applications remain responsible for protecting task data in browser memory, logs, analytics, and transport.

## Migration and upgrades

Before upgrading:

1. Read the changelog and compatibility notes.
2. Run your production fixtures through both installed versions.
3. Compare canonical bytes when signatures, hashes, or deduplication depend on them.
4. Confirm stored CTL1 and CTL2 samples still decode.
5. Deploy decoder compatibility before emitting a new wire version.
6. Monitor rejection rates and legacy decode volume.

Never rewrite stored payloads in place without preserving the original and proving semantic equality.

## Threat boundary

CTL2 addresses malformed serialization and bounded decoding. It does not address:

- malicious but schema-valid task instructions;
- caller identity or authorization;
- prompt injection or model behaviour;
- transport confidentiality or integrity;
- retention, deletion, or regulatory compliance;
- secrets already placed in task fields.

See [SECURITY.md](../SECURITY.md) for vulnerability reporting and the supported security boundary.
