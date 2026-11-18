# P1 G5 — Understand required server capabilities and attack surface

## Problem

G4 modernized the browser build, but the installed production graph still has 17 high and 2 critical findings. G5 must reduce and patch the server-facing graph without assuming that every legacy OS.js capability is required by Media Intelligence.

The repository currently contains no Media Intelligence deployment profile or capability allowlist. Therefore, source registration proves what the generic OS.js server enables, but it does not prove what the product requires. The safe G5 problem is to create that allowlist, remove unneeded surfaces, and patch retained paths before adding resource-limit tests.

## Enabled baseline

`src/server/index.js` unconditionally registers all five official providers:

1. Core HTTP, static assets, sessions, body parsing, WebSocket, proxy initialization, and development watching.
2. Package metadata.
3. VFS, including multipart upload and mutable home storage.
4. Authentication, including registration, login, and logout routes.
5. Settings persistence.

`src/server/config.js` overrides only root, port, and public directory. Every other legacy default remains active:

- Development mode is enabled unless `NODE_ENV` starts with `prod`, enabling no-cache middleware and a filesystem watcher.
- The default null authentication adapter accepts any supplied username for registration or login without credential verification.
- The default session secret is the public literal `osjs` and the Loki session store is enabled.
- WebSocket `/` is always installed and accepts client event messages.
- VFS exposes a read-only distribution mount and a writable per-username home mount.
- Multipart parsing permits 20 MiB fields and 200 MiB files; JSON/raw/urlencoded bodies use 100 KiB.
- Reverse proxy support is installed even though the default proxy list is empty.
- TLS is disabled and hostname defaults to localhost.

These defaults are unsuitable as a production security policy. In particular, null authentication plus username-derived home paths means identity and writable storage boundaries are not trustworthy merely because routes are marked authenticated.

## Finding ownership

The clean G4 evidence assigns the production high/critical findings to these surfaces:

| Surface | Severe packages | Reachability |
|---|---|---|
| HTTP/body/session | `body-parser`, `express`, `path-to-regexp`, `proxy-addr`, `qs` | Loaded unconditionally by core startup |
| WebSocket | `ws` | WebSocket root route installed unconditionally |
| Server discovery/VFS/tooling | `brace-expansion`, `braces`, `decode-uri-component`, `glob-parent`, `micromatch`, `minimatch`, `minimist`, `moment`, `picomatch`, `source-map-resolve`, `tmp` | Installed through server/VFS/CLI chains; several are reachable through package discovery, search, development watching, or command processing |
| Media application | `@osjs/musicplayer-application`, `music-metadata` | Direct production application dependency; removable unless explicitly required |

The two critical findings are `proxy-addr` and `minimist`. The only direct severe root finding is the music player application; the remaining severe findings are transitive.

## Capability decisions required

The following capabilities must be explicitly marked required or removed. Silence must mean disabled:

- Static browser artifact hosting.
- Authenticated API/session support.
- Registration versus administrator-provisioned identity only.
- Server-owned settings persistence.
- Read-only distribution VFS.
- Writable user VFS and uploads.
- VFS search and filesystem watching.
- WebSocket notifications/application messaging.
- Reverse proxy routes.
- Runtime package discovery and CLI generators.
- Music player and server-side media metadata parsing.
- Development file watching in any deployed image.

## Provisional least-privilege baseline

Until a product requirement proves otherwise, G5 should:

- Retain static artifact hosting only as an optional deployment mode; G6 will produce a server-free browser distribution.
- Require a real, explicit authentication adapter before enabling sessions, settings, or writable VFS.
- Disable public registration, proxying, development watching, VFS watching/search/upload, runtime generators, and the music player/media parser.
- Keep WebSocket disabled unless a concrete Media Intelligence message flow and authentication rule is documented.
- Treat package metadata and the read-only distribution mount as build-time/static data where possible.
- Fail startup in production when the null auth adapter, default session secret, development mode, or unbounded/unreviewed capability is present.

This is a planning baseline, not authorization to remove product-required behavior. P2 must turn the capability table into explicit configuration and acceptance criteria.

## Security test implications

Retained HTTP paths require bounded tests for body size, malformed compression/query input, headers, request/connection timeouts, and trust-proxy behavior. Retained WebSocket paths require header/fragment/message/connection limits. Retained VFS uploads require file, field, part, temporary-file, path, and decompression boundaries. Authentication tests must prove that an arbitrary username cannot establish an authenticated session.

## P1 decision

The problem is not a blind dependency upgrade. The generic server currently enables more authority than the repository can justify, and vulnerable packages sit on unconditional startup paths. G5 will be capability-first: define an allowlist, remove disabled providers and applications, then upgrade or replace the minimal retained graph and add limits.

Proceed to P2 G5 to design the server capability allowlist, production fail-closed policy, dependency-removal order, and verification gates.

## Continue

[▶ Continue to P2 G5 — Plan the minimal server security boundary](#p1-decision)
