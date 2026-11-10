# P1 G1 — Baseline Reproducibility Analysis

**Roadmap:** [`RM-SEC-001`](../processing/roadmap/security-risk-patching.md)  
**Goal:** G1 — Freeze and reproduce the baseline  
**Process:** P1 — Discover / Understand the Problem  
**Baseline commit:** `0aa874455e1ca5a31e7be193b3be14080300c2c1`  
**Assessment date:** 2026-11-09  
**Status:** P1 exit gate satisfied

## Problem statement

The committed OS.js 3.1.12 baseline cannot be reproduced as a supported, secure build because the repository does not define one authoritative runtime/toolchain contract, its npm v1 lockfile requires current registry metadata, and its Webpack 4 build fails on the current Node runtime without the prohibited legacy OpenSSL workaround.

## Why this goal exists

Security remediation needs a stable point of comparison. Without a reproducible baseline, dependency changes cannot be attributed confidently, build output cannot be compared reliably, audit evidence cannot be tied to a defined environment, and regressions can be mistaken for pre-existing behavior.

G1 does not attempt to make the legacy baseline safe for release. It establishes a controlled and evidenced starting point from which later security goals can proceed.

## Current-state evidence

### Source identity

- Git commit: `0aa874455e1ca5a31e7be193b3be14080300c2c1`.
- Commit date: 2022-09-16.
- Package identity: `@osjs/osjs@3.1.12`.
- Committed lockfile SHA-256: `d086b6df8d81fba827c138aac6a194a923b58bf2eb1d47760766e01aa580d726`.
- The repository currently contains uncommitted documentation and processing artifacts; the reproduction experiment therefore used a clean `git archive` of the baseline commit.

### Conflicting runtime contracts

The repository gives incompatible or incomplete runtime guidance:

| Source | Declared runtime behavior |
|---|---|
| `package.json` | `node >=10.0.0`, with no upper bound. This claims compatibility with modern Node versions that the build does not have. |
| `.github/workflows/node.yml` | Tests Node 12, 13, 14, 15, and 16 on old GitHub Actions versions. Every listed Node release is end-of-life. |
| `.github/workflows/test.yml` | Uses Node 13 and runs `npm install`, not the deterministic `npm ci` path used by the build workflow. |
| `Dockerfile` | Uses unpinned `node:10` and globally installs unpinned `nodemon`. |
| `README.md` | Says Node 10 or later but explicitly notes Node 17 is unsupported without a workaround. |
| Runtime pinning | No `.nvmrc`, `.node-version`, `.tool-versions`, package-manager pin, or equivalent authoritative version file exists. |

The result is that two developers can reasonably choose different runtimes while both believing they followed the repository instructions.

### Lockfile behavior

`package-lock.json` uses `lockfileVersion: 1`. A clean install with Node 24.16.0 and npm 11.13.0 emitted npm's `old lockfile` warning and fetched supplemental metadata from the npm registry before installation.

The lockfile checksum did not change during the experiment, and npm installed 1,387 packages. However, requiring live supplemental metadata means the operation is not fully self-describing from the repository alone. Audit output also depends on the advisory database at execution time and must be timestamped rather than treated as immutable build output.

The clean install completed with extensive deprecation warnings and reported 130 vulnerabilities: 10 critical, 49 high, 58 moderate, and 13 low. This count differs from the earlier direct audit snapshot because registry advisory data is time-dependent; the discrepancy reinforces the requirement to retain exact audit JSON with the commit and tool versions.

### Build experiment

Environment:

```text
Node v24.16.0
npm 11.13.0
clean source archive of commit 0aa87445
npm ci --ignore-scripts
```

Results:

1. `npm ci --ignore-scripts` completed.
2. `npm run package:discover` completed and discovered 11 packages.
3. `npm run build` failed in Webpack 4 with `ERR_OSSL_EVP_UNSUPPORTED` from `crypto.createHash`.
4. No `--openssl-legacy-provider` flag was used because the security roadmap explicitly prohibits adopting that workaround.

The experiment proves that the unbounded `node >=10` engine declaration is inaccurate for the current runtime. It also establishes that install success alone is not a reproducible-build result.

### CI reproducibility gaps

- CI actions and Node versions are obsolete.
- Lint and build workflows use different install commands.
- CI does not pin npm independently from Node.
- CI does not retain audit JSON, an SBOM, build hashes, or an artifact inventory.
- No clean-build checksum or reference artifact is defined.
- No CI job represents a supported modern runtime.
- The development container is not reproducible because its base image and globally installed tool are not pinned by digest/version.

## Affected people and systems

- Developers need one supported environment that behaves consistently.
- CI needs deterministic installation and evidence tied to an exact commit.
- Security reviewers need comparable dependency, audit, and SBOM snapshots.
- Release owners need proof that the tested artifact is the artifact being evaluated.
- Later roadmap goals depend on a baseline that separates existing failures from remediation regressions.

## Scope boundaries

### In scope for G1

- Choose and document one supported Node LTS and npm version.
- Add machine-readable runtime/package-manager pinning.
- Make clean installation deterministic enough for repeatable CI.
- Define baseline audit and SBOM evidence tied to a commit and lockfile.
- Classify shipped, development, optional, and build-only dependencies.
- Record the legacy build failure without enabling legacy OpenSSL mode.

### Out of scope for G1

- Upgrading Webpack or making the application build successfully on modern Node; that belongs to G4.
- Removing `js-cookie`; that belongs to G2.
- Replacing unsafe merge paths; that belongs to G3.
- Modernizing the official server; that belongs to G5.
- Claiming that the baseline is safe to deploy.
- Using `--openssl-legacy-provider` as a supported solution.

## Constraints

- The baseline contains known high and critical vulnerabilities and must remain isolated from production data and public exposure.
- Runtime selection must use an actively supported Node LTS, not one of the repository's historical CI versions.
- Regenerating the lockfile can substantially change the dependency graph and audit result; it must be an intentional, reviewed change.
- The chosen baseline procedure must distinguish installation reproducibility from successful application compilation.
- Evidence must identify its commit, lockfile checksum, Node version, npm version, command, date, and result.

## Material unknowns for P2

These unknowns do not prevent understanding the problem, but the plan must resolve them:

- Which active Node LTS line will be the fork's supported target.
- Whether npm bundled with that Node line is acceptable or must be pinned separately.
- Whether the v1 lockfile should first be archived as evidence and then regenerated, or migrated in a separate controlled change.
- Which SBOM format and generator will become the project standard.
- Which files constitute the browser, server, and build-only artifact boundaries.
- Whether a legacy runtime container is needed solely to capture a reference build before G4, and how it can be isolated safely.

## Desired state

G1 is complete when a clean environment can reproduce a documented dependency installation and security-evidence set from the exact committed configuration, using pinned supported tools, while recording the legacy build incompatibility honestly rather than bypassing it.

The reproducibility contract must include:

- Exact source commit and lockfile checksum.
- Pinned supported Node and npm versions.
- One documented clean-install command.
- Full and production-only audit JSON.
- A machine-readable SBOM.
- Dependency classification and artifact boundaries.
- A recorded build result and known incompatibilities.
- Retained evidence suitable for comparison after later roadmap goals.

## P1 exit-gate evaluation

| Gate | Result |
|---|---|
| The problem can be stated in one testable sentence. | Pass — see Problem statement. |
| Evidence demonstrates the current condition. | Pass — source, runtime contracts, clean install, and build failure are recorded. |
| In-scope and out-of-scope boundaries are explicit. | Pass — see Scope boundaries. |
| Material unknowns are resolved or recorded as risks. | Pass — unresolved planning choices are listed for P2. |
| Success can be measured. | Pass — see Desired state and the existing G1 exit condition. |

## P1 decision

**Advance G1 to P2 — Design the Approach.**

P2 must choose the supported tooling contract and sequence the baseline-freeze work without folding the Webpack modernization work from G4 into G1.
