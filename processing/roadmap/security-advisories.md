# Security advisory log

| ID | Package | Advisory | Severity | State | Evidence | Owner | Expiry |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ADV-001 | `tmp@0.0.33` via `@osjs/cli` → `inquirer` → `external-editor` | Symlink path traversal in `tmp` | High (development) | Resolved by `overrides: tmp@0.2.7` | Production audit zero; full audit no longer reports `tmp`; `npm test` and `package:discover` pass | Security owner at G8 T8.5 | n/a |
| ADV-002 | `postcss@7.0.39` via `stylelint@13.13.1` | `GHSA-7fh5-64p2-3v2j`, `GHSA-qx2v-qp2m-jg93`, `GHSA-6g55-p6wh-862q`, `GHSA-fxqj-rqcc-2cmp`, `GHSA-r28c-9q8g-f849` | High (development) | Accepted exception `EX-001` | Production audit zero; production SBOM and `dist/` contain no PostCSS | Security owner at G8 T8.5 | 2027-02-28 |
| ADV-003 | Development tree | Nine moderate findings under build and lint tooling | Moderate (development) | Tracked, below the high gate | Full audit JSON retained in continuous CI; production audit zero | Security owner at G8 T8.5 | Review at G8 |

New findings enter this table with the audit run identifier and the commit that
produced them. Accepted findings link to an entry in
`docs/security-exceptions.md`.
