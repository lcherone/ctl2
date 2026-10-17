# Testing strategy

CTL2 uses layered checks so source correctness, protocol compatibility, packaged output, documentation, and hosted automation remain separate evidence.

## Local commands

| Command | Purpose |
| --- | --- |
| `npm run lint` | Lint TypeScript, JavaScript, and required JSDoc |
| `npm run lint:docs` | Lint repository Markdown |
| `npm run typecheck` | Strict TypeScript validation without emitting files |
| `npm run docs:check` | Validate public API documentation links and coverage |
| `npm test` | Run focused unit, compatibility, schema, limit, and fuzz tests |
| `npm run test:coverage` | Run tests and enforce coverage thresholds |
| `npm run build` | Produce ESM, CommonJS, source maps, and declarations |
| `npm run test:types` | Compile ESM and CommonJS consumers through conditional declaration exports |
| `npm run test:package` | Exercise built exports and checked-in examples |
| `npm run test:tarball` | Install the exact tarball in isolation and test runtime and declaration consumers |
| `npm run package:check` | Validate package metadata and export layout |
| `npm run check` | Run the complete local quality gate in dependency order |
| `npm pack --dry-run` | Show the exact files that would be published |

## Test layers

### Canonical encoding

An exact multilingual fixture detects changes to field order, escaping, dictionary ranking, tokens, or punctuation handling. A change to that fixture requires a protocol compatibility explanation.

### Semantic round trips

Tests prove compact and abstract payloads decode to the complete original task and re-encode to the same canonical bytes.

### Enum coverage

Every operation and classification value is checked against its wire token in CTL2 and legacy CTL1.

### Unicode and delimiters

Focused cases cover Unicode letters, emoji, astral characters, Windows and POSIX paths, whitespace, and every protocol delimiter.

### Malformed input

Tests cover unknown versions and fields, missing separators, reordered tokens, malformed escapes, invalid and duplicate dictionary entries, unknown references, invalid JSON, and unsupported runtime options.

### Resource limits

Tests exercise payload bytes, aggregate decoded expansion, dictionary entry caps, dictionary references, list cardinality, and excessive source text. The encoder is tested against the decoder's own limits so it cannot emit self-invalid output.

### Deterministic generation

A fixed-seed generator creates 1,000 tasks containing Unicode and reserved characters. Every task is round-tripped and canonically re-encoded in compact and abstract modes. The fixed seed makes failures reproducible.

### Package surface

After the build, Node's native test runner loads both `dist/index.js` and `dist/index.cjs`. Executable examples import the package through its self-reference, which exercises the declared `exports` map rather than a source-relative shortcut.

### Application integration

Downstream applications should retain their own canonical and behaviour tests. Package tests prove the codec contract; they do not prove application policy, UI, persistence, or transport behaviour.

## Coverage policy

Coverage is a regression signal, not the definition of correctness. The repository enforces high statement, function, and line thresholds plus a realistic branch floor. Canonical fixtures, malformed cases, and limit tests remain mandatory even when a line is already covered.

## Hosted CI

The main CI workflow runs the complete quality gate on supported current Node build versions, performs a dependency audit, and checks the publishable tarball.

Additional workflows provide:

- CodeQL static analysis for JavaScript and TypeScript;
- pull-request dependency review;
- release-triggered GitHub Packages publication;
- Dependabot updates for npm and GitHub Actions dependencies.

Hosted checks prove the repository state on GitHub. A local pass alone does not prove that a workflow ran or that a package was published.

## Adding protocol behaviour

Any new wire behaviour should include:

1. a valid exact input/output example;
2. semantic round-trip coverage;
3. deterministic re-encoding coverage;
4. malformed and truncated counterparts;
5. resource-limit analysis;
6. CTL1 or older-version compatibility analysis;
7. public documentation and changelog updates.
