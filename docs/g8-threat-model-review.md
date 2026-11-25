# G8 deployment threat-model review

**Scope:** browser-only static distribution on `codex/rm-sec-001-g1-baseline`.
**Server:** `src/server` remains development-only and fail-closed; it is not a
shipping surface and must not be started in production without a separate
security-owner approval.

## Assets and trust boundaries

| Asset | Boundary | Control |
| --- | --- | --- |
| Browser bundle `dist/` | Static host → browser | Exact allowlist, artifact walk, static-host smoke test. |
| Package links | `dist/apps` etc. → reviewed `node_modules`/`vendor` `dist` | Link target check; only reviewed package roots resolve. |
| User VFS settings | Browser storage | Safe merge, bounded size, hostile-input tests. |
| Session cookie | Development Node server only | `httpOnly`, `SameSite=Lax`, `Secure`; production startup fails closed. |
| Build and release credentials | CI only | No credential in the artifact; tracked-file secret scan. |

## Threat review

| Threat | Result | Evidence |
| --- | --- | --- |
| Cookie theft through unsafe merge or cross-site send | Mitigated in the development server; not shipped | G2 tests, `cookie: {httpOnly, sameSite, secure}`. |
| Prototype pollution through settings or metadata merge | Mitigated | G3 green suites; hostile-input suite. |
| Malformed metadata or package input crashes the shell | Mitigated and bounded | G5 hostile-input suite. |
| Resource exhaustion through large or deeply nested input | Bounded; the static host has no request parser | G5 DoS suite with a constrained heap; G6 static host. |
| Server, CLI, test or build files leak into the artifact | Blocked | G6 artifact walk. |
| Unreviewed runtime package enters the bundle | Blocked | Production SBOM equals allowlist; lockfile review. |
| Secret in the repository or artifact | Blocked by scan | `scan-secrets.cjs` in continuous CI. |
| Cross-origin `postMessage` spoofs an iframe event | Blocked by origin check | CodeQL finding resolved in `vendor/osjs-client/src/core.js`. |
| Static host serves source, manifests or traversal paths | Blocked by host contract | G6 static-host test returns 404/405. |

## Reverse proxy and browser headers

The repository ships no reverse proxy. A deployment must terminate TLS and add
at least:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains`;
- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: no-referrer`;
- `Permissions-Policy` denying unused capabilities.

`style-src 'unsafe-inline'` is required by the current runtime styling model and
is recorded as residual risk. The static host must not serve `package.json`,
source maps outside the reviewed set, or directory listings.

## Credentials

No production credential is required or stored. CI uses the repository token
only for checkout, artifact upload and workflow APIs. Secret scanning covers
tracked text files; the scan found no finding at the G7/G8 evidence commit.
