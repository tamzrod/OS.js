# Security Baseline Evidence Contract

This directory defines how G1 security-baseline evidence is identified, generated, validated, retained, and compared. It does not contain the large machine outputs themselves unless a later task explicitly approves a small committed fixture.

## Toolchain contract

All G1 evidence is generated with:

```text
Node.js v26.13.0
npm 11.20.0
```

Evidence produced by a different toolchain is not comparable baseline evidence and must use a separate manifest with an explanation.

## Source identity

Every evidence run records:

- Full 40-character Git commit.
- Whether the worktree was dirty.
- SHA-256 of normalized `git status --porcelain=v1` output when dirty.
- SHA-256 of `package-lock.json`.
- UTC start and finish timestamps.
- Operating system and CPU architecture.
- Exact Node and npm versions.
- npm registry URL.
- Commands, arguments, exit codes, and result classifications.
- Artifact media type, byte size, SHA-256, and retention location.

Evidence generated from a dirty worktree may be used during development but cannot satisfy the final G1 or release gate. Release evidence must set `source.dirty` to `false`.

## Files

- [`manifest.schema.json`](manifest.schema.json) defines the required JSON structure.
- [`example.manifest.json`](example.manifest.json) is syntactically and semantically valid example data, not real evidence.
- [`../../../../scripts/security/validate-evidence-manifest.js`](../../../../scripts/security/validate-evidence-manifest.js) validates one or more manifests without adding a package dependency.

## Artifact naming

Use this format:

```text
YYYYMMDDTHHMMSSZ_<commit12>_<lock12>_<kind>[_<scope>].<extension>
```

Allowed characters are lowercase ASCII letters, digits, `.`, `_`, and `-`. Timestamps are UTC. `commit12` and `lock12` are the first 12 hexadecimal characters of their full values.

Examples:

```text
20261109T090000Z_0aa874455e1c_d086b6df8d81_npm-audit_full.json
20261109T090000Z_0aa874455e1c_d086b6df8d81_npm-audit_production.json
20261109T090000Z_0aa874455e1c_d086b6df8d81_sbom_full.cdx.json
20261109T090000Z_0aa874455e1c_d086b6df8d81_build_log.txt
```

The manifest filename uses the same prefix and ends in `_manifest.json`.

## Required artifact set

G1 must eventually produce:

| Kind | Scope | Media type | Producing task |
|---|---|---|---|
| `install-log` | `scripts-disabled` | `text/plain` | T1.4 |
| `install-log` | `scripts-enabled` | `text/plain` | T1.4 |
| `npm-audit` | `full` | `application/json` | T1.4 |
| `npm-audit` | `production` | `application/json` | T1.4 |
| `sbom` | `full` | `application/vnd.cyclonedx+json` | T1.5 |
| `sbom` | `production` | `application/vnd.cyclonedx+json` | T1.5 |
| `dependency-inventory` | `full` | `application/json` | T1.3/T1.6 |
| `dependency-classification` | `full` | `application/json` | T1.6 |
| `package-discovery-log` | `full` | `text/plain` | T1.6 |
| `build-log` | `full` | `text/plain` | T1.6 |

## Result classifications

Command execution and policy outcome are separate:

- `pass` — command completed and its policy gate passed.
- `findings` — command completed and produced valid findings, such as `npm audit` returning exit code 1 because vulnerabilities exist.
- `expected-failure` — command failed in the already documented way, such as the legacy Webpack OpenSSL error.
- `unexpected-failure` — command did not produce valid expected evidence or failed differently.

An audit exit code of 1 is not converted to zero. The harness preserves the exit code, validates the JSON, and classifies the result as `findings`. An expected build failure is preserved and classified as `expected-failure`. Either classification can complete evidence collection but cannot satisfy a security or successful-build gate.

## Command capture requirements

For each command:

1. Record the exact executable and argument array; do not store only a shell-form string.
2. Capture standard output and standard error without truncation.
3. Preserve the real exit code.
4. Validate structured output before classifying it.
5. Hash the final artifact after the command closes it.
6. Record artifact byte size and link it from `artifactIds`.
7. Treat missing output, invalid JSON, or an unrecognized failure as `unexpected-failure`.

Secrets, authentication headers, tokens, home-directory paths, and registry credentials must not appear in artifacts. Run evidence jobs without production credentials.

## Retention

### Committed to the repository

- This contract, schema, validator, and example.
- Small human-readable summaries for T1.3–T1.6.
- The final evidence manifest with artifact hashes and CI references.
- Decisions and exception records.

### Retained as CI artifacts

- Raw audit JSON.
- Full and production SBOM JSON.
- Install, discovery, and build logs.
- Full inventories and classifications when too large for review-friendly source control.

CI artifacts must use the maximum configured retention available to the repository. Before that retention expires, evidence supporting a release must be copied to the project's durable release archive. A manifest is invalid as release evidence if its referenced artifact is no longer retrievable.

## Validation

Validate the included example:

```sh
node scripts/security/validate-evidence-manifest.js \
  docs/evidence/security-baseline/example.manifest.json
```

Validate generated manifests the same way before hashing or publishing them. The validator enforces project-specific invariants in addition to the JSON Schema, including exact tool versions, filename identity prefixes, unique IDs, and valid command-to-artifact references.

## Comparison rules

Two runs are directly comparable only when they have the same:

- Source commit, unless the comparison explicitly studies a source change.
- Lockfile SHA-256, unless the comparison explicitly studies lockfile migration.
- Node and npm versions.
- Registry URL.
- Command argument array and evidence scope.

When one of these differs, the summary names the difference and explains why comparison remains meaningful.
