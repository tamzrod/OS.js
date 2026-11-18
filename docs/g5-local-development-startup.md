# G5 — Explicit loopback-only legacy development startup

## Security policy

The legacy OS.js server uses a permissive null authentication adapter in its
development configuration. Previously, an unset `NODE_ENV` implied development,
and the HTTP listener called `listen(port)`, which binds on all interfaces
despite the displayed hostname. This was unsafe for unattended or remotely
reachable development deployments.

**Default:** refuse to start the Node server. A production deployment remains
blocked by the G5 fail-closed capability gate. The static browser build
(`npm run build`) does not require the Node server.

For isolated local development only, set both of these variables explicitly:

```bash
NODE_ENV=development OSJS_UNSAFE_LOCAL_DEV=true npm run serve
```

The root `src/server/config.js` sets `hostname: '127.0.0.1'`, and
`vendor/osjs-server/src/core.js` supplies that hostname to the actual
HTTP listener. The local server is **not** a production-safe authentication
service. Do not expose it through a reverse proxy or port-forwarding rule.

## Fail-closed cases

- Missing `NODE_ENV` or missing/false/non-exact `OSJS_UNSAFE_LOCAL_DEV`.
- `NODE_ENV=test` with development opt-in.
- `NODE_ENV=production`, regardless of the development opt-in.
- A selected `OSJS_DEPLOYMENT_PROFILE=server` or `browser-only`; both
  remain blocked until separately reviewed and approved.
- A development opt-in with `OSJS_CAPABILITIES` set: no implicit capability
  expansion is allowed.

The explicit development switch permits only the existing local demonstration
server, not a bypass of G5 production-release requirements.

## Verification evidence

- The Windows/Linux baseline build previously failed on PowerShell evaluation
  of JS backticks embedded in `node -e`. The workflow now invokes the
  cross-platform `scripts/verify-toolchain.cjs` instead.
- [Baseline build matrix 44206090743](https://github.com/tamzrod/OS.js/actions/runs/44206090743):
  both Ubuntu and Windows jobs completed successfully, including toolchain
  verification, `npm ci`, package discovery and browser build.
- [G5 startup regression 44206224709](https://github.com/tamzrod/OS.js/actions/runs/44206224709):
  passing tests after explicit-opt-in and loopback assertions were corrected.
- Negative tests in `scripts/security/g5-capability-contract.test.cjs`
  verify rejected missing and invalid opt-ins and rejection before server
  dependency imports. They also check the configured bind hostname and call
  site. Full hostile-input server audit and externally tested listener/network
  isolation remain future G5 work.

G5/T5.2 remains open. Production Node server start remains disabled.
This change does not merge PR #1 or authorize deployment.
