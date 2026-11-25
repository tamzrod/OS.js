# G8 security sign-off record

**Status:** AWAITING_HUMAN_APPROVAL
**Agent authority:** none. The agent cannot approve, merge, release, deploy or
unblock MI-P6.

## Evidence package

| Item | Reference |
| --- | --- |
| Release candidate commit | `146f8002e4991e9e4eb159909ff4930970e7c406` |
| G2 evidence | [45530642530](https://github.com/tamzrod/OS.js/actions/runs/45530642530) |
| G3 evidence | [45530645226](https://github.com/tamzrod/OS.js/actions/runs/45530645226) |
| G4 evidence | [45530648214](https://github.com/tamzrod/OS.js/actions/runs/45530648214); 23/23 commands |
| Continuous gates | push [45530630907](https://github.com/tamzrod/OS.js/actions/runs/45530630907), PR [45530638237](https://github.com/tamzrod/OS.js/actions/runs/45530638237) |
| CodeQL | push [45530631039](https://github.com/tamzrod/OS.js/actions/runs/45530631039), PR [45530638261](https://github.com/tamzrod/OS.js/actions/runs/45530638261) |
| Production audit | 0 critical / 0 high / 0 moderate / 0 low at `146f800`. |
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
