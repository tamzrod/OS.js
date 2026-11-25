# RM-SEC-001 — T8.5 release/security checklist

**Prepared:** 2026-11-25  
**Status:** TECHNICAL EVIDENCE RECONCILED; HUMAN APPROVAL PENDING  
**Exact release-candidate code SHA:** `d16f480ff52849565ff12031c46642814a8d340a`  
**Prior records SHA:** `d16f480ff52849565ff12031c46642814a8d340a` (later documentation-only commits follow)  
**Approval record:** [G8 T8.5 sign-off](g8-security-signoff.md).

A checked **technical** item means CI evidence exists, not that a named security owner has accepted the full release risk. New code/lock changes require new candidate evidence. No MI-P6 handoff, release, deployment, production Node startup or PR merge is authorized by this checklist.

## Technical gates — verified on release-candidate CI (not human authorization)

- [x] Clean-room `npm ci --ignore-scripts` and locked toolchain on release candidate. [G4 45576463959](https://github.com/tamzrod/OS.js/actions/runs/45576463959).
- [x] `npm run package:discover` reports 10 packages; production browser build succeeds. [G4 45576463959](https://github.com/tamzrod/OS.js/actions/runs/45576463959) and [continuous 45576440981](https://github.com/tamzrod/OS.js/actions/runs/45576440981).
- [x] Built `dist/` passes `scripts/security/browser-runtime-allowlist.json`, forbidden-content and static-host tests. [G4 45576463959](https://github.com/tamzrod/OS.js/actions/runs/45576463959).
- [x] Production npm audit: 0 critical / 0 high / 0 moderate / 0 low. [Continuous 45576440981](https://github.com/tamzrod/OS.js/actions/runs/45576440981) and [G4 45576463959](https://github.com/tamzrod/OS.js/actions/runs/45576463959).
- [x] Full-tree audit: 0 critical / 1 high / 9 moderate; only high `postcss@7.0.39` classified development-only with pending human acceptance EX-001. Same runs.
- [x] Production CycloneDX SBOM: 32 components / 33 dependency entries / 0 unresolved; allowlist and reachability checks. [G4 evidence 45576463959](https://github.com/tamzrod/OS.js/actions/runs/45576463959).
- [x] G2 clean evidence and retained artifact. [45576456286](https://github.com/tamzrod/OS.js/actions/runs/45576456286), artifact `15004127936`.
- [x] G3 clean evidence and retained artifact. [45576459854](https://github.com/tamzrod/OS.js/actions/runs/45576459854), artifact `15004133171`.
- [x] G4 clean evidence and retained artifact. [45576463959](https://github.com/tamzrod/OS.js/actions/runs/45576463959), artifact `15004646816`; G4 steps ran even though shared workflow display name says G3.
- [x] G5 fail-closed server, hostile-input and boundary regressions. [45576440870](https://github.com/tamzrod/OS.js/actions/runs/45576440870), [45576449433](https://github.com/tamzrod/OS.js/actions/runs/45576449433).
- [x] G6 artifact and static-host tests. [G4 45576463959](https://github.com/tamzrod/OS.js/actions/runs/45576463959).
- [x] G7 continuous security and CodeQL workflows pass on candidate push and PR. [Continuous 45576440981](https://github.com/tamzrod/OS.js/actions/runs/45576440981) / [45576449365](https://github.com/tamzrod/OS.js/actions/runs/45576449365), [CodeQL 45576440988](https://github.com/tamzrod/OS.js/actions/runs/45576440988) / [45576449327](https://github.com/tamzrod/OS.js/actions/runs/45576449327). CodeQL check run `139075875714` has zero annotations.
- [x] OSJS-SEC-FIX-001 TOCTOU remediation: exclusive manifest creation, five regression cases, all original and follow-up review threads resolved. [G4 45576463959](https://github.com/tamzrod/OS.js/actions/runs/45576463959), [continuous 45576440981](https://github.com/tamzrod/OS.js/actions/runs/45576440981).
- [x] Tracked-file secret-pattern scan passes continuous CI; this is not a comprehensive external credential inventory. [45576440981](https://github.com/tamzrod/OS.js/actions/runs/45576440981).
- [x] PR lockfile review script executed within successful continuous PR CI and enforced production allowlist changes. [45576449365](https://github.com/tamzrod/OS.js/actions/runs/45576449365). This is **not** GitHub's dependency-review API.

## Independent reviewer acceptance — must be completed by named human

- [ ] Review current CodeQL open-alert inventory and original PR review comments; close or explicitly disposition any unresolved alert. All ten visible review threads are resolved, and the candidate check run has zero annotations, but the alert-inventory API returned `403`; manual Security-tab inspection is still required.
- [ ] Review the retained G2/G3/G4/continuous artifact internals, hashes, the actual static distribution, threat model and production SBOM.
- [ ] Confirm each advisory in `processing/roadmap/security-advisories.md` is resolved or subject to a valid, explicitly signed exception.
- [ ] Accept or reject **EX-001** (PostCSS high, development-only, expires 2027-02-28), naming the owner and review cadence.
- [ ] Accept or reject **EX-002** (nine moderate development-tool findings, expiry 2027-02-28), naming the owner and review cadence.
- [ ] Accept or reject **RR-001, RR-002, RR-003, RR-004** individually, documenting controls, owner, and revisit condition.
- [ ] Confirm zero high/critical **production** exceptions, with no hidden runtime paths; the current production audit has zero findings.
- [ ] Verify an actual deployment's TLS, CSP, HSTS, headers, host configuration and monitoring **separately before deployment**; documentation alone cannot satisfy this.
- [ ] Enter a named security owner, their authority, date, reviewed commit and evidence identifiers, decision, and signature in `docs/g8-security-signoff.md`.
- [ ] Explicitly record the MI-P6 decision (UNBLOCK / REMAIN BLOCKED / CONDITIONAL, with conditions) in the sign-off file.

## Non-negotiable boundaries

- [x] Code policy retains **fail-closed** Node production startup at the reviewed candidate. [G5 45576440870](https://github.com/tamzrod/OS.js/actions/runs/45576440870).
- [x] Browser-only/static is the reviewed shipping boundary. [G6 evidence in G4 45576463959](https://github.com/tamzrod/OS.js/actions/runs/45576463959).
- [x] At package preparation PR #1 is open/draft/unmerged; verify again immediately before human decision.
- [ ] Security owner has explicitly approved any change to those boundaries (none is presently sought).

**STOP:** The status remains `AWAITING_HUMAN_APPROVAL`. No automation may check human-decision boxes, declare MI-P6 unblocked, merge, release or deploy.
