# OSJS-SEC-FIX-001 — exclusive import-manifest creation

**Trigger:** CodeQL alert 5 / PR review thread 4689024229,
`scripts/security/verify-client-import.js:52`.

## Scope and trust boundary

`--write` previously checked `fs.existsSync(manifestPath)` and later called
`fs.writeFileSync`, allowing a racing writer or a symlink planted after the
check to be overwritten. The manifest is generated only by developers against
the trusted `vendor/osjs-client` directory; the parent directory is trusted.

The fix uses `writeFileSync(..., {flag: 'wx', mode: 0o600})`. `O_CREAT|O_EXCL`
atomically refuses an existing regular file, symlink, directory or other object
and never follows a symlink. Adversarial replacement of the trusted parent
directory itself is outside this boundary.

## Red/green regression

`scripts/security/verify-client-import.test.cjs` covers:

1. new manifest is mode 0600 with the client inventory;
2. an existing manifest is refused and its bytes are unchanged;
3. an existing symlink is refused and its target is unchanged;
4. a file created after a check cannot be overwritten (deterministic
   `fs.existsSync` race simulation);
5. eight concurrent writers produce exactly one valid manifest.

Before the fix, cases 1 and 4 failed. After the fix all five pass, repeated
three times. The test is wired into `security-continuous.yml`.

## Preserved behavior

The manifest JSON, inventory, verification path, CLI flags and existing
manifest content are unchanged. `OSJS_IMPORT_ROOT` is a test-only root override;
production defaults to the repository root.

## Alert disposition

CodeQL check-run annotations at the pre-fix head contained exactly this one
failure. The post-fix check must report success with no annotations before the
task is marked PASS. A green workflow without checking annotations is not
accepted as proof.

## PASS evidence

- Candidate: `d16f480ff52849565ff12031c46642814a8d340a`.
- Red: before the fix, the mode assertion and simulated check race failed.
- Green: five cases pass, repeated three times; continuous CI runs 95 security
  tests.
- G2 [45576456286](https://github.com/tamzrod/OS.js/actions/runs/45576456286),
  G3 [45576459854](https://github.com/tamzrod/OS.js/actions/runs/45576459854),
  G4 [45576463959](https://github.com/tamzrod/OS.js/actions/runs/45576463959)
  (23/23 commands), continuous push
  [45576440981](https://github.com/tamzrod/OS.js/actions/runs/45576440981) / PR
  [45576449365](https://github.com/tamzrod/OS.js/actions/runs/45576449365).
- CodeQL check run `139075875714`: success, **zero annotations**. The original
  TOCTOU thread and the follow-up test thread are resolved and outdated.
- Alert-inventory API remains `403`; manual Security-tab review stays a human
  obligation.
