# OS.js Security Risk Assessment

**Repository:** `tamzrod/OS.js`  
**Baseline commit:** `0aa87445` (`master`)  
**Package version:** `@osjs/osjs` 3.1.12  
**Assessment date:** 2026-11-09  
**Decision:** **Do not integrate or deploy this baseline. MI-P6 remains blocked.**

## Executive summary

The fork is currently an unchanged copy of the legacy OS.js 3.1.12 distribution. Its last repository commit is dated 2022-09-16, its package metadata still points to the upstream OS.js repository, and its dependency lock contains an obsolete browser client, server stack, CLI, and Webpack 4 toolchain.

An npm audit against the committed lockfile found **128 vulnerable packages: 10 critical, 49 high, 56 moderate, and 13 low**. A production-only audit found **39 vulnerable packages: 2 critical, 21 high, 4 moderate, and 12 low**. These are package-level audit findings, not 128 proven exploitable application paths, but the production result establishes that the risk cannot be dismissed as development-tool noise.

The most important direct client issue is `@osjs/client@3.7.1` resolving `js-cookie@2.2.1`. That version is affected by [GHSA-qjx8-664m-686j / CVE-2026-46625](https://github.com/advisories/GHSA-qjx8-664m-686j), a high-severity cookie-attribute injection flaw. The OS.js dependency range cannot reach the patched `js-cookie@3.0.7` without changing or replacing the OS.js client package.

The present baseline therefore creates unacceptable integrity, availability, supply-chain, and maintainability risk for Media Intelligence.

## Evidence and scope

The assessment used:

- `package.json` and `package-lock.json` at commit `0aa87445`.
- `npm audit --json` and `npm audit --omit=dev --json` on 2026-11-09 using npm 11.13.0.
- Git history for repository maintenance dates.
- GitHub's reviewed advisory for `js-cookie`.

Audit results are time-dependent and must be regenerated in CI. The counts in this document are a dated baseline, not a permanent inventory. No dynamic penetration test or application-specific data-flow proof was performed, so exploitability depends on how OS.js is configured and exposed. Conversely, absence of a demonstrated exploit does not make a vulnerable, unsupported dependency acceptable for production.

## Risk register

| ID | Risk | Evidence | Likely impact | Rating |
|---|---|---|---|---|
| R1 | Cookie-attribute injection | `@osjs/client@3.7.1` depends on `js-cookie@^2.2.1`; the lock resolves 2.2.1. GHSA-qjx8-664m-686j affects versions through 3.0.5 and is patched in 3.0.7. | If attacker-influenced JSON is passed as cookie attributes, inherited properties can alter `domain`, `path`, `secure`, `sameSite`, or expiry behavior. This can weaken cookie scope and integrity. | High |
| R2 | Production denial of service | The production audit includes high-severity findings in request-processing dependencies such as `body-parser`, `qs`, and `ws`, plus critical findings elsewhere in the production tree. | Crafted requests or resource-exhaustion patterns may crash or stall the service, causing loss of availability. | Critical |
| R3 | Unsafe object-merging surface | OS.js client/common/server packages resolve `deepmerge@4.2.2`; dialogs also embeds `deepmerge@2.2.1`. The audit propagates findings through OS.js packages. | Untrusted objects crossing merge boundaries can create prototype-related or configuration-integrity hazards. Every merge site must be reviewed; version-only remediation is insufficient without data-flow tests. | High |
| R4 | Unsupported build and runtime | The manifest accepts Node >=10 with no upper bound. The locked toolchain uses Webpack 4, webpack-cli 3, and old loaders/plugins. | Modern Node compatibility is unreliable; legacy OpenSSL workarounds weaken operational posture, while unsupported runtimes stop receiving security fixes. | High |
| R5 | Supply-chain and build compromise | Full audit: 10 critical and 49 high findings, including compiler, archive, watcher, minifier, and plugin chains. Several have no automatic compatible fix. | Malicious or untrusted build inputs may affect developer/CI hosts or generated assets. A compromised build can become a production compromise even when the package is marked dev-only. | Critical |
| R6 | Security-fix dead end | npm proposes incompatible OS.js downgrades for several direct packages, and reports no fix for some chains. The repository has had no functional commits since 2022-09-16. | Routine `npm audit fix` cannot produce a supportable release. Continuing unchanged accumulates advisories and forces emergency, unreviewed overrides. | High |
| R7 | Unreproducible dependency policy | The manifest uses broad caret ranges across legacy OS.js packages, while the old lockfile is the only effective pin. | Deleting or regenerating the lockfile can materially change the graph; retaining it preserves known-vulnerable versions. | High |

## Detailed analysis

### 1. Browser client and cookies

`@osjs/client@3.7.1` directly requires `js-cookie@^2.2.1`, resolved to 2.2.1. The reviewed advisory describes per-instance prototype hijacking in the library's attribute merge. Exploitation requires attacker influence over an object passed to a cookie API; therefore this is not proof that every OS.js deployment is immediately exploitable. It is nevertheless a direct, remotely relevant integrity risk in a desktop shell that handles authentication and session state.

Merely forcing `js-cookie@3.0.7` through an override is not an adequate fix: 3.x may have API or behavior differences that the legacy OS.js client was never tested against. Preferred remediation is to remove the dependency and implement a small, typed cookie adapter that uses an allowlist of supported attributes, rejects `__proto__`, `prototype`, and `constructor`, and has regression tests for hostile JSON-derived objects.

### 2. Server exposure

The production tree contains vulnerable HTTP parsing and WebSocket components. Relevant classes include request-body denial of service, query-string resource consumption, malformed-header handling, memory exhaustion, and unsafe file/archive processing. Actual reachability depends on enabled OS.js server providers, routes, upload behavior, authentication, proxy limits, and whether WebSockets are exposed.

Until remediation is complete, the server must not be internet-facing. A reverse proxy with strict body/header/time limits is useful defense in depth but does not satisfy the release gate.

### 3. Merge and prototype safety

Multiple OS.js packages use `deepmerge`, and two major versions are locked. All merge call sites that can consume configuration, API responses, user preferences, package metadata, or persisted state should be treated as trust boundaries. Replacement code should copy only own properties into null-prototype or schema-validated objects and explicitly reject prototype-mutating keys recursively.

### 4. Toolchain and runtime

Webpack 4 and its plugin ecosystem account for many transitive findings and make modern Node support brittle. The existing `engines.node` value (`>=10.0.0`) falsely implies compatibility with every later Node release and permits end-of-life runtimes. `--openssl-legacy-provider` must not be adopted as a permanent workaround because it re-enables legacy cryptographic behavior rather than fixing the toolchain.

The fork should select an actively supported Node LTS line, pin it in developer and CI configuration, set a bounded engine range, and replace Webpack 4 and incompatible plugins. The migration must produce equivalent assets and preserve CSP compatibility.

## Required remediation plan

1. **Establish a reproducible baseline.** Pin the supported Node and npm versions, regenerate the lockfile intentionally, record an SBOM, and make `npm ci` the only CI install path.
2. **Remove vulnerable cookie handling.** Replace `js-cookie` usage or port the client into the fork with a tested safe adapter. Add regression tests using JSON with `__proto__`, `constructor`, and inherited cookie attributes.
3. **Replace unsafe merges.** Inventory every `deepmerge` call and replace security-sensitive merges with schema-aware, own-property-only operations. Add nested prototype-pollution tests.
4. **Modernize the browser build.** Move off Webpack 4 and obsolete plugins without using `--openssl-legacy-provider`. Pin an active Node LTS line and test clean builds on it.
5. **Modernize or remove the official server.** Upgrade HTTP, WebSocket, upload, glob, UUID, and archive paths; remove unused server features and packages to reduce attack surface.
6. **Separate browser and server deliverables.** Produce a minimal browser-only package so server and CLI dependencies are not shipped where they are unnecessary.
7. **Restore security automation.** Run production audit, full audit, lockfile review, secret scanning, SAST, dependency review, and targeted prototype-pollution/DoS regression tests in CI.
8. **Document exceptions.** Any accepted advisory must have a reachability analysis, owner, compensating controls, and expiry date. No high or critical production exception is allowed for the MI-P6 release gate.

## Release gates for MI-P6

MI-P6 may resume only when all of the following are true:

- `npm audit --omit=dev --audit-level=high` reports **zero high and zero critical** findings.
- Full-tree high/critical findings are either removed or documented as non-shipping build-only risks with tested containment; the target should be zero.
- The vulnerable `js-cookie` dependency and unsafe merge paths are removed or demonstrably remediated by tests.
- Builds and tests pass on the selected supported Node LTS without `--openssl-legacy-provider`.
- The dependency lockfile is committed, deterministic under `npm ci`, and reviewed.
- Security regression tests cover hostile cookie attributes, recursive prototype keys, oversized/malformed HTTP inputs, WebSocket resource exhaustion, and relevant upload/archive paths.
- A browser-only production artifact is verified not to contain server, CLI, or development dependencies.
- A security owner signs off on the residual-risk register and deployment threat model.

## Interim controls

These controls reduce exposure but do not authorize release:

- Do not deploy the current fork or reuse its official server in Media Intelligence.
- Keep the repository and build runners isolated from untrusted pull requests and artifacts.
- Do not process untrusted archives, SVGs, source maps, configuration objects, or package metadata with the legacy toolchain.
- If a temporary internal evaluation is unavoidable, use synthetic data, no production credentials, no public network exposure, strict reverse-proxy limits, and a disposable environment.

## Verification commands

Run from the repository root after each remediation milestone:

```sh
npm ci
npm test
npm audit --omit=dev --audit-level=high
npm audit --audit-level=high
```

Audit output and the generated SBOM should be retained as CI artifacts so a passing result can be tied to an exact commit and lockfile.
