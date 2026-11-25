# OSJS-SEC-FIX-001 — agent code review

**Review target:** `c939126..d16f480` on `codex/rm-sec-001-g1-baseline`.
**Reviewer:** OpenHands agent, same conversation context.
**Independence:** This is a structured agent review, not the independent human
review required by T8.5. It does not approve an exception, merge, release,
deployment or MI-P6 unblock.

## Material findings

None.

## Checks performed

- `--write` no longer checks existence and then writes. It uses
  `writeFileSync(..., {flag: 'wx', mode: 0o600})`, which maps to atomic
  `O_CREAT|O_EXCL`; an existing file, symlink, directory or other object fails
  with `EEXIST` and is preserved.
- The refusal path converts only `EEXIST` into the established user-facing
  message. Other errors still propagate.
- Existing manifest bytes, inventory generation, JSON shape, CLI flags and the
  verification path are unchanged.
- The test-only `OSJS_IMPORT_ROOT` seam defaults to the repository root.
- Regression cases cover mode, existing file, symlink target preservation,
  deterministic simulated check race and eight concurrent writers.
- The simulated race is red on the old check-then-write implementation and green
  after the fix.
- The test is included in the continuous security suite (95 tests).
- Candidate CI: G2/G3/G4, continuous push/PR, CodeQL, G5, Ubuntu/Windows build
  and lint all pass. CodeQL check run `139075875714` has zero annotations.
- All ten visible PR review threads are resolved and outdated.

## Trust boundary and residual limitations

- The `vendor/osjs-client` parent directory is trusted developer-controlled
  input. Adversarial replacement of the parent directory itself is out of scope.
- The alert-inventory API returns `403` for this integration. Zero annotations
  and resolved threads are strong current-head evidence, but a human must still
  inspect the Security tab.
- A green CodeQL workflow alone is not accepted as proof of an empty inventory.

## Verdict

PASS for the bounded technical fix. T8.5 remains `AWAITING_HUMAN_APPROVAL`.
