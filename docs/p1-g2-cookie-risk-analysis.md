# P1 G2 — Vulnerable Cookie Handling Analysis

**Roadmap:** [`RM-SEC-001`](../processing/roadmap/security-risk-patching.md)  
**Goal:** G2 — Remove vulnerable cookie handling  
**Process:** P1 — Understand the Problem  
**Analysis date:** 2026-11-11  
**Baseline branch:** `codex/rm-sec-001-g1-baseline`

## Problem statement

The browser client ships `js-cookie@2.2.1`, which is affected by `GHSA-qjx8-664m-686j` / `CVE-2026-46625`. G2 must remove the affected implementation while preserving only the authentication behavior that is actually justified. The work must also correct a broader design problem: optional OS.js credential persistence stores the submitted login object in a JavaScript-readable cookie.

This analysis distinguishes three questions:

1. Is the affected library present in the shipped browser graph? **Yes.**
2. Is the advisory's demonstrated JSON-derived attribute path directly exposed by current OS.js calls? **No direct path was found.**
3. Is the current cookie design acceptable to retain unchanged? **No.** It ships vulnerable merging code and can persist replayable credentials, including a password, for seven days.

## Exact dependency identity

The v3 lockfile records:

- `@osjs/client@3.7.1`, integrity `sha512-Ov99zmdlzD2uOaVPpKy4xD2WA45wtTCgplDbgt3qzhyfU7j70fJwlMJ3SWX3xCc2lFvf2o7AQBczHdPxGpmQdA==`.
- A direct client dependency on `js-cookie@^2.2.1`.
- `js-cookie@2.2.1`, integrity `sha512-HvdH2LzI/EAZcUwA8+0nKNtWHqS+ZmijLA30RwZA0bo7ToCckjK5MkGhjED9KoRcXO6BaGI3I9UIzSA1FKFPOQ==`.

The exact npm tarballs were inspected outside the project tree. `@osjs/client` publishes bundled output and a source map; the source map contains its original authentication and configuration sources.

The reviewed upstream advisory marks `js-cookie <=3.0.5` affected and `3.0.7` patched. Version 2.x is no longer supported upstream. The flaw is a per-instance prototype hijack: a JSON object's own `__proto__` property is assigned into a plain merge target, and a later `for...in` serializes inherited attacker-controlled cookie attributes.

## Cookie call inventory

All `js-cookie` use in `@osjs/client@3.7.1` is confined to `src/auth.js`:

| Operation | Trigger | Inputs | Attributes | Security significance |
|---|---|---|---|---|
| `Cookies.get(settings.name)` | Authentication UI opens and `auth.cookie.enabled` is true | Configured cookie name | None | Reads JavaScript-visible persisted login JSON and passes it to `JSON.parse`, then login. |
| `Cookies.set(settings.name, JSON.stringify(values), ...)` | Adapter reports successful login and persistence is enabled | Configured name; submitted login object | `{expires: settings.expires, sameSite: 'strict'}` | Persists the complete submitted login object. Default form fields are username and password. |
| `Cookies.remove(settings.name)` | Successful login while persistence is disabled | Configured name | Library defaults | Attempts deletion at the default path. |
| `Cookies.remove(settings.name)` | Successful logout | Configured name | Library defaults | Attempts deletion at the default path. |

No use of `Cookies.defaults`, `withConverter`, `getJSON`, or caller-supplied attribute objects was found. No other cookie wrapper exists in the fork source.

## Configuration and trust boundaries

The published client defaults are:

```js
auth: {
  cookie: {
    name: 'osjs.auth',
    expires: 7,
    enabled: false,
    secure: false
  }
}
```

Important observations:

- Persistence is disabled by default, which reduces default reachability.
- When enabled, the stored value is `JSON.stringify(values)`. The default login form supplies `username` and `password`, so the cookie is a replayable credential container rather than a server-issued opaque session identifier.
- The cookie is readable by any script executing in the origin because JavaScript cannot create `HttpOnly` cookies.
- The write hard-codes `sameSite: 'strict'` and uses the library's default path `/`.
- The configured `secure` value is never passed to `Cookies.set`; setting `auth.cookie.secure: true` therefore does not protect this cookie.
- No explicit domain is written, which is preferable to widening domain scope.
- Removal relies on default attributes. A replacement must delete using exactly the same path and any other scope attributes used at creation.
- The cookie value is parsed without schema validation and is immediately submitted to the configured authentication adapter.

Trust sources are:

| Input | Expected owner | Current validation |
|---|---|---|
| `auth.cookie.enabled`, `name`, `expires`, `secure` | Deployment configuration | No cookie-specific runtime schema found. |
| Login `values` | Login UI or custom login adapter | No persistence allowlist; entire object is serialized. |
| Existing cookie value | Any same-origin script and browser cookie state | JSON syntax only; no shape, type, or key allowlist. |
| Cookie attributes passed to `js-cookie` | OS.js authentication source | Locally constructed object; not directly JSON-derived. |

## Advisory reachability

The advisory's demonstrated path requires a JSON-derived object containing an own enumerable `__proto__` property to be forwarded as cookie attributes. Current OS.js does not forward configuration or login JSON as the attributes object; it creates a new object literal containing only `expires` and `sameSite`. Therefore the exact per-instance exploit described by the advisory is **not directly reachable through the identified OS.js call site**.

That does not make the dependency acceptable:

- The affected merge and inherited-property enumeration code is bundled into the browser artifact.
- The library's `for...in` loops can serialize inherited properties if another flaw pollutes a relevant prototype.
- Future configuration plumbing could accidentally expose the advisory path.
- The production audit remains high severity until the affected package is absent or upgraded beyond the affected range.
- A blind override to 3.x would leave credential persistence, ignored secure configuration, parsing, deletion, and compatibility behavior unresolved.

Reachability is therefore **currently constrained but the shipped component and design remain unacceptable**.

## Security properties G2 must establish

The replacement design must decide the persistence model before implementation. Required properties are:

1. Do not persist passwords or arbitrary login-form objects.
2. Prefer a server-issued, `HttpOnly`, `Secure`, appropriately `SameSite` session cookie when server authentication is used. Browser JavaScript should not manage that cookie.
3. If a browser-managed non-secret preference is genuinely required, use a narrow internal adapter with fixed policy and an allowlist—not a generic attribute passthrough.
4. Treat cookie name and policy as trusted deployment configuration validated once; reject prototype keys, inherited keys, getters, unsupported attributes, invalid types, and control characters.
5. Make creation and deletion scope identical and test both.
6. Parse any retained client value into a null-prototype or schema-validated structure before use.
7. Prove `js-cookie` is absent from the production lock graph and built artifact.
8. Add regression tests for JSON `__proto__`, `constructor`, `prototype`, inherited attributes, hostile getters, malformed values, and scope-policy overrides.

## Options to carry into P2

### Option A — Remove client credential persistence (preferred)

Delete the authentication cookie read/write path. Let the server own session continuity through an opaque `HttpOnly` session cookie. Logout remains a server action; the client stores no credentials.

This produces the smallest browser attack surface and directly addresses the credential-design flaw. It requires verifying server adapter/session behavior and defining standalone-mode behavior.

### Option B — Replace with a minimal fixed-policy adapter

Use a small fork-owned module only for explicitly approved non-secret persistence. The module would expose purpose-specific operations rather than generic attributes, encode names/values, use own-property checks, and enforce fixed `Path`, `Secure`, and `SameSite` policy.

This is acceptable only if P2 identifies a concrete browser-managed value that cannot be replaced by server session state. It must never persist the password or arbitrary form fields.

### Option C — Upgrade `js-cookie` and retain current behavior

This removes the named advisory if upgraded to a patched version, but it does not fix credential persistence or ignored policy configuration. Version 3 also changes APIs and behavior. This option is insufficient as the G2 design by itself.

## P1 decision

G2 is solving two linked problems: removing an affected browser dependency and eliminating unsafe credential persistence. The preferred planning assumption is Option A: remove the client-managed authentication cookie entirely and rely on the server's session mechanism. P2 must validate that assumption against server and standalone authentication flows, define compatibility requirements, and specify the evidence needed to prove removal.

## Evidence sources

- Exact `package-lock.json` entries and pinned integrity values in this fork.
- Exact npm tarballs for `@osjs/client@3.7.1` and `js-cookie@2.2.1`.
- Published client source map entries for `src/auth.js` and `src/config.js`.
- [GitHub reviewed advisory GHSA-qjx8-664m-686j](https://github.com/js-cookie/js-cookie/security/advisories/GHSA-qjx8-664m-686j).
- [Upstream js-cookie releases](https://github.com/js-cookie/js-cookie/releases).

## Exit assessment

P1 is complete. The affected component, all current call sites, data flow, exploit preconditions, additional credential risk, compatibility boundary, and remediation options are documented. Continue to P2 G2 to design the selected approach.
