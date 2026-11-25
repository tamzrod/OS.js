# RM-SEC-001 evidence index

**Current technical candidate:** `d16f480ff52849565ff12031c46642814a8d340a`
**Status:** AWAITING_HUMAN_APPROVAL; no merge, release or deployment.

## Current candidate

| Gate | Run | Artifact / result |
| --- | --- | --- |
| G2 cookie security | [45576456286](https://github.com/tamzrod/OS.js/actions/runs/45576456286) | `15004127936`, sha256 `f7e86e6600c37143dd26c3099172e2bb29e656fc23fed7bfe210c80bb8b405a1` |
| G3 safe objects | [45576459854](https://github.com/tamzrod/OS.js/actions/runs/45576459854) | `15004133171`, sha256 `84effc971d3934cf8c0d5804d7b5fd3612ae1040812f17737b46b96cb6dd225e` |
| G4 build/security | [45576463959](https://github.com/tamzrod/OS.js/actions/runs/45576463959) | `15004646816`, sha256 `ef7b7194e56aeeb598edc45cfd3c0ab52cfdaa2b16c49632dbb8ec9a099622a1`; 23/23 commands |
| Continuous push | [45576440981](https://github.com/tamzrod/OS.js/actions/runs/45576440981) | `15004661838`, sha256 `57de0312a91c94c25f3484bbba960aafcc9149306c61e619bbb1560e0b2a021c`; 95 tests |
| Continuous PR | [45576449365](https://github.com/tamzrod/OS.js/actions/runs/45576449365) | `15004532023`, sha256 `c22dd940e5a5467cf20351269766a3058aedc71b41e3582da3bb45086a17d099` |
| CodeQL push / PR | [45576440988](https://github.com/tamzrod/OS.js/actions/runs/45576440988) / [45576449327](https://github.com/tamzrod/OS.js/actions/runs/45576449327) | Check run `139075875714`, zero annotations |
| G5 push / PR | [45576440870](https://github.com/tamzrod/OS.js/actions/runs/45576440870) / [45576449433](https://github.com/tamzrod/OS.js/actions/runs/45576449433) | Successful |
| Ubuntu/Windows build | [45576449346](https://github.com/tamzrod/OS.js/actions/runs/45576449346) | Successful |
| Lint | [45576449236](https://github.com/tamzrod/OS.js/actions/runs/45576449236) | Successful |

## Security results

- Production audit: 0 critical / 0 high / 0 moderate / 0 low.
- Full audit: 0 critical / 1 high / 9 moderate, development-only.
- Production SBOM: 32 components / 33 dependency entries / 0 unresolved.
- CodeQL: candidate check run succeeds with zero annotations; all ten visible
  PR review threads resolved. Alert-inventory API is `403`; Security-tab review
  remains a human task.
- OSJS-SEC-FIX-001: exclusive manifest creation with five regression cases.

## Historical gates

G5 `fa0b3b5`, `d467f37`, `cebeca0`; G6 `b39be51`; G7 `e2c3404`; G8 first
candidate `146f800`. Historical runs are retained in the task records and are
not evidence for the current candidate.

## Human gate

T8.5 is not signed. See `docs/g8-security-signoff.md`. No merge, PR-ready state,
release, deployment, production Node startup or MI-P6 unblock is authorized.
