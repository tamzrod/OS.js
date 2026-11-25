# P2 G2 — Safe Authentication Persistence Plan

**Roadmap:** [`RM-SEC-001`](../processing/roadmap/security-risk-patching.md)  
**Goal:** G2 — Remove vulnerable cookie handling  
**Process:** P2 — Design the Approach  
**Input:** [`P1 G2 Vulnerable Cookie Handling Analysis`](p1-g2-cookie-risk-analysis.md)  
**Plan date:** 2026-11-11

## Outcome

Replace the published `@osjs/client@3.7.1` dependency with a fork-owned, source-reviewable client package that contains no `js-cookie` code and never persists submitted credentials in browser-managed storage. Preserve the existing secure-default behavior: in server mode, a page reload requires explicit login unless a separately reviewed session-resume capability is introduced later.

G2 completes only when the production dependency graph and built browser artifact contain no affected `js-cookie` implementation, hostile cookie-shaped objects cannot alter authentication policy, and regression tests prove that passwords and arbitrary login fields are not persisted.

## Design decision

### Selected approach: fork the client and remove credential persistence

Import the exact upstream source corresponding to `@osjs/client@3.7.1` into a fork-owned package, preserving license and provenance. Patch the authentication implementation at source level:

- Remove the `js-cookie` import and package dependency.
- Remove the `Cookies.get`, `Cookies.set`, and `Cookies.remove` paths.
- Never serialize the submitted login object to `document.cookie`, `localStorage`, or `sessionStorage`.
- Remove the legacy cookie defaults from the forked client configuration.
- Detect `auth.cookie.enabled: true` during authentication initialization and stop with a clear migration error. Do not silently ignore a requested persistence policy.
- Preserve normal login, registration, logout, callback, event, settings-load, and standalone adapter behavior.

The root application will depend on the fork-owned package through a deterministic workspace or local package reference. It will not patch installed `node_modules`, use an untracked post-install rewrite, or rely on a transitive override as the final solution.

### Why not only upgrade `js-cookie`

A patched 3.x version would remove the named advisory but retain the unsafe product behavior: arbitrary login-form values—including passwords—would still be stored in JavaScript-readable state. It would also introduce a major-version behavior change without eliminating the generic cookie surface.

### Why not add session resume in G2

The server already uses `express-session` and returns an opaque `osjs.sid` cookie. Its default `HttpOnly` behavior prevents JavaScript reads, login saves a user profile in the server session, authenticated routes consume that session, and logout destroys it.

However, the legacy client has no current-session restore handshake. Adding one would require a new authenticated endpoint, response schema, expiry behavior, WebSocket synchronization, stale-session UX, and authorization tests. That is a separate security design, not necessary to remove the vulnerable browser dependency. G2 therefore accepts reauthentication after reload, which matches the existing default because client credential persistence is disabled by default.

Server session-secret management, cookie policy hardening, store choice, rotation, fixation defense, and resource controls remain required work under G5. G2 must not claim the existing server session is release-ready.

## Compatibility contract

The following behavior must remain stable:

- `AuthServiceProvider` continues to expose `show`, `login`, `logout`, and `user`.
- Server adapter endpoints remain `POST /login`, `POST /logout`, and `POST /register`.
- A successful login updates the core user, loads settings, emits existing login events, and starts the desktop.
- A failed login produces the existing error/stop events and does not persist input.
- Successful logout calls the server adapter, destroys client state, emits logout, and reloads by default.
- Standalone/local-storage authentication continues to function without cookie persistence.
- Programmatic `auth.login` configuration remains a separate explicit deployment feature for now; it must be documented as unsuitable for secrets in production and reviewed separately before release.

Intentional compatibility break:

- `auth.cookie.enabled: true` is rejected with a migration error. Persisted `osjs.auth` values are not read or replayed.

Legacy cookie cleanup presents a special constraint: deleting `osjs.auth` with new JavaScript cookie code would preserve a cookie-handling path and could delete only the configured name/path combination. The migration should instead document a one-time operator response-header cleanup or use an isolated, fixed-name migration step with an explicit removal date. It must not restore a generic cookie adapter to the steady-state client.

## Source and provenance controls

The forked client import must record:

- Upstream repository and exact tag/commit corresponding to npm 3.7.1.
- Original npm tarball integrity and license.
- An import manifest listing included source files and deliberate exclusions.
- A patch summary showing authentication and dependency changes.
- A reproducible build path and comparison of public exports against 3.7.1.

Do not treat source-map extraction as the canonical import if the upstream tagged source is available. Source maps may be used to verify equivalence, not to establish maintainable provenance.

## Security model

### Protected assets

- User passwords and custom login fields.
- Server session identifiers.
- Authentication state and logout semantics.
- Cookie scope and transport policy.
- Integrity of the production dependency graph and browser artifact.

### Prohibited steady-state behavior

- Writing submitted authentication values to `document.cookie`.
- Writing submitted authentication values to Web Storage or IndexedDB.
- Accepting a generic caller-controlled cookie attribute object.
- Enumerating inherited policy fields.
- Treating `__proto__`, `prototype`, or `constructor` as data keys in a security policy.
- Bundling `js-cookie` through any direct, transitive, duplicated, or vendored path.

### Configuration behavior

Configuration checks must use own-property access and explicit types. The legacy `auth.cookie` object is not a supported policy surface after migration. If present with `enabled: true`, initialization fails closed with a targeted error. `enabled: false` may be tolerated for one migration window with a deprecation warning, then removed.

## Test strategy

### Unit tests

- Login success calls the adapter once and does not call any browser storage API.
- Login failure persists nothing and retains the existing event sequence.
- Startup never reads or parses `osjs.auth`.
- Logout calls the adapter and completes existing shutdown behavior without client cookie manipulation.
- `auth.cookie.enabled: true` fails closed before credentials are collected or transmitted.
- An inherited `enabled` property is ignored; only an own Boolean value is evaluated.
- JSON objects containing `__proto__`, `constructor`, or `prototype` cannot alter the decision.
- Custom login values with getters, symbols, nested objects, or hostile keys are passed only to the selected adapter and never copied into persistence.

### Integration tests

- Server login returns a user profile and an opaque session cookie whose value is not exposed to client code.
- Authenticated requests work in the same page session.
- Reload presents login rather than replaying saved credentials.
- Logout invalidates the server session and protected routes reject subsequent use.
- Standalone mode retains its current adapter behavior without creating cookies.

Server cookie-flag assertions should record current behavior but must not broaden G2 into full G5 remediation. Any release-blocking flag or secret issue discovered becomes an explicit G5 prerequisite.

### Dependency and artifact tests

- `npm ls js-cookie --all` reports no instances.
- Production audit no longer reports `GHSA-qjx8-664m-686j`.
- Full audit no longer reports the advisory through build/test copies.
- Full and production SBOMs contain no `pkg:npm/js-cookie` component.
- Built JavaScript contains neither the js-cookie banner nor its characteristic merge/attribute implementation.
- The client package manifest declares no `js-cookie` dependency.

## Execution sequence

1. Freeze upstream client provenance and import the exact 3.7.1 source with license and import manifest.
2. Establish a reproducible local client package build and public-export comparison before behavior changes.
3. Add failing authentication persistence and hostile-configuration tests against the imported baseline.
4. Remove `js-cookie` and all credential read/write/removal paths.
5. Add the fail-closed legacy configuration migration check.
6. Point the root project at the fork-owned client package and regenerate the lockfile under the pinned toolchain.
7. Run unit/integration tests, package discovery, and the available build checks.
8. Re-run audit, SBOM, dependency-classification, and browser-artifact inspections.
9. Review behavior and evidence at P5 G2; loop back on any unexplained graph or API drift.

## Task boundaries for P3

P3 should turn this plan into independent micro-tasks with these intended boundaries:

| Boundary | Purpose | Must not include |
|---|---|---|
| Provenance import | Obtain exact maintainable client source and prove baseline identity. | Security behavior changes. |
| Baseline build/API | Reproduce package output and exports. | Cookie removal. |
| Red tests | Encode unsafe persistence and prototype-key expectations. | Production implementation. |
| Auth remediation | Remove credential persistence and reject legacy enablement. | Server session redesign. |
| Root integration | Switch dependency and regenerate the graph deterministically. | Unrelated dependency upgrades. |
| Evidence closure | Prove advisory/package/artifact absence and behavior. | G3–G5 remediation. |

T2.1–T2.6 in the roadmap remain the goal-level traceability items. P3 may refine them into suffixed tasks where needed, but every micro-task must name its input, output, verification, and rollback boundary.

## Risks and controls

| Risk | Control |
|---|---|
| Upstream tag and npm artifact differ. | Compare package metadata, source map, exports, license, and build output; record all expected differences. |
| Legacy Webpack cannot build on Node 26. | Separate client-package reproducibility from the known G4 root build blocker; never enable the legacy OpenSSL provider. |
| Removing replay changes reload UX. | Treat explicit login after reload as the approved secure behavior and document the intentional break. |
| Existing deployments leave an old credential cookie behind. | Define a bounded migration cleanup owned by deployment/server configuration; verify expiry and removal without retaining a generic client API. |
| Custom login adapters depend on cookie replay. | Preserve adapter contracts but require adapters to own any reviewed token/session design explicitly. |
| Local package integration causes broad graph drift. | Compare normalized lock graphs and allow only provenance-explained client/build changes. |
| Server session is mistaken for release-ready. | Carry session hardening explicitly into G5 and keep MI-P6 blocked. |

## Exit criteria

P2 is complete when the remediation architecture, compatibility break, implementation boundary, tests, evidence, sequencing, and excluded server work are explicit enough for P3 to create independent tasks without making new architectural decisions.

## P2 decision

Proceed with a fork-owned client source package and remove client credential persistence entirely. Do not solve the advisory with an override alone, do not introduce generic cookie attributes, and do not add session resume during G2. Advance to P3 G2 to segregate the plan into executable micro-tasks.
