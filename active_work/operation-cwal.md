# Operation CWAL — OSJS-POSTMERGE-001

**Status:** READY_TO_RUN — technical corrections only  
**Single operator command:** `operation cwal` in OpenHands  
**Repository:** `tamzrod/OS.js`  
**Authorized branch:** `correction` (created from `master` merge `161ab12cde7a70f3fa0af2d081e9afd6642ae4b8`)  
**Base:** `master`  
**Previous merged PR:** [#1](https://github.com/tamzrod/OS.js/pull/1), merged 2026-11-25  
**Mission ID:** OSJS-POSTMERGE-001  
**Progress authority:** `active_work/cwal-state.md`  
**Human security authority:** `docs/g8-security-signoff.md` — still NOT APPROVED  
**Stop:** `AWAITING_HUMAN_APPROVAL` on verified technical PASS, or `BLOCKED` with evidence.

## 0. Mandatory startup verification

1. Read `AGENTS.md`, this mission, `active_work/cwal-state.md`, `docs/g8-security-signoff.md`, `docs/release-checklist.md`, `processing/tasks/RM-SEC-001/evidence-index.md`, `.github/workflows/security-continuous.yml`, `.github/workflows/codeql.yml`, `.github/workflows/node.yml` and `.github/workflows/test.yml`.
2. Verify GitHub origin `tamzrod/OS.js`, branch **exactly** `correction`, no dirty/uncommitted work, remote HEAD, current `master`, merged PR #1 and no pre-existing conflicting active PR for this correction. Fetch remote references; do not discard local changes or force push.
3. Confirm the audit findings against actual `master` tree and GitHub Actions: `security-continuous.yml` and `codeql.yml` include only `codex/rm-sec-001-g1-baseline` under `on.push.branches`, excluding `master`. Separate `node.yml` and `test.yml` already target `master`. Confirm whether main push workflows executed; lack of results from a PR-only workflow-run API is **not** proof none executed.
4. Confirm the merged tree equals PR #1 head `9477aa844a5f3a1e6e230e18187de72c0b164294` (merge commit `161ab12c`) and that release candidate `d16f480ff52849565ff12031c46642814a8d340a` passed the previously recorded checks. Historical evidence is not a substitute for new exact-SHA CI.

## 1. Task A — restore continuous security enforcement on master

- In `.github/workflows/security-continuous.yml` and `.github/workflows/codeql.yml`, add `master` to `on.push.branches`. Preserve existing development-branch push, pull-request, manual and CodeQL scheduled triggers, pinned actions, least-privilege permissions, audit thresholds and retained artifacts. Do not weaken existing gates.
- Validate YAML **including correct interpretation of the key `on`**, workflow branch/event matching, and preserve jobs' behavior. Add an automated negative/positive workflow-trigger regression or static validator that fails when either workflow does not include `master` or relevant PR coverage. Ensure the validator is actually invoked by the current CI path rather than merely committed.
- Review CI implications of automatic workflows on `master` including CodeQL write permission, runner concurrency and artifact retention; do not enable publishing/deployment workflows.
- Run focused tests, lint, existing security tests, audits and applicable clean build; record actual outcomes, including any not-run tests.
- Verify branch PR CI for both security workflows, full/production audit gate, tests, SBOMs, CodeQL, G5 fail-closed checks and Ubuntu/Windows build. **The new `master` push trigger cannot be conclusively exercised until a later independently authorized merge**. Record the exact limitation, and request post-merge observation as an explicit gate. Never claim master push enforcement has run solely from a correction-branch PR.

## 2. Task B — accurate post-merge governance record

- Reconcile `active_work/cwal-state.md`, `docs/release-checklist.md`, `docs/g8-security-signoff.md`, `processing/tasks/RM-SEC-001/evidence-index.md`, and applicable roadmap/task documents.
- Record PR #1 **actually merged** on 2026-11-25 at 08:53:06 UTC, merge SHA `161ab12cde7a70f3fa0af2d081e9afd6642ae4b8`. Correct stale descriptions saying PR #1 is draft/open/unmerged, or that no merge happened. Preserve historical statements only when explicitly dated as historical.
- Explicitly label **governance nonconformance**: the merge happened before named T8.5 security-owner signature and independently recorded MI-P6 decision. Do not retrospectively invent approval or assert that merging is equivalent to human acceptance.
- Keep EX-001 (development PostCSS high), EX-002 (nine moderate dev findings), RR-001–RR-004 **individual HUMAN PENDING**. The CI's technical conditional allowance of EX-001 is not human acceptance.
- Record CodeQL check annotations as distinct from the inaccessible current alert inventory; demand a named human inspect GitHub Security tab and register the disposition. Document required production host TLS/CSP/HSTS/headers review and separate deployment authority.
- Record that browser-only static remains the shipping boundary, production Node server fail-closed, and **MI-P6 BLOCKED**. Sign-off file must remain unsigned, with explicit human APPROVE/REJECT/DEFER and MI-P6 decision fields unfilled.
- Explain which evidence is for code candidate `d16f480`, documentation-only PR head `9477aa8`, merge `161ab12c`, and upcoming correction candidate. Do not misattribute test results.

## 3. Independent P5 verification and delivery

- Use CWAL P1 understand → P2 plan → P3 bounded tasks → P4 implement/tests → P5 independent review. Have a separate reviewer/context inspect the changes if available; never call same-context review independent. Correct failures and rerun (up to 3 bounded correction attempts per root cause).
- Commit only focused workflow, validator/test and governance documentation changes on `correction`. Non-force push and independent remote readback. Never modify `master` directly.
- Update the state register with exact commit(s), CI run URLs/statuses and limitations. If tests fail, required evidence cannot be accessed, divergence occurs, or security tradeoffs are unresolved, STOP `BLOCKED` with detailed evidence.
- Prepare a **new draft PR** from `correction` to `master` only after technical checks are verified. If an appropriate correction PR already exists, update it instead of duplicating. Include exact old/new SHAs, objective gates, governance issue, pending human review, and the post-merge master-push smoke-check requirement. Do not mark ready, merge, approve, release or deploy.
- Final branch state on PASS: `AWAITING_HUMAN_APPROVAL` and `MI-P6 BLOCKED`. Clearly disclose that correction-branch tests are not confirmation of a future `master` push.
- STOP. Human owner must decide T8.5 risks and whether MI-P6 can resume separately; no agent is authorized to sign or backdate approval.

## 4. Non-negotiable prohibitions

No direct `master` commits, no force-push/history rewrite, no auto-merge, no self-approval, no PR ready transition, no release/deployment, no production Node startup, no MI-P6 unblock, no weakening security controls, no fabricated audit/evidence/identity/signature. Keep secrets out of logs and commits.
