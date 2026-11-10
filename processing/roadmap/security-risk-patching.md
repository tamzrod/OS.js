# Security Risk Patching

**ID:** `RM-SEC-001`  
**Status:** Active  
**Current position:** P3 G2 — Divide cookie remediation into micro-tasks  
**Owner:** Unassigned  
**Created:** 2026-11-09  
**Updated:** 2026-11-10  
**Target:** MI-P6 security release gate  
**Depends on:** None

## Outcome

Produce a supportable OS.js fork whose shipped production dependency graph has zero high or critical audit findings, whose cookie and object-merging trust boundaries have regression coverage, and whose build runs on a supported Node LTS without legacy cryptographic workarounds.

## Context

The current fork is an unchanged OS.js 3.1.12 baseline with an obsolete client, server, and Webpack 4 toolchain. The dated baseline audit found 49 high and 10 critical findings across the full graph and 21 high and 2 critical findings in the production graph.

The controlling analysis is [`../../docs/security-risk-assessment.md`](../../docs/security-risk-assessment.md). MI-P6 must remain blocked until that assessment's release gates are satisfied.

## Scope

### In scope

- Reproducible dependency and runtime baselines.
- Removal of vulnerable `js-cookie` handling.
- Review and replacement of unsafe object-merging paths.
- Modernization of the browser build and Node runtime.
- Reduction or modernization of the server dependency surface.
- Browser-only packaging that excludes server, CLI, and build dependencies.
- Security regression tests, dependency auditing, SBOM generation, and CI gates.
- Updated security and operational documentation.

### Out of scope

- New Media Intelligence product features.
- Visual redesign or unrelated OS.js feature work.
- Public deployment before all release gates pass.
- Permanent advisory exceptions for high or critical production findings.

## Success criteria

- [ ] `npm audit --omit=dev --audit-level=high` reports zero high and zero critical findings for the exact release lockfile.
- [ ] Full-tree high and critical findings reach zero, or any build-only residual is formally reviewed with containment evidence and a time-bounded removal plan.
- [ ] Shipped artifacts contain no vulnerable `js-cookie` implementation.
- [ ] Cookie and merge regression tests reject prototype keys and attacker-controlled inherited attributes.
- [ ] Clean install, test, and production build pass on the selected supported Node LTS without `--openssl-legacy-provider`.
- [ ] The browser-only artifact excludes server, CLI, test, and build dependencies.
- [ ] CI retains audit output, SBOM, test results, and artifact-content evidence for the release commit.
- [ ] Security ownership and residual-risk approval are recorded before MI-P6 resumes.

## Goals and tasks

## G1 — Freeze and reproduce the baseline

**Position:** Complete  
**Exit condition:** A clean environment can reproduce the current dependency graph and dated security evidence from the committed configuration.

**P1 analysis:** [`../../docs/p1-g1-baseline-reproducibility-analysis.md`](../../docs/p1-g1-baseline-reproducibility-analysis.md)

**P2 plan:** [`../../docs/p2-g1-baseline-reproducibility-plan.md`](../../docs/p2-g1-baseline-reproducibility-plan.md)

- [x] **T1.1** [Enforce Node 26.13.0 and npm 11.20.0 consistently across local development, the manifest, and CI.](../tasks/RM-SEC-001/T1.1-enforce-toolchain.md)
- [x] **T1.2** [Define the baseline evidence structure, manifest schema, commands, and retention rules.](../tasks/RM-SEC-001/T1.2-define-evidence-contract.md)
- [x] **T1.3** [Migrate the v1 lockfile without dependency graph drift and prove repeatable `npm ci` behavior.](../tasks/RM-SEC-001/T1.3-migrate-lockfile.md)
- [x] **T1.4** [Capture clean-install and dated full/production audit evidence tied to an exact commit and lockfile.](../tasks/RM-SEC-001/T1.4-capture-audit-baseline.md)
- [x] **T1.5a** [Validate a pinned external CycloneDX runner without changing the project dependency graph.](../tasks/RM-SEC-001/T1.5a-unblock-sbom-generation.md)
- [x] **T1.5** [Generate and validate full and production CycloneDX SBOMs.](../tasks/RM-SEC-001/T1.5-generate-sboms.md)
- [x] **T1.6** [Classify dependency boundaries, capture the no-workaround build result, and evaluate the G1 exit condition.](../tasks/RM-SEC-001/T1.6-classify-and-close-baseline.md)
- [x] **T1.7a** [Implement a clean-checkout CI workflow for the complete G1 evidence set.](../tasks/RM-SEC-001/T1.7a-implement-clean-evidence-ci.md)
- [x] **T1.7b** [Run the workflow from committed source, review retained artifacts, and decide G1 closure.](../tasks/RM-SEC-001/T1.7b-run-clean-evidence-ci.md)

## G2 — Remove vulnerable cookie handling

**Position:** P3 G2 — Divide cookie remediation into micro-tasks  
**Exit condition:** No shipped path uses an affected `js-cookie` version, and hostile cookie-attribute inputs cannot change protected cookie policy.

**P1 analysis:** [`../../docs/p1-g2-cookie-risk-analysis.md`](../../docs/p1-g2-cookie-risk-analysis.md)

**P2 plan:** [`../../docs/p2-g2-safe-auth-persistence-plan.md`](../../docs/p2-g2-safe-auth-persistence-plan.md)

- [ ] **T2.1** Inventory every cookie read, write, removal, default-attribute, and converter call in the client.
- [ ] **T2.2** Decide whether to replace `js-cookie` with a minimal adapter or vendor a maintained client implementation.
- [ ] **T2.3** Implement an allowlisted cookie-attribute model with safe defaults for path, domain, secure, same-site, and expiry behavior.
- [ ] **T2.4** Reject `__proto__`, `prototype`, `constructor`, inherited properties, and unsupported attributes.
- [ ] **T2.5** Add regression tests using hostile JSON-derived objects and verify the emitted cookie attributes.
- [ ] **T2.6** Remove `js-cookie@2.2.1` and prove the affected package is absent from the production graph and built artifact.

## G3 — Eliminate unsafe merging paths

**Position:** Not started  
**Exit condition:** Security-sensitive configuration and state merges are schema-aware, own-property-only, and covered against recursive prototype manipulation.

- [ ] **T3.1** Inventory `deepmerge` and custom recursive merge call sites across client, common, dialogs, settings, and server paths.
- [ ] **T3.2** Classify each merge input by trust source and identify persisted or remotely supplied objects.
- [ ] **T3.3** Replace security-sensitive merges with explicit schema validation and own-property copying.
- [ ] **T3.4** Add tests for nested prototype keys, arrays, getters, inherited values, and unexpected object types.
- [ ] **T3.5** Remove obsolete `deepmerge` versions and verify no unsafe replacement utility enters the graph.

## G4 — Modernize the browser build and runtime

**Position:** Not started  
**Exit condition:** The client builds reproducibly on the selected Node LTS using a maintained toolchain without legacy OpenSSL mode.

- [ ] **T4.1** Record the current build inputs and produce a reference artifact for behavior comparison.
- [ ] **T4.2** Replace Webpack 4, webpack-cli 3, and incompatible loaders/plugins with maintained versions or an approved modern bundler.
- [ ] **T4.3** Update Babel, Sass, CSS, lint, minification, source-map, and asset-copy chains.
- [ ] **T4.4** Remove all use and documentation of `--openssl-legacy-provider`.
- [ ] **T4.5** Verify production build, CSP behavior, asset loading, source-map policy, and browser smoke tests.
- [ ] **T4.6** Re-run full audits and remove obsolete build dependencies with no compatible fixes.

## G5 — Reduce and patch the server surface

**Position:** Not started  
**Exit condition:** Required server capabilities use maintained dependencies and have tested resource limits; unused capabilities are absent.

- [ ] **T5.1** Decide which official server capabilities Media Intelligence actually requires.
- [ ] **T5.2** Remove unused server providers, upload/archive handlers, CLI features, and applications from the production graph.
- [ ] **T5.3** Upgrade or replace HTTP parsing, query parsing, WebSocket, glob, UUID, archive, and metadata-processing chains.
- [ ] **T5.4** Add explicit request body, header, timeout, connection, upload, and decompression limits.
- [ ] **T5.5** Add regression tests for malformed requests, oversized inputs, fragment/header exhaustion, and relevant upload/archive cases.
- [ ] **T5.6** Verify that denial-of-service tests fail safely without crashing or exhausting the service.

## G6 — Produce a minimal browser-only distribution

**Position:** Not started  
**Exit condition:** A reproducible browser artifact contains only reviewed runtime assets and dependencies.

- [ ] **T6.1** Define the browser package entry points and explicit dependency allowlist.
- [ ] **T6.2** Separate server, CLI, examples, tests, and build tools from the browser deliverable.
- [ ] **T6.3** Add an artifact-content test that fails on forbidden packages or files.
- [ ] **T6.4** Run the browser artifact in a clean static-host environment and complete functional smoke tests.
- [ ] **T6.5** Audit the minimal browser graph and record its results independently from the full distribution.

## G7 — Enforce security continuously

**Position:** Not started  
**Exit condition:** Pull requests and releases cannot regress the agreed security gates without an explicit, recorded decision.

- [ ] **T7.1** Add CI jobs for full and production npm audits with high-severity failure thresholds.
- [ ] **T7.2** Add lockfile dependency review, secret scanning, SAST, and SBOM generation.
- [ ] **T7.3** Run cookie, prototype-pollution, malformed-input, and resource-exhaustion regression suites in CI.
- [ ] **T7.4** Retain audit, SBOM, test, and artifact inspection outputs for each release candidate.
- [ ] **T7.5** Define the advisory-exception format with owner, reachability evidence, compensating control, and expiry.
- [ ] **T7.6** Add a release checklist that prevents MI-P6 handoff until every success criterion is evidenced.

## G8 — Complete security review and unblock MI-P6

**Position:** Not started  
**Exit condition:** A named security owner approves the release evidence and records the decision to resume MI-P6.

- [ ] **T8.1** Run clean-room installation, test, build, full audit, production audit, and SBOM generation on the release commit.
- [ ] **T8.2** Review the deployment threat model, server exposure, credentials, reverse-proxy controls, and browser security headers.
- [ ] **T8.3** Resolve or explicitly reject every remaining advisory; no high or critical production exception is permitted.
- [ ] **T8.4** Record residual risks, ownership, and expiry dates for accepted lower-severity findings.
- [ ] **T8.5** Obtain security sign-off and record the MI-P6 unblock decision.

## Dependencies and risks

- A supported Node LTS choice is required before toolchain migration and lockfile regeneration.
- OS.js packages may need to be forked or absorbed into this repository because upstream-compatible security releases do not exist.
- Toolchain migration can alter CSS, asset paths, source maps, or runtime behavior; reference artifacts and smoke tests are required.
- Audit counts will change as advisories are published or withdrawn. The release decision must use fresh results tied to the release commit.
- Package removal is safer than blind upgrading when functionality is not required.
- Denial-of-service tests require bounded, isolated runners so the verification itself cannot disrupt shared infrastructure.

## Verification

Minimum recurring checks:

```sh
npm ci
npm test
npm run build
npm audit --omit=dev --audit-level=high
npm audit --audit-level=high
```

Additional evidence required before completion:

- Supported Node/npm version output.
- Committed lockfile and deterministic clean-install result.
- Full and production audit JSON.
- SBOM tied to the release commit.
- Security regression test results.
- Browser artifact inventory and forbidden-content test.
- Clean browser smoke-test result.
- Threat-model and security sign-off record.

## Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-11-09 | Block unchanged OS.js integration and define zero high/critical production findings as a release gate. | The legacy baseline contains direct and transitive security risks in shipped dependencies and has no compatible automatic remediation path. |
| 2026-11-09 | Treat browser, server, and build graphs as separate review surfaces. | Production exposure and supply-chain exposure require different evidence and remediation, while a minimal browser artifact can reduce attack surface. |
| 2026-11-10 | Close G1 using retained clean evidence from commit `38e286a674cb4fe0238f703f1a5f69e25c590274`. | CI reproduced the reviewed dependency, audit, SBOM, classification, discovery, and expected-build baseline with clean source identity and validated artifact hashes. |

## Progress log

| Date | Update |
|---|---|
| 2026-11-09 | Created the initial roadmap from the security risk assessment. No remediation tasks have been completed; status remains Proposed. |
| 2026-11-09 | Adopted goal-specific process coordinates. Work starts at `P1 G1`: understand the problem for G1 — Freeze and reproduce the baseline. |
| 2026-11-09 | Completed `P1 G1`. A clean Node 24/npm 11 experiment installed the locked graph but the Webpack 4 build failed with `ERR_OSSL_EVP_UNSUPPORTED`; conflicting runtime declarations and reproducibility gaps are documented. Decision: advance to `P2 G1`. |
| 2026-11-09 | Completed `P2 G1`. Selected Node 26.13.0 LTS with bundled npm 11.20.0, designed controlled lockfile migration, CycloneDX evidence, dependency classification, and six sequential micro-task boundaries. Decision: advance to `P3 G1`. |
| 2026-11-09 | Completed `P3 G1`. Created bounded micro-task records for T1.1–T1.6 with dependencies, change surfaces, exit conditions, verification, and rollback where needed. Decision: advance to `P4 G1` with T1.1 as the only ready task. |
| 2026-11-09 | Completed `P4 G1 / T1.1`. Enforced Node 26.13.0/npm 11.20.0 across local, manifest, CI, container, and README entry points. Positive and negative guards passed; a clean temporary install preserved the lockfile hash. Advance to `P5 G1` to review and choose the next action. |
| 2026-11-09 | Completed `P5 G1 / T1.1`. Review found no scope drift or unexplained changes; the lockfile is unchanged. Known Webpack incompatibility remains in G4 and lockfile hydration remains in T1.3. Decision: continue to `P4 G1 / T1.2`. |
| 2026-11-09 | Completed `P4 G1 / T1.2`. Added the evidence contract, manifest schema, valid example, and dependency-free validator. Validation passed and the lockfile remained unchanged. Advance to `P5 G1` to review and choose the next action. |
| 2026-11-09 | Completed `P5 G1 / T1.2`. Review confirmed valid evidence is accepted, invalid input is rejected, internal references resolve, and no lockfile or dependency changes occurred. Decision: continue to `P4 G1 / T1.3`. |
| 2026-11-10 | Completed `P4 G1 / T1.3`. Migrated the npm lockfile from v1 to v3 under Node 26.13.0/npm 11.20.0. The normalized comparison found no removals or changed entries; three required optional development metadata additions are exactly allowlisted. Two clean installs succeeded without rewriting the final lockfile. Advance to `P5 G1` for review. |
| 2026-11-10 | Completed `P5 G1 / T1.3`. Independent verification reproduced the equivalent dependency graph and confirmed the recorded hashes, with zero unapproved additions, removals, or changes. No scope drift was found. Decision: T1.4 is ready; continue to `P4 G1 / T1.4`. |
| 2026-11-10 | Completed `P4 G1 / T1.4`. Both isolated install modes passed without rewriting the lockfile. Valid npm audit evidence reproduced 130 full-graph findings (49 high, 10 critical) and 39 production findings (21 high, 2 critical). The nonzero audit exits are preserved as findings. Advance to `P5 G1`; MI-P6 remains blocked. |
| 2026-11-10 | Completed `P5 G1 / T1.4`. Every raw artifact matched the manifest and both severity totals were independently reproduced. Review accepts this as development evidence only: the dirty source and locally staged raw files cannot satisfy final G1 or release evidence, so a clean retained CI rerun remains required. Decision: continue to `P4 G1 / T1.5`; carry the retention gap into T1.6. |
| 2026-11-10 | `P4 G1 / T1.5` blocked. npm 11 refuses normal, lockfile-only, and forced CycloneDX generation with `ESBOMPROBLEMS`: `hyperapp-nestable@1.1.0` requires `hyperapp@1.1.x`, but the frozen graph contains `hyperapp@1.2.10`. No dependency or lockfile change was made. Advance to `P5 G1` to choose a bounded correction or revise the generator constraint. |
| 2026-11-10 | Completed `P5 G1 / T1.5` blocker review. The mismatch is inherited through `@osjs/gui@4.0.36`; changing Hyperapp would violate baseline-capture scope. Decision: insert T1.5a to test an exact, integrity-recorded, ephemeral official CycloneDX runner using its documented lockfile-only and known-error controls. T1.5 stays blocked until that prerequisite passes review. |
| 2026-11-10 | Completed `P4 G1 / T1.5a`. Isolated `@cyclonedx/cyclonedx-npm@7.0.0` produced reproducible full and production trials containing 1,392 and 344 recursive components with zero unresolved references. Project hashes were unchanged. Approval is conditional on explicit toolchain binding, exact peer-error filtering, and independent validation. Advance to `P5 G1`. |
| 2026-11-10 | Completed `P5 G1 / T1.5a`. Independent reruns were byte-identical, the exact package integrity matched the registry pin, root identity and recursive references were complete, and only the known Hyperapp `ELSPROBLEMS` appeared. Decision: approve the conditional runner controls and return to `P4 G1 / T1.5`. |
| 2026-11-10 | Completed `P4 G1 / T1.5` retry. Generated reproducible CycloneDX 1.6 full and production SBOMs with 1,392 and 344 recursive components, zero unresolved references, independent schema validation, and exact known-error filtering. The isolated validation tool graph has zero audit findings and the project graph is unchanged. Advance to `P5 G1`; clean CI retention remains required. |
| 2026-11-10 | Completed `P5 G1 / T1.5`. Every raw artifact matched its manifest; both SBOMs independently passed CycloneDX 1.6 schema and recursive-reference validation; diagnostics contained only the approved Hyperapp conflict. Accepted as development evidence only. Decision: continue to `P4 G1 / T1.6`, with clean CI retention still required for G1 closure. |
| 2026-11-10 | Completed `P4 G1 / T1.6`. Classified all 1,392 lock entries with zero unknowns or unresolved edges; package discovery found 11 packages; Webpack reproduced the expected `ERR_OSSL_EVP_UNSUPPORTED` failure on Node 26 with no legacy flag. Development baseline is complete, but G1 exit fails clean-source and durable-CI-retention criteria. Advance to `P5 G1` for loop-back decision. |
| 2026-11-10 | Completed `P5 G1 / T1.6`. Independent review reconciled every artifact and confirmed the development baseline. G1 remains open only because evidence is dirty-source and locally staged. Decision: add T1.7a for the clean-evidence workflow and T1.7b for committed CI execution and retained-artifact review. Continue to `P4 G1 / T1.7a`. |
| 2026-11-10 | Completed `P4 G1 / T1.7a`. Added a manual clean-checkout evidence workflow with minimal permissions, immutable action pins, exact toolchain checks, isolated zero-finding SBOM tooling, fail-closed audit/SBOM/classification/build capture, manifest validation, checkout cleanliness checks, and 90-day artifact upload. Advance to `P5 G1`; remote execution remains T1.7b. |
| 2026-11-10 | Completed `P5 G1 / T1.7a`. Review refreshed immutable action pins and accepted permissions, clean-source semantics, fail-closed validation, and retention controls. Decision: continue to `P4 G1 / T1.7b`. |
| 2026-11-10 | Completed `P4–P5 G1 / T1.7b`. GitHub Actions run `42792109526` passed on clean commit `38e286a674cb4fe0238f703f1a5f69e25c590274`; retained artifact ID `13752320598` and digest `0240a4384662f5851012db14f66c62ed438431e5ef82c31c83ff7c407605d866` were independently verified. G1 is complete; advance to `P1 G2`. MI-P6 remains blocked by the reproduced vulnerabilities. |
| 2026-11-11 | Completed `P1 G2`. Exact package analysis found four authentication-only cookie calls. The advisory's JSON-derived attribute path is not directly exposed, but the vulnerable code ships and optional persistence stores the submitted login object, including the password, in a JavaScript-readable cookie while ignoring the configured `secure` flag. Decision: advance to `P2 G2`, preferring removal of client credential persistence in favor of server-owned session state. |
| 2026-11-11 | Completed `P2 G2`. Selected a fork-owned client source package, complete removal of `js-cookie` and browser credential replay, and a fail-closed migration error for legacy cookie enablement. Reload will require explicit login; G2 will not add an unreviewed session-resume API or absorb broader server hardening from G5. Decision: advance to `P3 G2` and create independent provenance, baseline-build, red-test, remediation, integration, and evidence tasks. |
