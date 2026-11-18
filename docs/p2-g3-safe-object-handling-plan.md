# P2 G3 — Safe object-handling plan

**Roadmap:** `RM-SEC-001`  
**Stage:** P2 — Design the solution  
**Date:** 2026-11-12  
**Input:** [`p1-g3-unsafe-merge-analysis.md`](p1-g3-unsafe-merge-analysis.md)

## Chosen design

Create a small fork-owned safe-object module in the forked `@osjs/common` source and migrate every production `deepmerge` consumer to it. The primitive enforces descriptor-safe traversal and reserved-key rejection; thin call-site adapters enforce schemas and array policy where the domain is security-sensitive.

This keeps one security implementation while avoiding a false “generic merge makes every object safe” claim. Generated distributions will be rebuilt from retained source and exact locks. No generated bundle will be hand-patched.

## Core contract

The common module will expose operations equivalent to:

- `assertSafeObject(value, policy)` — recursively validates input without reading accessors.
- `safeMerge(base, override, policy)` — produces a new object from validated own data properties.
- `safeSetPath(base, path, value, policy)` — performs reserved-segment-safe dotted-path updates for settings.

Contract requirements:

1. Only own enumerable string-keyed data descriptors are traversed.
2. `__proto__`, `prototype`, and `constructor` are rejected at every depth and in every dotted path.
3. Accessor descriptors are rejected without invoking their getter or setter.
4. Cycles, excessive depth, and unsupported object types fail closed with a typed error.
5. Plain objects and arrays are accepted by default; Date, RegExp, Map, Set, functions, DOM objects, and class instances require an explicit call-site policy or are rejected.
6. Output uses ordinary objects for API compatibility, but properties are created with `Object.defineProperty` after validation so ambient prototype setters are not invoked.
7. The base and override inputs are not mutated.
8. Override precedence matches current behavior. Arrays use an explicit `replace` or `concat` policy; there is no implicit default at a production call site.
9. Symbol properties are rejected initially because OS.js configuration and persisted JSON contracts are string-keyed.

## Call-site policies

| Sites | Object policy | Array policy | Additional schema |
| --- | --- | --- | --- |
| M1 settings load, M4 desktop settings | JSON-compatible plain data | replace | reserved dotted paths rejected; bounded depth |
| M2 mountpoint | plain data | replace | allowlist top-level fields and security-relevant `attributes`; preserve adapter/provider extension values only through an explicit extension bucket |
| M3 application window, M7/M8 dialogs | plain data plus explicitly retained callback/function leaves | replace | allowlist window attributes; function leaves accepted only for documented callback fields |
| M5 locales | plain objects with string/function translation leaves | replace | locale names and translation keys are own strings only |
| M6 common core, M9/M10 server config | plain data plus documented server leaves such as modules/functions | replace | schema sections for HTTPS, session, auth, VFS, proxy, Express limits, and provider configuration |
| M11 settings application | JSON-compatible plain data | replace | `safeSetPath`; UI key must match an allowed settings descriptor |

Where exact compatibility cannot yet be expressed as a narrow allowlist, the first migration may use the descriptor-safe recursive policy with a documented extension allowance. The task cannot close until each allowance has tests and an owner.

## Source ownership strategy

- Keep the already fork-owned client source.
- Import exact sources for `@osjs/common@3.0.12`, `@osjs/dialogs@3.1.0`, `@osjs/server@3.2.3`, and `@osjs/settings-application@1.1.8` from immutable upstream tags/commits and reconcile them against the locked npm artifacts/source maps.
- Retain one exact lock per independently built package and root-level local-package links.
- Build and package each forked component before changing the root graph.
- Preserve package names and public exports so application consumers do not need an unrelated migration.

## Test strategy

### Red security matrix

Each relevant package must initially demonstrate failures for:

- parsed `__proto__` at root, nested object, and array element;
- `constructor.prototype` and direct `prototype` paths;
- inherited enumerable properties;
- getters that throw or increment a sentinel;
- setters on `Object.prototype` and target prototypes;
- dotted reserved settings segments;
- cyclic, excessively deep, primitive, and non-plain inputs;
- array replacement/concatenation compatibility as applicable;
- no global pollution and no poisoned inheritance on the returned object.

### Compatibility matrix

- existing package suites remain green;
- defaults/override precedence is unchanged for representative nested values;
- desktop and settings arrays remain replacement-based;
- window/dialog attributes and callbacks retain documented behavior;
- server CLI values still override file configuration;
- locale overrides retain translation fallback;
- mountpoint security flags cannot be inherited or smuggled through reserved keys.

## Execution sequence

1. Import and verify exact common, dialogs, server, and settings-application sources without behavior change.
2. Retain reproducible locks, builds, package inventories, and baseline tests for each source package.
3. Add red tests for the common primitive contract and each high/critical call site, including the reproduced dialogs poisoned-result case.
4. Implement and review the common safe-object primitive.
5. Migrate client settings/desktop/local-storage/path handling first, then the remaining client sites.
6. Migrate common core and server configuration together so their shared bootstrap boundary cannot be left half-converted.
7. Migrate dialogs and settings application, including their bundled legacy/custom copy paths.
8. Rebuild distributions, link all forked packages into the root, remove both `deepmerge` versions, and reconcile graph drift.
9. Run clean retained tests, audits, SBOMs, source/bundle scans, and hostile-input evidence; then make the G3 closure decision.

## Failure and rollback rules

- A compatibility failure loops back to the owning call-site adapter; it does not weaken reserved-key or descriptor gates.
- A package whose exact source cannot be reconciled with its locked artifact remains registry-owned and blocks dependent migration work.
- Root integration is a separate commit boundary and can be reverted without losing imported source or tests.
- `deepmerge` cannot remain in a shipped bundle as a dormant fallback.

## Task boundaries for P3

P3 should create independent micro-tasks for source provenance, reproducible baselines, red security tests, common primitive implementation, client migration, common/server migration, dialogs/settings migration, root integration, and clean retained closure evidence. Each action task receives its own P4 implementation and P5 review gate.

## P2 decision

Proceed with a centralized descriptor-safe primitive plus call-site policies and exact fork-owned source. Reject dependency downgrade, bundle patching, silent key removal, and global-pollution-only tests as insufficient.
