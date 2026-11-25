# OpenHands / OpenCode repository instructions

The single authoritative current mission on this branch is **`active_work/operation-cwal.md`**, mission **OSJS-POSTMERGE-001**.

## Operator trigger

When the operator enters exactly **`operation cwal`** (case-insensitive), from branch `correction`, read in order:
1. `AGENTS.md`
2. `active_work/operation-cwal.md`
3. `active_work/cwal-state.md`
4. Referenced evidence, release checklist, sign-off records and CI workflows.

Execute the next eligible mission task without asking for another prompt. On successful verified bounded tasks, continue to the next task, create/update the authorized draft correction PR, and stop at the mission's explicit human gate. Do not mistake the old completed OSJS-SEC-FIX-001 or original G5–G8 backlog as the active mission.

## Authorized boundaries

- Repository: `tamzrod/OS.js`. Mutations only on branch **`correction`**, based on merged `master` commit `161ab12cde7a70f3fa0af2d081e9afd6642ae4b8`.
- PR #1 is already merged. Never modify it to imply human sign-off. A **new draft PR** from `correction` to `master` is permitted after verification; do not merge, approve or mark it ready.
- No edits to `master`, no force-push, no published-history rewrite, no unreviewed destructive changes.
- Preserve fail-closed production Node server and browser-only distribution. Do not release, deploy, start production Node server, weaken security gates or unblock MI-P6.
- `docs/g8-security-signoff.md` must remain unsigned. A named human security owner alone records decisions on EX-001, EX-002, RR-001–RR-004, T8.5 and MI-P6. Do not backdate or infer approval from merged PR #1 or passing CI.
- Treat all recorded CI, audit and threat-model results as evidence claims until independently checked at the correct commit. Distinguish correction-branch CI from a future `master` push.

If the checked-out branch is not `correction`, stop before writing and ask the operator to switch/fetch the authorized branch. Never interpret the short trigger as authorization outside this contract.
