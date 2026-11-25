# Security release checklist

No MI-P6 handoff, release, deployment or production server start is allowed
until every item is checked against a clean commit and retained evidence.

## Evidence

- [ ] Clean-room `npm ci --ignore-scripts` on the release commit.
- [ ] `npm run package:discover` reports the expected package count.
- [ ] `npm run build` succeeds and `dist/` matches
      `scripts/security/browser-runtime-allowlist.json`.
- [ ] Production audit is 0 critical, 0 high, 0 moderate and 0 low.
- [ ] Full audit has no unrecorded critical or high finding.
- [ ] Production SBOM matches the allowlist exactly and has zero unresolved
      references.
- [ ] G2, G3, G4 evidence workflows pass and artifacts are retained.
- [ ] G5 startup and boundary suites pass.
- [ ] G6 artifact and static-host suites pass.
- [ ] Continuous security workflow and CodeQL pass.
- [ ] Secret scan reports no finding.
- [ ] Dependency review reports no high or critical addition.

## Decisions

- [ ] Every advisory in `processing/roadmap/security-advisories.md` is resolved
      or has an unexpired exception in `docs/security-exceptions.md`.
- [ ] No production exception is high or critical.
- [ ] Residual risks, owners and expiry dates are recorded.
- [ ] A named human security owner signs the evidence.
- [ ] The MI-P6 unblock decision is recorded with the owner, date and commit.

## Boundaries

- [ ] Production Node server startup remains fail-closed unless the security
      owner explicitly approves a change.
- [ ] The browser-only static distribution remains the shipping boundary.
- [ ] Draft PR #1 is not merged or marked ready by the agent.
