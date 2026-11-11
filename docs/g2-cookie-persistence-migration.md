# G2 authentication cookie migration

The forked client no longer supports browser-managed authentication persistence. Submitted login values are never written to cookies, local/session storage, or IndexedDB, and the client no longer reads or deletes legacy authentication cookies.

## Configuration change

Remove the `auth.cookie` configuration block from deployments.

- An own Boolean `enabled: true` value causes authentication initialization to reject with a migration error.
- An own Boolean `enabled: false` value is tolerated for the migration window but has no effect.
- Inherited `enabled` values are ignored.
- Accessors and non-Boolean own `enabled` values are rejected without invoking an accessor.

Do not replace this setting with another client-side password or login-object store. Server mode continues to rely on server-owned session state; without a separately reviewed session-resume feature, reload requires explicit login.

## One-time legacy-cookie cleanup

The steady-state client deliberately contains no generic cookie API. Deployments that previously enabled credential persistence must expire the old cookie from a trusted server or reverse-proxy response before rollout.

For the default legacy cookie, send a one-time response header over HTTPS:

```http
Set-Cookie: osjs.auth=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Strict; Secure
```

The legacy client used `Path=/`, no `Domain`, and ignored its configured `secure` value. Do not add a `Domain` attribute to cleanup unless the deployment can prove the old cookie was created with that exact domain scope. Deployments that changed the cookie name must use that fixed reviewed name; do not expose the name or attributes to request input.

Remove the cleanup header after the migration window. Verify in a browser that the legacy cookie is absent, then verify that login, reload, and logout do not recreate it.

## Operational expectations

- Existing server-session cookies are not managed by browser JavaScript.
- Reload may present the login UI instead of replaying stored credentials.
- Logout still calls the selected adapter, destroys client state, emits the existing logout event, and reloads by default.
- Standalone authentication behavior remains available without client cookie manipulation.

Server session-secret management, cookie flags, session-store selection, fixation defenses, and expiry policy remain G5 work and are not approved by this migration.
