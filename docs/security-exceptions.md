# Security advisory exceptions

A production high/critical exception is prohibited. A development-only advisory
may be proposed for conditional treatment if it cannot reach the shipped browser
artifact; **human acceptance remains mandatory** before T8.5 can close.
Every exception requires the fields below. The automated
`scripts/security/audit-gate.cjs` currently validates the production-zero
constraint, the known development-only high package, its lockfile `dev` flags,
and its expiry. **It does not validate a human signature or a named owner's
identity.** The T8.5 sign-off process must enforce those additional conditions.

## Required fields

| Field | Content |
| --- | --- |
| ID | Stable identifier, for example `EX-001`. |
| Package and version | Exact affected package and resolved version. |
| Advisory | Advisory identifier and link. |
| Severity | npm severity and the gate it would otherwise fail. |
| Owner | Named human owner who accepts the risk. |
| Reachability evidence | Why the package cannot reach the production graph or artifact. |
| Compensating control | What prevents exploitation despite the finding. |
| Expiry | Date after which the gate fails until the exception is renewed or removed. |
| Review trigger | Event that forces re-review, such as a toolchain upgrade or a new advisory. |

## EX-001 — PostCSS 7 in stylelint tooling

| Field | Content |
| --- | --- |
| Package | `postcss@7.0.39` nested under `stylelint@13.13.1`. |
| Advisory | `GHSA-7fh5-64p2-3v2j`, `GHSA-qx2v-qp2m-jg93`, `GHSA-6g55-p6wh-862q`, `GHSA-fxqj-rqcc-2cmp`, `GHSA-r28c-9q8g-f849`. |
| Severity | High in the full development tree. |
| Proposed owner / actual accepting owner | Pending named security owner at G8 T8.5 — **not accepted or assigned**. |
| Reachability evidence | The production SBOM contains 32 recursively listed browser components and no PostCSS; `dist/` contains no PostCSS. The package is reachable only from the SCSS linter. |
| Compensating control | Production audit is zero; stylelint reads repository-owned SCSS, not attacker input; the distribution scan and production SBOM checks run in G4 and continuous CI. |
| Expiry | 2027-02-28. |
| Review trigger | Stylelint upgrade, `@osjs/stylelint-config` upgrade, or a new PostCSS advisory. |
| Technical disposition | Meets the automated conditional development-only gate; **human ACCEPT / REJECT / DEFER remains PENDING** in `docs/g8-security-signoff.md`. |

Resolved development findings are recorded in
`processing/roadmap/security-advisories.md`; they do not need an exception.

## EX-002 — Nine moderate development-tooling findings (human decision pending)

| Field | Content |
| --- | --- |
| Packages | `@osjs/stylelint-config`, `autoprefixer`, `postcss-less`, `postcss-safe-parser`, `postcss-sass`, `postcss-scss`, `stylelint`, `stylelint-scss`, `sugarss`. Exact package versions and advisories must be reconciled with the retained full-audit JSON by the reviewer. |
| Severity | Moderate (nine package-level full-tree findings). |
| Owner | Pending named security owner at G8 T8.5. |
| Reachability evidence | Classified as development lint/build tooling, absent from reviewed production SBOM and browser artifact. |
| Compensating control | Pinned build/CI tooling, production-zero audit, reviewed browser-runtime allowlist and CI security scans. |
| Expiry | 2027-02-28 (proposed; requires human acceptance). |
| Review trigger | Dev lint-toolchain upgrade, new advisory or candidate rebuild. |
| Human decision | **PENDING** — must be recorded in `docs/g8-security-signoff.md`. |

The full-audit result is time-sensitive. Re-evaluate EX-001 and EX-002
against a fresh audit if the release candidate or lockfile changes. Neither
exception is a permission to ship vulnerable development packages.
