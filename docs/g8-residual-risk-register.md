# G8 residual-risk register

**Rule:** no production high or critical exception is permitted. Every accepted
finding has an owner, a reachability statement and an expiry.

| ID | Finding | Severity | Surface | Owner | Expiry | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| EX-001 | `postcss@7.0.39` under `stylelint@13.13.1` (`GHSA-7fh5-64p2-3v2j`, `GHSA-qx2v-qp2m-jg93`, `GHSA-6g55-p6wh-862q`, `GHSA-fxqj-rqcc-2cmp`, `GHSA-r28c-9q8g-f849`) | High | Development lint only; absent from production SBOM and `dist/` | Security owner at T8.5 | 2027-02-28 | Accepted with production-zero audit and artifact checks. |
| EX-002 | Nine moderate development findings: `@osjs/stylelint-config`, `autoprefixer`, `postcss-less`, `postcss-safe-parser`, `postcss-sass`, `postcss-scss`, `stylelint`, `stylelint-scss`, `sugarss` | Moderate | Development lint and build tooling; absent from production SBOM | Security owner at T8.5 | 2027-02-28 | Accepted below the high gate; production audit zero. |
| RR-001 | External-origin iframe applications no longer receive `osjs/iframe:message` events | Medium | Browser runtime | Security owner at T8.5 | Next runtime review | Accepted: same-origin applications are the supported model; origin check prevents spoofing. |
| RR-002 | Development server forces `Secure` cookies, so plain-HTTP LAN development sessions do not persist | Low | Development server | Security owner at T8.5 | Next server change | Accepted: localhost is treated as trustworthy by browsers; production server remains fail-closed. |
| RR-003 | Static-host security headers are deployment-owned | Medium | Deployment | Security owner at T8.5 | Each deployment | Accepted: documented in the threat-model review; the repository cannot enforce host headers. |
| RR-004 | `style-src 'unsafe-inline'` in the recommended CSP | Low | Deployment | Security owner at T8.5 | Next runtime styling change | Accepted: current runtime injects styles; scripts remain `'self'`. |

## Resolution state

- Critical production advisories: none.
- High production advisories: none.
- Moderate or low production advisories: none.
- Full-tree high: one, `postcss`, development-only, accepted as `EX-001`.
- CodeQL: all first-run findings resolved; no open alert in the PR check.
