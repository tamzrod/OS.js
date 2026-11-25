# G8 residual-risk register

**Rule:** no production high or critical exception is permitted. The table is a
**technical risk disposition proposal**, not a signed human approval. Every
item remains **PENDING HUMAN REVIEW** until the named security owner records
its individual decision, accountable ownership and applicable expiry/review
trigger in `docs/g8-security-signoff.md`.

| ID | Finding | Severity | Surface | Owner | Expiry | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| EX-001 | `postcss@7.0.39` under `stylelint@13.13.1` (`GHSA-7fh5-64p2-3v2j`, `GHSA-qx2v-qp2m-jg93`, `GHSA-6g55-p6wh-862q`, `GHSA-fxqj-rqcc-2cmp`, `GHSA-r28c-9q8g-f849`) | High | Development lint only; absent from production SBOM and `dist/` | Pending named security owner at T8.5 | 2027-02-28 | **PENDING HUMAN ACCEPTANCE** — technical containment supported by production-zero audit and artifact checks. |
| EX-002 | Nine moderate development findings: `@osjs/stylelint-config`, `autoprefixer`, `postcss-less`, `postcss-safe-parser`, `postcss-sass`, `postcss-scss`, `stylelint`, `stylelint-scss`, `sugarss` | Moderate | Development lint and build tooling; absent from production SBOM | Pending named security owner at T8.5 | 2027-02-28 | **PENDING HUMAN ACCEPTANCE** — below the high automated gate; production audit zero. |
| RR-001 | External-origin iframe applications no longer receive `osjs/iframe:message` events | Medium | Browser runtime | Pending named security owner at T8.5 | Next runtime review | **PENDING HUMAN ACCEPTANCE** — proposed same-origin supported model; origin check prevents spoofing. |
| RR-002 | Development server forces `Secure` cookies, so plain-HTTP LAN development sessions do not persist | Low | Development server | Pending named security owner at T8.5 | Next server change | **PENDING HUMAN ACCEPTANCE** — proposed local-only exception; production server remains fail-closed. |
| RR-003 | Static-host security headers are deployment-owned | Medium | Deployment | Pending named security owner at T8.5 | Each deployment | **PENDING HUMAN ACCEPTANCE** — a deployment owner must verify external security headers separately. |
| RR-004 | `style-src 'unsafe-inline'` in the recommended CSP | Low | Deployment | Pending named security owner at T8.5 | Next runtime styling change | **PENDING HUMAN ACCEPTANCE** — proposed temporary CSP style exception until styling review. |

## Resolution state

- Critical production advisories: none.
- High production advisories: none.
- Moderate or low production advisories: none.
- Full-tree high: one, `postcss`, development-only, **technically conditionally allowed by CI** as `EX-001`; final human acceptance pending.
- CodeQL: all first-run findings are resolved. OSJS-SEC-FIX-001 replaced the import-manifest check-then-write with exclusive creation; candidate `d16f480` check run `139075875714` reports zero annotations and all ten visible PR review threads are resolved. The alert-inventory API remains inaccessible (`403`), so the human reviewer must inspect the Security tab.

## Human decision routing

Record **ACCEPT / REJECT / DEFER** for each of EX-001, EX-002, RR-001,
RR-002, RR-003 and RR-004 in [T8.5 sign-off](g8-security-signoff.md).
Proposed review dates such as "next runtime review" and "each deployment"
are not fixed calendar expiries; the approving owner must specify a review
trigger, accountable party and any date required by policy.

MI-P6 unblock and deployment security approval are independent decisions.
Nothing in this register authorizes production Node startup, deployment,
release, PR merge or a change to draft status.
