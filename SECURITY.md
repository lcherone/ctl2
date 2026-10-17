# Security policy

## Supported versions

Security fixes are applied to the latest released minor version. Until version 1.0, a security fix may include a documented compatibility change when safely accepting the old behaviour is not possible.

## What CTL2 does and does not protect

CTL2 validates a fixed task schema, uses canonical field ordering, rejects malformed input, and enforces resource limits before potentially large decoding work.

CTL2 is not encryption, authentication, authorization, signing, sandboxing, secret scanning, or a content-policy system. Anyone who can read a payload can recover its content. Applications must inspect and authorize the canonical task before encoding it and must not interpret compact dictionary tokens as a privacy boundary.

Treat payloads as untrusted input. Catch decode errors, retain the default limits, and apply transport-level integrity protection when payload tampering matters.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for `lcherone/ctl2` rather than opening a public issue. Include the affected version, a minimal reproduction, the expected impact, and any suggested mitigation.
