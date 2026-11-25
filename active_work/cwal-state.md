# CWAL resume register — OSJS-CWAL-SEC-001

**State:** RUNNING  
**Updated:** 2026-11-25  
**Mission:** `active_work/operation-cwal.md`  
**Trigger in OpenCode:** `operation cwal`  
**Authorized branch:** `codex/rm-sec-001-g1-baseline`  
**Current technical location:** P4 G7 — continuous security workflows implemented; CI evidence pending. G8 remains.  
**Human release gate:** G8 T8.5 not delegated.  
**Expected PR:** #1 open, draft, unmerged (re-verify when execution begins).  
**Baseline source:** branch HEAD must be read at execution start; do not treat the creation SHA below as a guaranteed current HEAD.

## Verified historical state (do not silently promote to current)

- G1/G2/G3/G4 completed and P5 accepted, according to `processing/roadmap/security-risk-patching.md`.
- T5.1 accepted; production Node server startup must remain blocked.
- T5.2 partial changes include registration default off, production null-auth adapter rejection, default-off proxy, removed music player dependency, CLI moved dev-only, deferred development file watchers, pinned loopback-only local dev.
- Two critical advisories (`minimist`, `proxy-addr`) remediated through lockfile-only changes: [candidate trial 44999058370](https://github.com/tamzrod/OS.js/actions/runs/44999058370), [post-promotion audit 44999193916](https://github.com/tamzrod/OS.js/actions/runs/44999193916).
- Last verified production audit after T5.2: **0 critical / 0 high / 0 moderate / 0 low**; full development tree: **0 critical / 10 high / 14 moderate / 3 low**. Historical audit: **0 critical / 14 high / 3 moderate / 5 low**; exact source for post-promotion audit `e37e713d0a00ccf74d6a1737f021737c84180d48`. These are *historical values*: every CWAL execution must obtain a fresh baseline on the current branch and distinguish installed development graph from shipped graph.
- Last verified build/security results at evidence commit `6acef72c6ecef5b4abec4df870911b5dc44cbfd2`: [Windows+Ubuntu build 44999216879](https://github.com/tamzrod/OS.js/actions/runs/44999216879), [startup regressions 44999216847](https://github.com/tamzrod/OS.js/actions/runs/44999216847), [lint 44999216901](https://github.com/tamzrod/OS.js/actions/runs/44999216901), all successful at the time. New governance-only commits are not a substitute for a new clean source check.

## Next task — verify continuous security and CodeQL workflows

1. Verify remote branch, PR, working tree, selected Node/npm, current CI and full current audits.
2. Map all provider registrations, imports, side effects, reverse-proxy/WS/session/VFS/upload consumer paths and production lockfile roots; explicitly distinguish static-only product requirements from generic OS.js demo defaults.
3. Build an explicit, negative-testable provider/route absence contract before removing dependencies. Prefer extracting a static-only browser product and marking legacy Node server unsupported rather than automatically trying to make the entire server stack production-ready.
4. Work one bounded code/dependency microtask at a time, P4 tests + P5 independent review; continue automatically on PASS.
5. Preserve dated evidence in task records, update this register after each accepted checkpoint, and advance G5→G6→G7→G8 technical gates without a new prompt.

## Running log (append after each accepted or blocked task)

| Sequence | Task | Evidence SHA / CI / artifact | P5 decision | Next |
|---|---|---|---|---|
| 0 | CWAL mission and OpenCode entrypoint installed | Governance HEAD verified; PR #1 open draft; fresh baseline 0 critical/14 high/3 moderate/5 low production (pinned Node 26.13.0/npm 11.20.0, lock `57a50ba5…`) | Baseline accepted at working HEAD | G5 T5.2 inventory |
| 1 | G5 T5.2 provider/consumer inventory + remove `@osjs/server` from production graph | `fa0b3b5`; clean G2 [45520750362](https://github.com/tamzrod/OS.js/actions/runs/45520750362), G3 [45520752555](https://github.com/tamzrod/OS.js/actions/runs/45520752555), G4 [45520754924](https://github.com/tamzrod/OS.js/actions/runs/45520754924); lint/build/G5 push+PR green; production audit 0/0/0/0 | P5 accepted; evidence runners reconciled without weakening gates | G5 T5.3 |

## Objective completion

- `READY_TO_RUN`: governance installed; no autonomous OpenCode execution yet.
- `RUNNING`: agent has verified branch and is executing tasks.
- `BLOCKED`: named blocker, failed evidence and safe follow-up.
- `AWAITING_HUMAN_APPROVAL`: G5/G6/G7 and G8 T8.1–T8.4 technical evidence complete, all objective gates green, only named-human T8.5 remains.
- `COMPLETE`: only after the named human actually records T8.5 sign-off; never agent self-signoff.

No automated merge, no release, no deployment.
| 2 | G5 T5.3 residual server-chain classification | `d467f37`; G2 [45522644919](https://github.com/tamzrod/OS.js/actions/runs/45522644919), G3 [45522647922](https://github.com/tamzrod/OS.js/actions/runs/45522647922), G4 [45522650748](https://github.com/tamzrod/OS.js/actions/runs/45522650748); full audit 0 critical/1 high/9 moderate; production 0/0/0/0; SBOM 769/32 | P5 accepted; PostCSS exception carried to G8 | G5 T5.4 |
| 3 | G5 T5.4–T5.6 shipping-boundary limits, hostile inputs, DoS bounds | `cebeca0`; G2 [45524159459](https://github.com/tamzrod/OS.js/actions/runs/45524159459), G3 [45524163153](https://github.com/tamzrod/OS.js/actions/runs/45524163153), G4 [45524166518](https://github.com/tamzrod/OS.js/actions/runs/45524166518); 73/73 G5 tests; constrained-heap probe 271 ms | P5 accepted; G5 closed | G6 T6.1 |
| 4 | G6 browser-only distribution | `b39be51`; G2 [45526121278](https://github.com/tamzrod/OS.js/actions/runs/45526121278), G3 [45526123701](https://github.com/tamzrod/OS.js/actions/runs/45526123701), G4 [45526125597](https://github.com/tamzrod/OS.js/actions/runs/45526125597); 21/21 evidence commands incl. browser_artifact/static_host | P5 accepted; G6 closed | G7 |
| 5 | G7 continuous security | workflows `security-continuous.yml`, `codeql.yml`; 90/90 green suites; audit gate and secret scan pass locally | CI verification pending | G8 |
