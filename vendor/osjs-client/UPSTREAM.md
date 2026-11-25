# Upstream provenance

This directory is a source import of the official OS.js client. It is not yet used by the root package; root integration belongs to T2.5.

## Identity

- Repository: `https://github.com/os-js/osjs-client.git`
- Tag: `3.7.1`
- Commit: `53b8376d9681cf5429e6882417da9d421b1b869c`
- npm package: `@osjs/client@3.7.1`
- npm integrity: `sha512-Ov99zmdlzD2uOaVPpKy4xD2WA45wtTCgplDbgt3qzhyfU7j70fJwlMJ3SWX3xCc2lFvf2o7AQBczHdPxGpmQdA==`
- npm tarball SHA-512 (hex): `3aff7dce6765cc3dae39a54fa4acb8c43d96038e70b530a0a650db82ddeace1c9f53b8fbd1f27094c2774965f7c42736945bdfda8ec04017331dd3f11a999074`
- Import date: 2026-11-11
- License: BSD-2-Clause; see `LICENSE`.

## Import method

The immutable tag was resolved with `git ls-remote`, shallow-cloned at the exact commit, and copied without Git metadata. Only upstream-tracked package source, tests, documentation, package/build metadata, and assets were imported.

Deliberate exclusions:

- `.git/` — upstream repository metadata is represented by the immutable commit above.
- `.github/` — upstream funding and CI automation are not package inputs and must not become active automation in this fork.
- `.codeclimate.yml` — upstream hosted-analysis configuration is not a package input.

No source, test, build, dependency, or authentication file was changed during T2.1. `UPSTREAM.md` and `IMPORT_MANIFEST.json` are fork provenance additions.

## npm artifact comparison

The exact registry tarball was downloaded independently. Its package name, version, entry points, dependency declarations, license, README, changelog, and type declaration identity agree with the tag. Its published JavaScript and CSS source maps were inspected against the imported source:

- Authentication, configuration, providers, adapters, core, and other mapped client JavaScript sources are byte-identical to their exact `webpack://osjsClient/./...` source-map entries.
- `webpack.config.js` is a build input and is not embedded as an application module.
- `src/locale/index.js` is a locale barrel/context input and does not appear as a direct source-map entry.
- PNG sources are represented by emitted content-hashed assets, not source text entries.
- Generated `dist/` files are intentionally not imported at T2.1; T2.2 owns independent baseline reproduction and output comparison.

Run `node scripts/security/verify-client-import.js` to verify the complete imported file inventory and prove that root dependency files retain their G1 hashes.
