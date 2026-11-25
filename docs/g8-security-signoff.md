# G8 security sign-off record

**Status:** AWAITING_HUMAN_APPROVAL
**Agent authority:** none. The agent cannot approve, merge, release, deploy or
unblock MI-P6.

## Evidence package

| Item | Reference |
| --- | --- |
| Release candidate commit | To be recorded at T8.1 evidence. |
| G2 evidence | To be recorded from the clean run. |
| G3 evidence | To be recorded from the clean run. |
| G4 evidence | To be recorded from the clean run. |
| Continuous gates | To be recorded from the clean run. |
| CodeQL | To be recorded from the clean run. |
| Production audit | 0 critical / 0 high / 0 moderate / 0 low at the G7 evidence commit. |
| Full audit | 0 critical / 1 high / 9 moderate, development-only. |
| Production SBOM | 32 components, 33 dependency entries, zero unresolved. |
| Advisory decisions | `docs/security-exceptions.md`, `docs/g8-residual-risk-register.md`. |
| Release checklist | `docs/release-checklist.md`. |

## Required human decision

The named security owner records:

- name and role;
- reviewed commit and evidence identifiers;
- acceptance or rejection of each exception and residual risk;
- decision to resume MI-P6, or the blocking conditions;
- date and signature.

## Prohibited until approval

- Merge PR #1 or mark it ready for review.
- Publish a release or deploy.
- Start a production Node server or weaken `src/server/security-profile.js`.
- Declare MI-P6 unblocked.
