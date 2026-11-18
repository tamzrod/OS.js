# P2 G5 — Minimal server security boundary plan

## Decision and scope

Continue RM-SEC-001 with a **capability-first, fail-closed** server profile. P1 established that generic OS.js starts Core, Package, VFS, Auth and Settings providers unconditionally, while the repo contains no documented Media Intelligence-specific deployment capability contract. Do not infer that generic OS.js demo functionality is required by Media Intelligence.

The default deployment target for Media Intelligence is **browser-only/static distribution (G6)**. If an OS.js Node server is needed, it must use a separately named, explicitly selected runtime profile and a real authentication implementation. Existing development behavior remains available for isolated local use; it is never an implicit production fallback.

This plan approves task sequencing and security acceptance criteria, **not** deployment, provider removal before reachability verification, or a claim that every vulnerability is fixed.

## Explicit capability policy

Each capability has one of three dispositions: `disabled` (default for production), `conditional` (explicit requirement plus test), or `retained` (essential to a selected production profile).

| Capability | Browser-only profile | Optional server profile | Acceptance condition |
| --- | --- | --- | --- |
| Static built assets | retained | conditional | Immutable built assets; explicit content/header policy |
| Authenticated API and sessions | disabled | conditional | Real adapter, secure session configuration, regression tests |
| Public account registration | disabled | disabled | No unauthenticated registration endpoint |
| Server settings persistence | disabled | conditional | Authenticated per-user authorization |
| Read-only distribution VFS | disabled | conditional | No path escape; strictly read-only |
| Writable home VFS and multipart upload | disabled | conditional | Named product requirement, quotas, path and size tests |
| VFS search and filesystem watching | disabled | disabled | Not initialized by production runtime |
| WebSocket messaging | disabled | conditional | Documented authenticated consumer and bounded messages |
| Reverse-proxy routing | disabled | disabled | No generic upstream proxy in production app |
| Runtime package discovery and generators | disabled | disabled | Build-time only; absent from shipped runtime graph |
| Music player and server metadata parsing | disabled | disabled | Removed from production graph unless a separately approved requirement |
| Development watchers and debug utilities | disabled | disabled | Production startup rejects dev mode |

**Unknown means disabled.** A feature cannot be re-enabled solely to preserve the generic upstream desktop demo.

## Production startup gate

Before exposing any server route, the selected production profile must:
1. Reject an unspecified deployment profile, development mode, or an unsafe/unknown capability key.
2. Reject the null/accept-any-username authentication adapter wherever login, sessions, writable VFS or user settings are enabled.
3. Reject the default/empty session secret; require a secret supplied outside committed source, with suitable entropy. Never print it.
4. Reject public registration and unsolicited writable endpoints.
5. Disable WebSocket, upload, proxy, watcher and discovery handlers when not explicitly enabled.
6. Bind deliberately and operate behind a reviewed TLS termination/proxy arrangement; never turn on trust-proxy globally by accident.
7. Fail startup rather than silently falling back to permissive legacy defaults.

Enforce gates *before listening*; tests must prove no partial startup on a rejected configuration. Development mode is separate and must never be presented as production-safe.

## Implementation order

### T5.1 — Capability contract and entry-point red tests
- Introduce a machine-readable production allowlist/configuration contract, keeping the static-only target and optional Node-server target separate.
- Write negative tests for unsafe production configurations (null auth, weak session secret, missing profile, enabled registration, unreviewed provider).
- Inventory actual server/client consumers for each conditional capability. Where the deployment contract is unknown, leave it off; do not invent Media Intelligence requirements.
- Gate: reviewed capability table and red tests linked to exact code entry points.

### T5.2 — Remove unused startup and dependency roots
- Make provider registration conditional on the validated contract; remove disabled features from production boot, not merely hide UI routes.
- Remove unnecessary application and generator dependencies from production packages; retain development tooling separately where necessary.
- Regenerate the lock under the pinned Node/npm toolchain and compare dependency inventories.
- Gate: route and startup tests prove disabled endpoints are not registered; dependency graph has no unapproved removed-function regressions.

### T5.3 — Modernize retained package chains
- Map high/critical findings to reachable retained server paths using fresh `npm audit --omit=dev --json`, lockfile dependency paths, and package source.
- Upgrade maintained packages where APIs remain compatible; otherwise replace or eliminate the feature/chain. Do not use a broad audit auto-fix without reviewing changes.
- Gate: the exact production lockfile has zero high/critical findings, with tests for retained HTTP, auth, session and WebSocket functions.

### T5.4 — Bound all retained ingress
- Define and test per-route request body, header/query, timeout, connection and concurrency limits; avoid unbounded buffering and decompression.
- Only if upload is approved: add field/file/part/temp-storage/quota limits, cleanup, and path validation.
- Only if WebSocket is approved: add handshake/header/message/fragment/connection limits, authorization and idle timeouts.
- Gate: limits are explicit in configuration and cannot be widened silently by inherited defaults.

### T5.5 — Hostile-input regressions
- Test malformed HTTP bodies/encodings/queries, oversized payloads and headers, session forgery, registration bypass, unauthorized VFS and path escapes.
- Add upload/archive and WS exhaustion tests only if those capabilities survive T5.2.
- Gate: failures are bounded and non-crashing, with denied operations demonstrably not applied.

### T5.6 — Isolated denial-of-service verification and G5 evidence
- Run bounded negative tests in isolated CI with resource/time limits, never on production or shared services.
- Retain clean install, lockfile integrity, before/after dependency paths, full/production audit JSON, SBOMs and security test logs.
- Gate: no high/critical production findings, no unsecured server feature, and independently reproducible clean evidence.

## Change-control boundaries

- Never modify `master`, merge PR #1, publish, or deploy in this plan stage.
- Preserve G1–G4 evidence and the protected cookie/merge/browser build behavior.
- Any newly requested server capability requires a recorded consumer, threat-boundary test, and risk review before enabling it.
- Avoid hard-coded application secrets, fabricated CI outcomes, and unverified claims about vulnerability elimination.
- If the optional server cannot be made safe with reasonable scope, ship the isolated static distribution via G6 and keep the Node runtime out of the production artifact.

## Verification and transition

P3 next creates executable task contracts beginning with T5.1, including code paths, negative-test cases and a reversible implementation boundary. P4 starts with the contract and failing security tests, not opportunistic upgrades. G5 remains open until T5.1–T5.6 pass on clean reviewed evidence.
