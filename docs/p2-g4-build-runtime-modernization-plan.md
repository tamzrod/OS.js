# P2 G4 — Browser build and runtime modernization plan

## Chosen approach

Migrate all five fork-owned configurations to one root-managed Webpack 5 toolchain. Package manifests will call the root-pinned binaries through the integrated workspace graph instead of retaining independent historical `@osjs/dev-meta` build stacks. This prevents duplicate Webpack 4 chains from surviving in the release lock.

Registry metadata checked on 2026-11-14 supports the pinned Node 26 runtime. The candidate set to validate in T4.2 is Webpack 5.112.2, webpack-cli 7.3.1, html-webpack-plugin 5.6.8, mini-css-extract-plugin 2.10.2, css-loader 7.1.5, sass-loader 17.1.0, Sass 1.108.2, babel-loader 10.1.1, and css-minimizer-webpack-plugin 8.0.0. Exact versions and integrity will enter the lock; ranges are not sufficient evidence.

Webpack 5 asset modules will replace file-loader. css-minimizer-webpack-plugin will replace optimize-css-assets-webpack-plugin. Existing Babel source semantics remain initially; Babel dependency modernization is allowed only where needed for Node 26 compatibility or removal of audited vulnerable chains.

## Sequence and gates

### 1. Capture a reference contract

Retain exact source/config/toolchain identities, committed package bundle hashes, and normalized inventories. Produce the root reference build only in an isolated, recorded compatibility runtime if required; never use legacy OpenSSL mode. Record HTML structure, global/library formats, external mappings, chunk/asset names, source-map coverage, and smoke observations.

Gate: the reference is reproducible enough to detect behavior drift without requiring byte identity after minifier migration.

### 2. Pin one maintained toolchain

Install exact candidate versions at the root, remove obsolete root plugins/loaders, and remove package-local build-tool inheritance that would retain Webpack 4. Reconcile the lock with an explicit before/after inventory.

Gate: `npm ls` shows one approved Webpack 5 family and no Webpack 4, webpack-cli 3, optimize-css-assets-webpack-plugin, html-webpack-plugin 3, file-loader, or obsolete package-local equivalents.

### 3. Migrate library builds first

Migrate common, client, dialogs, and settings in dependency order. Preserve CommonJS, UMD global names, `OSjs` external behavior, CSS extraction, assets, and source maps. Run existing unit/security suites after each bounded change.

Gate: every standalone package build succeeds on Node 26 without any OpenSSL override and passes contract inspection.

### 4. Migrate the root browser build

Adopt Webpack 5 asset modules, current HTML/CSS plugins, explicit minimizers, deterministic output controls, and explicit browser fallbacks where required. Preserve template/favicon/font/image/chunk behavior and `OSJS_VERSION`.

Gate: a production root build succeeds from clean source and matches the normalized reference contract or has an approved explained difference.

### 5. Verify runtime behavior and policy

Serve the artifact from a clean static host. Verify bootstrap, package metadata, chunks, CSS, fonts/images, CSP-compatible behavior, and source-map policy. Search repository configuration, scripts, CI, and documentation for legacy-provider workarounds.

Gate: smoke tests pass and no `--openssl-legacy-provider` occurrence or environment equivalent exists.

### 6. Reconcile security evidence

Run full/production audits, SBOMs, dependency scans, clean builds, package tests, and artifact inventories. Classify findings removed by G4 separately from server/runtime findings owned by G5.

Gate: all obsolete build-chain high/critical findings are absent; any residual high/critical production finding keeps MI-P6 blocked.

### 7. Retain and independently review closure evidence

Run the complete G4 set in clean CI, retain manifests and artifacts, independently verify hashes and behavioral results, and decide closure.

Gate: G4 closes only when the selected Node runtime builds reproducibly without a legacy cryptographic workaround and the maintained toolchain/output contract is evidenced.

## Compatibility rules

- Common must remain consumable through `require('@osjs/common')` with the current exported API.
- Client must retain the `osjsClient` UMD name; dialogs must retain `osjsDialogs`.
- Settings must continue resolving the external `osjs` module to global `OSjs`.
- Root output must retain an HTML entry, extracted CSS, resolvable runtime chunks, favicon, images/fonts, and the injected version.
- Source maps are retained for comparison; release publication is an explicit policy decision, not an accidental default.
- Warnings are recorded and classified. Build errors, missing assets, unresolved modules, or new browser globals fail closed.

## Rollback and loop-back

Each package migration is independently reviewable. If Webpack 5 cannot preserve a required contract without unsafe shims, loop back to P2 before selecting another bundler. Do not keep mixed Webpack 4/5 production paths as a temporary accepted state.

## P3 task boundaries

P3 will create bounded records for reference capture, shared toolchain pinning, library migrations, root migration, smoke/policy verification, audit reconciliation, and retained closure evidence. Only reference capture is initially ready.
