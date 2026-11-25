# G8 / T8.5 — Human security-owner decision package

**Status:** AWAITING_HUMAN_APPROVAL — NO DECISION RECORDED  
**Prepared:** 2026-11-25 (documentation-only; not human sign-off)  
**Repository:** `tamzrod/OS.js`; **draft PR:** [#1](https://github.com/tamzrod/OS.js/pull/1)  
**Reviewed technical release candidate:** `d16f480ff52849565ff12031c46642814a8d340a`  
**Technical records baseline:** `d16f480ff52849565ff12031c46642814a8d340a` (this document is a later documentation-only commit)  
**Shipping boundary:** static browser-only artifact. The legacy OS.js Node production server remains blocked.

This file is a **form for a named human security owner**. It does **not** approve an exception, PR merge, release, deployment or MI-P6 resumption. Agents may prepare evidence but must never fill the human identity, decision, date, attestation or signature fields.

## 1. Technical evidence index (historical run results, not human authorization)

| Verification | Exact reference | Recorded result |
| --- | --- | --- |
| G2 clean cookie-security evidence | [45576456286](https://github.com/tamzrod/OS.js/actions/runs/45576456286) | Successful; artifact `15004127936`, sha256 `f7e86e66…b405a1` |
| G3 clean safe-object evidence | [45576459854](https://github.com/tamzrod/OS.js/actions/runs/45576459854) | Successful; artifact `15004133171`, sha256 `84effc97…6dd225e` |
| G4 clean build/security evidence | [45576463959](https://github.com/tamzrod/OS.js/actions/runs/45576463959) | Successful; 23/23 commands pass; artifact `15004646816`, sha256 `ef7b7194…99622a1` |
| Continuous security, push | [45576440981](https://github.com/tamzrod/OS.js/actions/runs/45576440981) | Successful; audit/SBOM/95 security tests; artifact `15004661838`, sha256 `57de0312…a021c` |
| Continuous security, PR | [45576449365](https://github.com/tamzrod/OS.js/actions/runs/45576449365) | Successful; PR merge-ref artifact `15004532023`, sha256 `c22dd940…17d099` |
| CodeQL, push / PR | [45576440988](https://github.com/tamzrod/OS.js/actions/runs/45576440988) / [45576449327](https://github.com/tamzrod/OS.js/actions/runs/45576449327) | Successful; check run `139075875714` has **zero annotations** |
| G5 startup/boundary, push / PR | [45576440870](https://github.com/tamzrod/OS.js/actions/runs/45576440870) / [45576449433](https://github.com/tamzrod/OS.js/actions/runs/45576449433) | Successful |
| Candidate Ubuntu/Windows build | [45576449346](https://github.com/tamzrod/OS.js/actions/runs/45576449346) | Successful on both runners |
| Lint tests | [45576449236](https://github.com/tamzrod/OS.js/actions/runs/45576449236) | Successful |

### CodeQL alert 5 / PR thread disposition

- Original nine review threads: eight resolved earlier; the TOCTOU thread
  [4689024229](https://github.com/tamzrod/OS.js/pull/1#discussion_r4689024229)
  is now resolved and outdated.
- A follow-up thread `4692176965` was raised on the first version of the new
  regression test. It was corrected by reading mode and bytes through one file
  descriptor; that thread is also resolved and outdated.
- The exact candidate check run has **zero CodeQL annotations**. This is
  stronger than a green workflow: the annotation API was inspected directly.
- The alert inventory API still returns `403 Resource not accessible by
  integration`; a human reviewer must still inspect the GitHub Security tab.
  Do not claim the inventory API was queried successfully.

**Candidate results:** `npm audit --omit=dev`: **0 critical / 0 high / 0 moderate / 0 low**. Full npm audit: **0 critical / 1 high / 9 moderate** (development-only findings requiring explicit acceptance). Production SBOM: **32 components / 33 dependency entries / 0 unresolved references**. Build, static-host, artifact and 95 security tests have retained CI evidence, including the five exclusive-manifest regression cases.

Note: the workflow titled *G3 clean safe-object evidence* also implements a separately dispatched **G4** path. Run `45576463959` executed the G4 steps and uploaded a G4-named artifact; the workflow name alone is not its test scope. The PR-triggered continuous artifact is named using GitHub's PR merge SHA; do not mistake that for source-commit proof. Validate run `head_sha`, jobs and artifacts when reviewing.

The exact release candidate `d16f480` is the code/security basis. Documentation-only commits after it are not substitutes for technical CI, and any substantive source, dependency or build change must trigger a new candidate with full evidence before approval.

## 2. Exception and residual-risk decisions — all HUMAN PENDING

Record an individual verdict for **each** entry. `ACCEPT` requires an actual named owner, reviewed evidence, compensating controls, review trigger and an expiry/date. `REJECT` or `DEFER` must state the required corrective action. Placeholder text is not approval.

| ID | Evidence / impact | Proposed boundary and expiry | Human verdict (ACCEPT / REJECT / DEFER) | Condition / rationale |
| --- | --- | --- | --- | --- |
| EX-001 | `postcss@7.0.39`, five high advisories; lint-only | No production SBOM or artifact path; 2027-02-28 | **PENDING** | **PENDING** |
| EX-002 | Nine moderate development findings | Development lint/build only; 2027-02-28 | **PENDING** | **PENDING** |
| RR-001 | Same-origin iframe event policy breaks external-origin messaging | Browser runtime; next runtime review | **PENDING** | **PENDING** |
| RR-002 | Secure dev session cookies restrict plain-HTTP LAN development | Local development only; next server change | **PENDING** | **PENDING** |
| RR-003 | TLS/security headers are external static-host responsibilities | Every deployment; separate deployment gate | **PENDING** | **PENDING** |
| RR-004 | CSP `style-src 'unsafe-inline'` residual policy | Every deployment / next styling change | **PENDING** | **PENDING** |

Sources: [exception definitions](security-exceptions.md), [residual-risk register](g8-residual-risk-register.md), [deployment threat model](g8-threat-model-review.md), [release checklist](release-checklist.md). The existing registers describe technical *recommendations*, not signatures. No high/critical **production** exception may be approved.

## 3. Human review checklist

- [ ] Verified candidate `d16f480` and the latest records commit and confirmed no unreviewed code/lock changes.
- [ ] Independently inspected CI logs, artifact digests, SBOM, shipped artifact and audit JSON; confirmed all objective security controls and appropriate threat model.
- [ ] Inspected CodeQL security alerts/reviews and resolved-or-dispositioned any remaining findings (CI success alone is not equivalent to manually inspecting open alerts).
- [ ] Reconciled every technical item in [release checklist](release-checklist.md) with its evidence reference.
- [ ] Personally recorded verdict, owner, and conditions for EX-001, EX-002 and RR-001–RR-004 above.
- [ ] Assigned a named ongoing owner and review cadence for expiry-based exceptions and externally enforced deployment controls.
- [ ] Recorded any residual blocking conditions, including whether a *separate deployment approval* is needed.
- [ ] Recorded an explicit MI-P6 decision independently of PR merge/deployment authority.

## 4. Human decision and signature — COMPLETE ONLY BY THE OWNER

**Security owner full name:** PENDING  
**Security owner role / authority:** PENDING  
**Reviewed exact candidate SHA:** PENDING  
**Reviewed final records SHA:** PENDING  
**Reviewed evidence IDs/digests:** PENDING  
**Decision on technical security package (APPROVE / REJECT / DEFER):** PENDING  
**Exception/risk verdicts completed and linked:** PENDING  
**Blocking conditions / follow-up owners:** PENDING  
**MI-P6 decision (UNBLOCK / REMAIN BLOCKED / CONDITIONAL; list conditions):** PENDING  
**Separate production deployment approval (GRANTED / NOT GRANTED):** NOT GRANTED  
**Date (UTC or timezone-stated):** PENDING  
**Signature / accountable attestation:** PENDING

A decision to unblock MI-P6 is **not** permission to deploy an unverified host or start the disabled Node server. Merge, PR ready-for-review state, release, production server activation and deployment are **separate** actions requiring their own explicit authorization.

## 5. Mandatory stop condition

Until the named human records a complete auditable decision, preserve `AWAITING_HUMAN_APPROVAL`. Never convert pending placeholders into approvals based on green CI. Do not merge draft PR #1, mark it ready, release, deploy, weaken `src/server/security-profile.js`, or declare MI-P6 unblocked.
