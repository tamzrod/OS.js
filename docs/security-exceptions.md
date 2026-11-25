# Security advisory exceptions

An exception is allowed only when the finding cannot reach the shipped browser
artifact and a named owner accepts the residual risk. Every exception records
all fields below. Missing or expired fields fail `scripts/security/audit-gate.cjs`
and block G8.

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
| Owner | Security owner at G8 T8.5 (name to be recorded with sign-off). |
| Reachability evidence | The production SBOM contains 32 recursively listed browser components and no PostCSS; `dist/` contains no PostCSS. The package is reachable only from the SCSS linter. |
| Compensating control | Production audit is zero; stylelint reads repository-owned SCSS, not attacker input; the distribution scan and production SBOM checks run in G4 and continuous CI. |
| Expiry | 2027-02-28. |
| Review trigger | Stylelint upgrade, `@osjs/stylelint-config` upgrade, or a new PostCSS advisory. |

Resolved development findings are recorded in
`processing/roadmap/security-advisories.md`; they do not need an exception.
