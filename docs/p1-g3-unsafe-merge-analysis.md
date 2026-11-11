# P1 G3 — Unsafe merge-path analysis

**Roadmap:** `RM-SEC-001`  
**Stage:** P1 — Understand the problem  
**Date:** 2026-11-12  
**Decision:** G3 must replace or constrain merge operations at trust boundaries; a dependency-only downgrade is not an acceptable fix.

## Problem being solved

OS.js recursively combines defaults with objects originating from persisted settings, server responses, package/application inputs, command-line configuration, dialog callers, and extension options. The installed graph contains `deepmerge@4.2.2`, covered by `GHSA-gcqx-w48m-w2h4`, plus a dialogs-local `deepmerge@2.2.1`. A malicious object can therefore influence object shape, inherited values, or protected configuration after crossing a merge boundary.

The required security property is stronger than “`Object.prototype` was not globally polluted”: merged results must contain only allowed own properties, must reject `__proto__`, `prototype`, and `constructor` recursively, must not invoke attacker-controlled getters, and must preserve each call site's documented array and precedence behavior.

## Dependency evidence

| Package | Resolved merge version | Audit state | Source availability |
| --- | --- | --- | --- |
| Fork-owned `@osjs/client` | root `deepmerge@4.2.2` | low advisory, production reachable | exact source retained |
| `@osjs/common@3.0.12` | root `deepmerge@4.2.2` | low advisory, reaches server | published source map only |
| `@osjs/server@3.2.3` | root `deepmerge@4.2.2` | moderate aggregate chain | published source retained |
| `@osjs/settings-application@1.1.8` | root `deepmerge@4.2.2` | low advisory | published source map only |
| `@osjs/dialogs@3.1.0` | nested `deepmerge@2.2.1` | not reported by the current npm audit | published source map only |

The current advisory covers `deepmerge >=4.2.0 <=4.3.1`. npm proposes `4.1.2`, but moving to an older release would neither prove call-site safety nor remove the legacy 2.x implementation.

## Call-site inventory and trust classification

| ID | Package and operation | Inputs | Trust boundary | Priority |
| --- | --- | --- | --- | --- |
| M1 | client `settings.load()` | configured defaults + local-storage or `/settings` JSON | persistent/user/server-controlled state becomes global settings | Critical |
| M2 | client `Filesystem.createMountpoint()` | fixed defaults + mountpoint properties | configuration/provider input controls adapter, root, visibility, and read-only attributes | High |
| M3 | client `Application.createWindow()` | caller options + configuration-selected window overrides | application/package input controls window behavior | High |
| M4 | client `Desktop.applySettings()` | configured defaults + persisted desktop settings | persistent state controls desktop behavior and overlays | Critical |
| M5 | client locale provider | built-in translations + provider `options.locales` | extension input enters locale lookup | Medium |
| M6 | common `CoreBase` constructor | omitted defaults + supplied runtime configuration | common bootstrap boundary inherited by browser/server cores | Critical |
| M7 | dialogs `createOptions()` | fixed defaults + dialog options | application-provided dialog/window attributes | High |
| M8 | dialogs `render()` | retained window options + render-time options | caller input reaches window creation | High |
| M9 | server CLI reduction | accumulated config + JSON-parsed CLI value | operator/process arguments alter server security configuration | High |
| M10 | server core construction | supplied configuration + CLI overrides | deployment and CLI data enter common bootstrap | Critical |
| M11 | settings application state update | current settings + object built from dotted UI key | UI/metadata path mutates persisted settings | High |

## Additional unsafe copy paths

- The client local-storage adapter reduces arbitrary storage keys with `Object.assign(o, {[v]: value})`. For a key named `__proto__`, assignment to the ordinary `{}` accumulator can invoke the prototype setter.
- The settings application constructs nested objects from dotted keys without rejecting reserved segments, then merges them recursively.
- The settings application's bundled state helper copies with `for...in`, which includes inherited enumerable properties. It is third-party bundled code rather than the application merge call, but regression tests must ensure inherited data cannot enter settings state.
- Client settings also use `simplejsonconf` for dotted reads/writes. Reserved path segments require explicit tests even though this is not a `deepmerge` call.

## Reproduced behavior

Using objects created by `JSON.parse`:

- `deepmerge@4.2.2` did not globally modify `Object.prototype` in the bounded probe, but it is still in the advisory range and remains unsuitable as the security boundary.
- dialogs-local `deepmerge@2.2.1` accepted own `constructor` and `prototype` keys and a parsed `__proto__` payload caused the returned object to inherit the attacker value. Global `Object.prototype` remained unchanged, but the result itself was prototype-poisoned.

This distinction matters: tests that check only `({}).polluted` would miss the dialogs failure.

## Scope boundaries

G3 includes the 11 recursive merge calls, the local-storage computed-key copy, and reserved dotted-path handling that feeds those merges. It includes importing exact source for common, dialogs, and settings application when modification is required, using the same provenance discipline established in G2.

G3 does not redesign settings UX, server configuration, windows, dialogs, locales, or mountpoint APIs. Broader server denial-of-service work remains G5, and build-tool replacement remains G4.

## Required remediation properties

1. Reject reserved keys recursively before merge/copy: `__proto__`, `prototype`, and `constructor`.
2. Inspect own data properties only; inherited enumerable values and accessors must not be consumed.
3. Use schema-specific allowlists for security-sensitive objects such as mountpoint attributes, window attributes, and server configuration where practical.
4. Preserve explicit precedence and array-replacement behavior at each call site.
5. Return ordinary or null-prototype objects deliberately, without changing public API shape accidentally.
6. Cover nested objects, arrays, getters, inherited values, dotted paths, malformed primitives, and non-plain objects in regression tests.
7. Remove both vulnerable `deepmerge` versions from shipped dependency and bundle evidence when all consumers are migrated.

## Options to carry into P2

- Design one small, fork-owned safe object utility with explicit policies, then wrap it in call-site schemas. This is the preferred baseline because it centralizes reserved-key and descriptor handling without pretending every object has the same schema.
- Use only per-call-site explicit copying. This gives the tightest schemas but duplicates recursive validation and compatibility behavior.
- Patch or downgrade `deepmerge`. Reject as the primary solution: it does not address legacy 2.x, unsafe surrounding copy/path code, or the required schema guarantees.

## P1 decision

The highest-risk path is persisted settings flowing through M1/M4 and the local-storage accumulator; the broadest-impact path is M6/M10 core configuration. Dialogs 2.x provides a directly reproduced poisoned-result case. Proceed to P2 G3 and design the safe merge contract, package-source strategy, compatibility matrix, and red-test order before changing production code.
