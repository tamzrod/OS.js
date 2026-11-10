# P2 G1 — Baseline Reproducibility Plan

**Roadmap:** [`RM-SEC-001`](../processing/roadmap/security-risk-patching.md)  
**Goal:** G1 — Freeze and reproduce the baseline  
**Process:** P2 — Design / Design the Approach  
**Input:** [`P1 G1 Baseline Reproducibility Analysis`](p1-g1-baseline-reproducibility-analysis.md)  
**Plan date:** 2026-11-09  
**Status:** P2 exit gate satisfied

## Goal outcome

A clean environment can reproduce a documented dependency installation and security-evidence set from an exact commit and lockfile using pinned, supported tools. The evidence must record the legacy build failure honestly and must not enable `--openssl-legacy-provider`.

## Decisions

### D1 — Supported runtime

Use **Node.js 26.13.0 LTS (Lithium)** as the exact G1 development and CI runtime.

Rationale:

- Node 26 is the current LTS line as of 2026-11-09.
- Node 26.13.0 is the first LTS-labelled release in the line and is supported through April 2029.
- Selecting the current LTS avoids creating new work on Node 24 just as Node 26 becomes the production LTS target.
- Node 27 is an Alpha release and is not a production target.
- The repository's Node 10–16 environments are end-of-life and cannot be accepted as the supported security baseline.

The runtime will be pinned in `.nvmrc` and CI. `package.json` will declare a bounded engine range of `>=26.13.0 <27` so unsupported future majors do not appear compatible.

Official basis: [Node.js release status](https://nodejs.org/en/about/previous-releases) and [Node.js 26.13.0 LTS release](https://nodejs.org/en/blog/release/v26.13.0).

### D2 — Package manager

Use **npm 11.20.0**, the version bundled with Node 26.13.0.

Enforce the contract with:

- `packageManager: "npm@11.20.0"`.
- `engines.npm: "11.20.0"`.
- `devEngines.runtime` and `devEngines.packageManager` configured with `onFail: "error"`.
- A CI version assertion before installation.

This avoids a second package-manager installation step and makes local and CI lockfile behavior comparable. The bundled version is recorded in the [Node 26.13.0 download archive](https://nodejs.org/en/download/archive/v26.13.0). npm documents `devEngines` as the source-interaction guard and `engines` as the consumer compatibility declaration in its [`package.json` documentation](https://docs.npmjs.com/cli/configuring-npm/package-json/).

### D3 — Lockfile migration

Preserve the current v1 lockfile identity in the P1 evidence:

```text
SHA-256 d086b6df8d81fba827c138aac6a194a923b58bf2eb1d47760766e01aa580d726
commit  0aa874455e1ca5a31e7be193b3be14080300c2c1
```

Then migrate the active lockfile with the pinned Node/npm toolchain in one dedicated task. The migration must:

1. Generate a normalized before-inventory of package name, version, resolved source, integrity, dependency type, and path.
2. Upgrade only the lockfile representation and supplemental metadata.
3. Generate the same after-inventory.
4. Fail if package versions, resolved sources, integrity values, or dependency classifications drift unexpectedly.
5. Run `npm ci` twice from clean states and confirm the lockfile checksum is unchanged by installation.

The original file does not need to be duplicated in the repository because Git preserves it at the baseline commit; the committed P1 analysis preserves its identity. Any necessary dependency upgrade belongs to a later security goal or an explicitly added remediation task, not a hidden lockfile-format migration.

### D4 — Install and script policy

Use `npm ci` as the only normal clean-install command. G1 will capture two modes:

- `npm ci --ignore-scripts` for dependency inventory, audit, and lockfile inspection with reduced install-script exposure.
- `npm ci` in an isolated CI job to establish whether required lifecycle scripts are present and reproducible.

The unrestricted install must run without credentials or production data. Unexpected lifecycle scripts are evidence requiring review, not a reason to silently allow them.

### D5 — Evidence format and location

Commit human-readable summaries under:

```text
docs/evidence/security-baseline/
```

Retain large or time-sensitive machine outputs as CI artifacts tied to the exact commit. Each evidence manifest must record:

- UTC timestamp.
- Git commit and dirty/clean state.
- `package-lock.json` SHA-256.
- OS and architecture.
- Exact Node and npm versions.
- Registry identity.
- Command and exit code.
- Output artifact name and SHA-256.

Required evidence outputs:

- Full `npm audit --json`.
- Production-only `npm audit --omit=dev --json`.
- Full CycloneDX SBOM.
- Production-only CycloneDX SBOM.
- Normalized dependency inventory and classification.
- Install logs.
- Package-discovery and build logs.
- Evidence manifest containing hashes.

### D6 — SBOM standard

Use npm's native `npm sbom` command and **CycloneDX JSON**, with the project represented as an application:

```sh
npm sbom --sbom-format=cyclonedx --sbom-type=application
npm sbom --omit=dev --sbom-format=cyclonedx --sbom-type=application
```

This introduces no extra SBOM generator into the legacy dependency graph. npm supports both full-tree and omitted dependency modes and documents CycloneDX output in [`npm sbom`](https://docs.npmjs.com/cli/v11/commands/npm-sbom/).

### D7 — Build result

G1 does not repair Webpack. It must reproduce and retain the build result under Node 26.13.0/npm 11.20.0.

Expected current outcome:

- Package discovery succeeds.
- Webpack 4 build fails with `ERR_OSSL_EVP_UNSUPPORTED`.
- No legacy OpenSSL flag is used.

If the outcome differs, the difference is analyzed before proceeding. G4 owns the successful modern build outcome.

### D8 — Dependency and artifact classification

Classify packages into:

- Browser runtime.
- Server runtime.
- CLI/runtime tooling currently listed as production.
- Build and development tooling.
- Optional dependencies.
- Unknown or mixed-use dependencies requiring later investigation.

G1 produces the inventory and boundary evidence. It does not restructure the packages; G5 and G6 own server reduction and browser-only packaging.

## Ordered implementation approach

### Step 1 — Enforce the tooling contract

Add `.nvmrc`, bounded `engines`, `packageManager`, `devEngines`, and CI version assertions for Node 26.13.0/npm 11.20.0. Document `libatomic` as a Linux prerequisite where the official Node 26 binary requires it.

### Step 2 — Establish evidence identity

Add the evidence directory convention, manifest schema, baseline commit/lockfile identity, commands, and retention rules before generating outputs.

### Step 3 — Migrate the lockfile with drift controls

Inventory the v1 graph, migrate under pinned tooling, compare inventories, review the diff, and verify repeated `npm ci` does not alter the migrated lockfile.

### Step 4 — Capture install and audit evidence

Run isolated clean installs, full and production audits, and record exact commands, exit codes, counts, logs, and hashes. Audit commands are expected to exit non-zero while findings remain; evidence capture distinguishes a successful audit execution from a passing security gate.

### Step 5 — Generate SBOMs

Create full and production-only CycloneDX SBOMs and validate that both parse as JSON, identify the root application, and have artifact hashes in the evidence manifest.

### Step 6 — Classify dependencies and record the build baseline

Produce the dependency-boundary inventory, run package discovery and build without the OpenSSL workaround, retain the outputs, and publish a G1 completion summary.

## Proposed P3 micro-task boundaries

| Task | Purpose | Primary change surface | Depends on |
|---|---|---|---|
| `T1.1` | Enforce Node 26.13.0/npm 11.20.0 consistently. | `.nvmrc`, `package.json`, CI runtime configuration, runtime documentation. | P2 decisions D1–D2. |
| `T1.2` | Define baseline evidence structure and manifest contract. | `docs/evidence/security-baseline/`, evidence documentation or scripts. | T1.1. |
| `T1.3` | Migrate the v1 lockfile without dependency graph drift and prove repeatable `npm ci`. | `package-lock.json`, graph-inventory tooling, migration evidence. | T1.1–T1.2. |
| `T1.4` | Capture clean-install and dated full/production audit evidence. | CI evidence artifacts and committed summary. | T1.3. |
| `T1.5` | Generate and validate full/production CycloneDX SBOMs. | CI evidence artifacts and committed summary. | T1.3. |
| `T1.6` | Classify dependency boundaries, capture the build result, and evaluate the G1 exit condition. | Inventory, build evidence, G1 completion summary. | T1.4–T1.5. |

These tasks are sequential where they share the lockfile or evidence manifest. T1.4 and T1.5 may be independently executed after T1.3, but only one task remains active by default under the process control rule.

## Rollback and failure handling

- Runtime pinning changes can be reverted independently if Node 26 introduces a platform blocker; any replacement must still be an active LTS line and requires a recorded decision.
- Lockfile migration is isolated in T1.3. If graph equivalence cannot be demonstrated, revert that task and redesign the migration rather than accepting silent drift.
- Registry or advisory unavailability blocks evidence collection; stale cached output cannot substitute for a dated audit.
- A changed build failure is investigated and recorded. It does not authorize an OpenSSL workaround.
- Evidence generation must not modify source, manifest, or lockfile. Any such modification fails the task.

## Verification design

G1 verification will prove:

1. Tool versions match the declared contract.
2. The lockfile is unchanged by repeated clean installation.
3. Normalized dependency inventories show no unintended migration drift.
4. Audit JSON is valid and its summary matches the committed human-readable record.
5. Both SBOMs are valid JSON and identify the same root application/commit.
6. The dependency classification accounts for every installed package.
7. Package discovery and the build produce a retained, explained result without legacy OpenSSL mode.
8. Evidence artifacts are hashed and traceable to the source commit and lockfile.

## P2 exit-gate evaluation

| Gate | Result |
|---|---|
| The approach contributes directly to G1's analyzed outcome. | Pass — every step establishes or proves the reproducibility contract. |
| Step order reflects real dependencies. | Pass — tooling and evidence contracts precede lockfile migration and generated evidence. |
| G1 has an observable exit condition. | Pass — clean environment, exact graph/evidence, pinned tools, and recorded build result. |
| Verification and release gates are defined. | Pass — see Verification design and the roadmap success criteria. |
| The plan does not silently expand scope. | Pass — Webpack repair, cookie/merge remediation, server reduction, and browser packaging remain assigned to later goals. |

## P2 decision

**Advance G1 to P3 — Divide / Break Down the Work.**

P3 will create one bounded micro-task record for T1.1 through T1.6 using the approved boundaries above. No source or lockfile implementation begins during P2.
