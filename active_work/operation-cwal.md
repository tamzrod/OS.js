# Operation CWAL — OS.js RM-SEC-001 autonomous security completion

**Mission ID:** OSJS-CWAL-SEC-001  
**Authority:** operator command `operation cwal`, from the repo root using OpenCode  
**Repository:** `tamzrod/OS.js`  
**Work branch:** `codex/rm-sec-001-g1-baseline` (existing draft PR #1)  
**Mission status:** AUTHORIZED FOR BOUNDED DEVELOPMENT, NOT RELEASE  
**Primary task source:** `processing/roadmap/security-risk-patching.md`  
**Progress register:** `active_work/cwal-state.md`  
**Outcome:** Finish every *technical* RM-SEC-001 security gate with independently reproducible evidence, then stop for named human security sign-off. Do not merge, deploy, release, or unblock MI-P6 autonomously.

## 0. Mandatory reconciliation before doing work

1. `git status --short --branch`; `git rev-parse HEAD`; `git remote -v`; `git fetch origin`. Verify exact repository origin, branch, clean working tree and PR #1 draft/unmerged. If dirty, preserve user's work and STOP; never reset it away.
2. Read THIS file, `AGENTS.md`, `active_work/cwal-state.md`, the complete roadmap, T5.1, T5.2, P1/P2 G5 analyses, risk assessment, build/security CI workflows, and relevant current code. Check whether remote branch advanced. Stop on conflicting/unexpected changes rather than overwriting.
3. Treat checked-in roadmap completion checkboxes as *claims* to verify against tests/evidence. No relying on obsolete introductory paragraphs, dated audit counts, or old PR text as current proof.
4. Obtain fresh `npm audit --omit=dev --json`, `npm audit --json`, `npm explain` for high/critical packages and classify direct/transitive, production/dev, shipped/unshipped and reachability. Preserve exact HEAD, toolchain, command, lock SHA, artifact IDs, logs.
5. Detect missing local tools and prefer isolated GitHub Actions runners if native pinned Node 26.13.0/npm 11.20.0 is unavailable. Never fabricate execution or audit results.

## 1. Execution engine — fully autonomous bounded loop

**P1 Understand → P2 Plan → P3 Decompose → P4 Implement/test → P5 Independent review/decision.** Earlier P1/P2 work can be reused only after confirming its assumptions. For each numbered task: select the smallest unblocked testable delta; write/update a task contract in `processing/tasks/RM-SEC-001/` with scope, affected consumers, red/green tests, rollback, and exit gate; run tests; review diff and dependency reachability; commit focused changes; verify remote CI at *that exact SHA*; independently reconcile test logs and manifests; record P5 PASS/FAIL with evidence. On PASS auto-promote the next task. On FAIL fix or use the stop policy below, then retry.

**Do not halt after each P5 approval.** Continue automatically through G5, G6, G7, and technical G8 unless a hard blocker is encountered. Provide concise summaries at useful checkpoints, not repeated permission requests. Run tasks serially when dependency order or shared files require it. Bounded subagents can investigate independently, but only one agent may mutate the branch at a time.

**Git policy:** no direct writes to `master`; no PR creation/merge; no force pushes or history rewrites. Commit to the existing development branch in bounded, reviewable increments, use ordinary push, verify remote HEAD and draft PR head after every publish. If a large lockfile needs mutation, use pinned npm in a clean disposable worktree; run CI and inspect exact change list before copying npm-generated files back. Refuse dependency upgrades based only on a severity counter.

## 2. Locked baseline — verify, do not assume

At mission creation, G1–G4 have accepted evidence; T5.1 accepted; T5.2 partially implemented (registration default off, null-auth production fallback rejection, proxy default off, music player removal, CLI dev-only, watcher lazy import). Latest known recorded production audit is **0 critical, 14 high, 3 moderate, 5 low**, verified in [run 44999193916](https://github.com/tamzrod/OS.js/actions/runs/44999193916) after `minimist 1.2.8` and `proxy-addr 2.0.8` patches. This is historical, not a permanent gate pass. The production Node server is intentionally unavailable. Re-run all counts at the actual branch HEAD.

Historical OS.js 3.1.12 browser demo behavior is not itself a production capability requirement. Do not conflate installed root npm dependencies with what is actually shipped in a static distribution. Product requirement unknown = capability disabled.

## 3. Ordered technical backlog and gates

### G5 — T5.2 finish: provider/consumer graph and production root pruning

- Inventory every Core, Package, VFS, Auth and Settings provider, route, session, WebSocket, filesystem watcher, reverse proxy, upload, archive, server metadata and build-time CLI consumer; produce a table showing status, owning feature, runtime root, dependency path, and tested decision.
- Prefer a **static-browser distribution with no Node server**. Prove that optional server is *not* part of the production artifact and cannot be started under an unsupported production profile. If a server capability is essential and documented, isolate a separately named profile and do **not** lift fail-closed startup until real auth and bounded ingress are validated.
- Remove unused provider registrations and dependency roots from the *production* graph, not merely lazy imports. Preserve local development only as explicit opt-in. Test absence of disabled routes/listeners even when individual legacy modules are imported.
- Existing candidates to analyze, not blindly delete: `@osjs/server` root, `express-http-proxy`, `chokidar`, `filehound`, `formidable`, `fast-glob`, `connect-loki`, server/CLI generator chains, `hyperapp` peer inconsistency.
- For every removal, use clean-checkout regenerated lockfile and compare graph, run npm ci, test, package discovery, build, security regressions, and full/production audit. Do not change published browser behavior without golden or functional evidence.
- T5.2 exit: documented consumer decisions, disabled providers truly absent from production, exact graph evidence and no unreviewed regression. Keep Node production block intact.

### G5 — T5.3 upgrade/replace retained chains

- From *fresh* advisory JSON and `npm explain`, rank remaining high/critical findings by installed production reachability and supported remediation. Patch in narrow batches: HTTP/body/query/session, WebSocket, glob/file paths, archive/formidable, UUID, metadata. Prefer feature removal over unsupported legacy packages. No guessed version pins, unverified overrides, or broad automatic audit force-fixes.
- For each candidate, run clean CI plus API-level, adversarial, and compatibility tests. A zero-audit count caused solely by a dev-dependency label, while that dependency remains in a shipped runtime, is NOT remediation.
- T5.3 exit: exact intended production lockfile and independently inspected shipping graph contain **zero high and zero critical**, with runtime behavior preserved or intentionally disabled.

### G5 — T5.4–T5.6 resource bounds, hostile input and denial-of-service

- Enumerate surviving, *reachable* ingress; remove unsupported HTTP/WS/VFS/upload endpoints first.
- For retained server paths only: explicit bounded body/query/header sizes, request/header/idle timeouts, concurrency/connection ceilings, parser failures, trust-proxy policy, session/auth controls, and upload/decompression/temp storage quotas where applicable. No default null auth or weak session secret.
- Test malformed/oversized requests and denial of service in isolated, resource-limited CI; prove non-crash, bounded memory/time and denied side effects. Do not run load or hostile tests against public or shared services.
- If no production Node server survives, prove absence from artifact and retain denial guard; mark server-specific dynamic DoS cases **NOT APPLICABLE** with evidence, not false PASS.
- G5 technical exit: 0 production high/critical, no unintended server exposure, all retained ingress covered by hostile tests, clean evidence tied to exact SHA.

### G6 — T6.1–T6.5 minimal browser-only package

- Define exact manifest/entry points and allowlist from the built `dist/`; separate server/CLI/tests/build tools and nonshipping application samples.
- Build a reproducible static distribution in a clean environment; inspect archive and SBOM and reject files/packages containing server executables, credentials, runtime generators, vulnerable cookie code, or other forbidden server roots.
- Run a static-host browser smoke test: boot, assets, routing, CSP/security headers as applicable, selected application interaction and integrity checks. Do not silently replace functionality with a screenshot.
- Audit **the shipped browser artifact graph**, independently of `npm audit --omit=dev` on a development source checkout. Preserve both figures and explain differences.
- G6 exit: reproducible, functional, minimal browser artifact; reproducible allowlist/denylists; independent content test and graph audit; no deployment.

### G7 — T7.1–T7.6 continuously enforce the contract

- Make CI fail for new high/critical *production* findings in exact release graph; capture separate full-tree audit, with bounded reviewed build-only exceptions and expiry.
- Add lockfile/diff review, pinned-actions read-only CI, secret scanning/SAST, validated full+production+browser SBOMs, hostile-input suites, browser artifact inspection and retained evidence.
- Preserve CI branch-protection policy; avoid write-capable CI jobs that automatically publish branches. Deprecate/remove one-off experimental write workflows only after retention/inventory reconciliation. No GitHub permission changes beyond repo-level files without authorization.
- Have negative tests prove the gates fail on deliberately introduced bad dependencies, missing evidence, forbidden artifacts, disabled providers, bad headers or weakened startup checks.
- G7 exit: CI runs on relevant PR/branch changes, blocks fail cases, and retains exact-commit outputs.

### G8 — T8.1–T8.4 technical final audit and independent review

- Rebuild from a **clean checkout at a single immutable candidate commit** using selected toolchain. Re-run npm ci, tests, G1–G4 regressions, Linux/Windows builds, deterministic output comparisons, full/production/browser audits, validated SBOMs, artifact inventory, secret/SAST scans, negative CI checks and threat-model review.
- Verify no remaining high/critical findings in the **shipped** production graph; reconcile full-tree high/critical against reviewed, unshipped, time-bounded build-only risks (do not hide them). Document lower findings with named proposed owner, controls and expiry, or mark unresolved.
- Independent reviewer (different agent/context and ideally separate environment) must review actual diff, proofs, trust boundaries, package provenance, artifact content, and all declared N/A. Reviewers cannot override objective failing gates.
- Reconcile roadmap, task logs, PR description proposal, release checklist, and a final evidence index; cross-check every passed checkbox against CI and artifact IDs.
- G8 technical exit: reproducible evidence fully accepted, no fabricated reviews or findings, `active_work/cwal-state.md` records `AWAITING_HUMAN_APPROVAL`.

### G8 — T8.5 HUMAN AUTHORITY: STOP

Named security owner must inspect the evidence and explicitly approve/sign or reject the release and the MI-P6 unblock decision. **The agent cannot supply, impersonate, infer or auto-record this approval.** Do not mark G8 complete, alter branch protection, merge draft PR #1, create a release or deploy. End with an exact human handoff packet and state `AWAITING_HUMAN_APPROVAL`.

## 4. Common verification contract

Minimum required per material code/dependency checkpoint (with exact SHA and failure handling): `npm ci`; `npm test`; `npm run package:discover`; `npm run build`; dedicated G2/G3/G4/G5 regression suites; production and full npm audit JSON (nonzero exit is a finding, never silenced as a pass); no OpenSSL legacy flag; Windows and Ubuntu matrix; dependency diff and license/provenance review. For distribution milestones add static-host browser smoke, content scan, CycloneDX SBOM validator, deterministic artifact hash and forbidden-content negative test. Require a fresh CI workflow ID and digest or SHA for every retained artifact. Test *both* no-dependency startup gate and actual installed-package behavior as relevant.

**Evidence ledger per task:** goal/task, old/new HEAD, reason, source inventory, diff/allowlist, red/green test, commands/toolchain, clean-worktree status, lock hash, audit JSON, direct+transitive paths, CI run URLs, artifact digests, independent review summary, pass/fail and next eligible task. Update state atomically with the commit that changes the relevant code or with a separate evidence-only commit after checks finish. The latter must be described as documentation-only rather than pretending it was part of the tested code SHA.

## 5. Stop/recovery rules

- **Never** proceed past an objective failing test or an unexplained advisory; investigate, fix, re-run, and preserve the failed evidence. Do not weaken tests or severity thresholds to obtain green CI.
- Up to **three bounded correction attempts per root cause**. On repeated failure, unknown required capability, security trade-off without an objective winner, unsupported dependency without a safe path, contaminated worktree, credentials/permissions issue, remote divergence, missing toolchain/evidence access or unavailable independent review: STOP, mark `BLOCKED` with specific evidence and next safe action. Do not spin indefinitely.
- No fabricated SBOM, audit, CI status, user requirement or sign-off; no external upload of secrets. Never log or commit passwords/tokens or real credentials. Prevent dependencies from executing untrusted post-install scripts unless provenance reviewed.
- If interruptions or context compaction occur, reopen the three control files and use recorded SHA/CI state to resume exactly. Never assume a pending CI run passed; query it or label `PENDING`.
- Stop only at `BLOCKED` or `AWAITING_HUMAN_APPROVAL`, or if the operator explicitly revokes permission. Otherwise autonomously select and run the next smallest eligible task.

## 6. Final handoff format

Report branch HEAD, exact completed tasks, dated full/production/shipped audit severities, verified CI run/artifact IDs, source/build output hashes, eliminated server capabilities, known remaining risks and unverified assumptions, pending human approval owner, and draft PR status. Explicitly state **no merge, no release, no deployment**. Do not say the roadmap is complete until G8.5 is signed by an authorized human.


## 7. CURRENT AUTHORIZED NEXT TASK — OSJS-SEC-FIX-001 (2026-11-25)

**Priority override:** This bounded security remediation supersedes the generic historical G5–G8 backlog and the previous T8.5 human-review handoff. The approval package is prepared but a *current, unresolved* GitHub Advanced Security High finding must be investigated and resolved before presenting T8.5 for a human decision. Running `operation cwal` in OpenHands invokes this task immediately, without a new pasted authorization. This section is the single source of truth for the current assignment.

**Initial verified baseline:** branch `codex/rm-sec-001-g1-baseline`, draft PR #1, documentation HEAD `72e254c9e8978b81657ab919c4ccb2e3af38ac43`, reviewed technical candidate `146f8002e4991e9e4eb159909ff4930970e7c406`. Re-fetch refs on execution: none of these SHAs is assumed to remain HEAD. Review comment [4689024229](https://github.com/tamzrod/OS.js/pull/1#discussion_r4689024229), CodeQL [alert 5](https://github.com/tamzrod/OS.js/security/code-scanning/5), `scripts/security/verify-client-import.js`, current line 52: `fs.existsSync(manifestPath)` followed later by `fs.writeFileSync(manifestPath, ...)`. The thread was unresolved at handoff. There were nine security review threads: one current unresolved and eight resolved; independently inspect current alert inventory and do not equate resolved review threads with closed alerts.

### Execution contract

1. Verify origin, branch, clean worktree, remote SHA and PR #1 draft/unmerged. Read current CodeQL alert #5, review thread and affected file. If the alert is already correctly fixed on a newer HEAD, verify tests/evidence rather than creating redundant edits.
2. Add a focused regression test proving that `--write` **never overwrites** an existing manifest, including a pre-existing symlink; verify failure is safe and existing target content is unchanged. Test competing/concurrent creation or equivalent exclusive-create behavior deterministically. Avoid asserting impossible complete protection against adversarial directory replacement: document the trust boundary.
3. Remove the check-then-write TOCTOU pattern by using exclusive atomic creation (`fs.writeFileSync(manifestPath, serialized, {flag: 'wx', mode: 0o600})` or an equivalently tested safe design). Preserve existing manifest JSON, inventory contents, CLI behavior and verification path. Consider whether parent directories are trusted and avoid following an existing symlink.
4. Run focused red/green regression tests, applicable security suites and clean build/audit checks. Independently review the exact change and all nine security review threads, confirming each finding's current CodeQL status. Do not falsely claim a green CodeQL workflow proves the security-alert inventory is empty.
5. Commit the minimal code/test changes to this existing branch, ordinary non-force push only, verify remote HEAD, PR SHA and required GitHub Actions at the exact new technical candidate SHA. If CI cannot be verified, record the blocker and STOP rather than claiming PASS.
6. On verified PASS, update `docs/g8-security-signoff.md`, `docs/release-checklist.md`, any pertinent risk register, T8.5 task and this progress register with the **new technical candidate**, CI IDs, alert disposition and any remaining unknowns. Update draft PR #1 description to reflect actual evidence; preserve explicit pending human decision fields. Documentation commits after the candidate must be distinguished from code test results.
7. STOP at `AWAITING_HUMAN_APPROVAL` **only when** the remediation and required gates are independently verified and no unreviewed blocking High alert remains. Otherwise STOP at `BLOCKED` with exact evidence. Do not auto-approve exceptions EX-001/EX-002 or risks RR-001–RR-004; never sign T8.5 or unblock MI-P6.

**Forbidden:** merge, approve, mark PR ready, create a PR, release, deploy, enable production Node startup, alter `master`, force push, weaken security gates, or fabricate CodeQL/CI evidence. No scope expansion beyond this finding and necessary evidence reconciliation without a documented security justification.
