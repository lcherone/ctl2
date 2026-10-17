# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| Latest release | Yes |
| Older releases | No |

Security fixes are applied to the latest released version. Until version 1.0, a security fix may include a documented compatibility change when safely accepting the old behaviour is not possible.

## What CTL2 does and does not protect

CTL2 validates a fixed task schema, uses canonical field ordering, rejects malformed input, and enforces resource limits before potentially large decoding work.

CTL2 is not encryption, authentication, authorization, signing, sandboxing, secret scanning, or a content-policy system. Anyone who can read a payload can recover its content. Applications must inspect and authorize the canonical task before encoding it and must not interpret compact dictionary tokens as a privacy boundary.

Treat payloads as untrusted input. Catch decode errors, retain the default limits, and apply transport-level integrity protection when payload tampering matters.

The intended security properties are:

- exact field ordering and strict schema validation;
- rejection of unknown tokens, references, versions, and malformed escapes;
- bounded encoded bytes, decoded bytes, dictionary entries, references, and lists;
- no filesystem, process, credential, storage, or network access in the runtime;
- no evaluation or execution of decoded task text.

Out of scope:

- malicious but schema-valid task instructions;
- prompt injection and model behaviour;
- caller identity, authorization, or policy enforcement;
- confidentiality, integrity, signing, and key management;
- secrets already present in task fields;
- application logging, storage, transport, and retention.

## Reporting a vulnerability

Please use [GitHub private vulnerability reporting](https://github.com/lcherone/ctl2/security/advisories/new) rather than opening a public issue. Include:

- the affected package version and runtime;
- a minimal payload or reproduction;
- the expected confidentiality, integrity, or availability impact;
- whether the issue bypasses a documented limit or invariant;
- any known workaround or suggested mitigation.

Do not include real secrets, customer data, or private production payloads. A sanitized reproduction is sufficient.

## Dependency and release checks

The package has one runtime dependency, Zod. The exact npm version is declared in `package.json`, and the only approved dependency install script is the version-pinned `esbuild` binary installer used by the build toolchain. Other dependency install scripts remain blocked by default under npm 11.

CI runs the full test suite, package checks, dependency auditing, dependency review, and CodeQL analysis. A release is published only from a GitHub release event after the complete local-quality command passes in the release workflow.
