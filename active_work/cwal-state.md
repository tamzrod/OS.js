# CWAL resume register — OSJS-CWAL-SEC-001

**State:** READY_TO_RUN  
**Updated:** 2026-11-25  
**Mission:** `active_work/operation-cwal.md`  
**Trigger in OpenCode:** `operation cwal`  
**Authorized branch:** `codex/rm-sec-001-g1-baseline`  
**Current technical location:** P4/P5 G5 T5.2; subsequent G5 T5.3–T5.6, G6, G7 and G8 pending.  
**Human release gate:** G8 T8.5 not delegated.  
**Expected PR:** #1 open, draft, unmerged (re-verify when execution begins).  
**Baseline source:** branch HEAD must be read at execution start; do not treat the creation SHA below as a guaranteed current HEAD.

## Verified historical state (do not silently promote to current)

- G1/G2/G3/G4 completed and P5 accepted, according to `processing/roadmap/security-risk-patching.md`.
- T5.1 accepted; production Node server startup must remain blocked.
- T5.2 partial changes include registration default off, production null-auth adapter rejection, default-off proxy, removed music player dependency, CLI moved dev-only, deferred development file watchers, pinned loopback-only local dev.
- Two critical advisories (`minimist`, `proxy-addr`) remediated through lockfile-only changes: [candidate trial 44999058370](https://github.com/tamzrod/OS.js/actions/runs/44999058370), [post-promotion audit 44999193916](https://github.com/tamzrod/OS.js/actions/runs/44999193916).
- Last verified audit: **0 critical / 14 high / 3 moderate / 5 low**; exact source for post-promotion audit `e37e713d0a00ccf74d6a1737f021737c84180d48`. These are *historical values*: every CWAL execution must obtain a fresh baseline on the current branch and distinguish installed development graph from shipped graph.
- Last verified build/security results at evidence commit `6acef72c6ecef5b4abec4df870911b5dc44cbfd2`: [Windows+Ubuntu build 44999216879](https://github.com/tamzrod/OS.js/actions/runs/44999216879), [startup regressions 44999216847](https://github.com/tamzrod/OS.js/actions/runs/44999216847), [lint 44999216901](https://github.com/tamzrod/OS.js/actions/runs/44999216901), all successful at the time. New governance-only commits are not a substitute for a new clean source check.

## Next task — T5.2 consumer-and-dependency inventory

1. Verify remote branch, PR, working tree, selected Node/npm, current CI and full current audits.
2. Map all provider registrations, imports, side effects, reverse-proxy/WS/session/VFS/upload consumer paths and production lockfile roots; explicitly distinguish static-only product requirements from generic OS.js demo defaults.
3. Build an explicit, negative-testable provider/route absence contract before removing dependencies. Prefer extracting a static-only browser product and marking legacy Node server unsupported rather than automatically trying to make the entire server stack production-ready.
4. Work one bounded code/dependency microtask at a time, P4 tests + P5 independent review; continue automatically on PASS.
5. Preserve dated evidence in task records, update this register after each accepted checkpoint, and advance G5→G6→G7→G8 technical gates without a new prompt.

## Running log (append after each accepted or blocked task)

| Sequence | Task | Evidence SHA / CI / artifact | P5 decision | Next |
|---|---|---|---|---|
| 0 | CWAL mission and OpenCode entrypoint installed | Verify governance HEAD at runtime | Plan only; execution not started | G5 T5.2 inventory |

## Objective completion

- `READY_TO_RUN`: governance installed; no autonomous OpenCode execution yet.
- `RUNNING`: agent has verified branch and is executing tasks.
- `BLOCKED`: named blocker, failed evidence and safe follow-up.
- `AWAITING_HUMAN_APPROVAL`: G5/G6/G7 and G8 T8.1–T8.4 technical evidence complete, all objective gates green, only named-human T8.5 remains.
- `COMPLETE`: only after the named human actually records T8.5 sign-off; never agent self-signoff.

No automated merge, no release, no deployment.
