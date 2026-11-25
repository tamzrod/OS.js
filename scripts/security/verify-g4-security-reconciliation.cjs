#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const [fullAuditFile, productionAuditFile, fullSbomFile, productionSbomFile] = process.argv.slice(2);
assert(productionSbomFile, 'usage: verify-g4-security-reconciliation.cjs <full-audit> <production-audit> <full-sbom> <production-sbom>');

const root = path.resolve(__dirname, '../..');
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const lock = read(path.join(root, 'package-lock.json'));
const fullAudit = read(fullAuditFile);
const productionAudit = read(productionAuditFile);

const full = fullAudit.metadata.vulnerabilities;
const production = productionAudit.metadata.vulnerabilities;
assert.strictEqual(production.critical, 0, 'production critical finding remains');
assert.strictEqual(production.high, 0, 'production high finding remains');
assert.strictEqual(production.total, 0, 'production finding total is not zero');
assert.strictEqual(full.critical, 0, 'full-tree critical finding remains');

const removedBuildPackages = [
  '@osjs/dev-meta', 'file-loader', 'optimize-css-assets-webpack-plugin'
];
const removedServerRuntime = [
  '@osjs/server', 'express', 'express-ws', 'express-session', 'express-http-proxy',
  'body-parser', 'connect-loki', 'filehound', 'formidable', 'moment', 'ws',
  'nocache', 'morgan', 'proxy-addr', 'path-to-regexp'
];
const forbidden = [...removedBuildPackages, ...removedServerRuntime];

for (const [location, metadata] of Object.entries(lock.packages)) {
  const name = metadata.name || location.replace(/^.*node_modules\//, '');
  assert(!forbidden.includes(name), `${name} remains in the lock`);
  if (name === 'webpack') assert(!String(metadata.version).startsWith('4.'), 'Webpack 4 remains in the lock');
}
for (const name of forbidden) {
  assert(!Object.hasOwn(fullAudit.vulnerabilities, name), `${name} remains in the full audit`);
  assert(!Object.hasOwn(productionAudit.vulnerabilities, name), `${name} remains in the production audit`);
}

function sbomStats(filename, expectedComponents, expectedDependencies, expectWebpack) {
  const document = read(filename);
  assert.strictEqual(document.bomFormat, 'CycloneDX');
  assert.strictEqual(document.specVersion, '1.6');
  const components = [];
  const walk = entries => (entries || []).forEach(component => {
    components.push(component);
    walk(component.components);
  });
  walk(document.components);
  walk(document.metadata?.component?.components);
  assert.strictEqual(components.length, expectedComponents);
  assert.strictEqual(document.dependencies.length, expectedDependencies);
  const identities = new Set(components.map(component => `${component.name}@${component.version}`));
  for (const name of forbidden) {
    assert(![...identities].some(identity => identity.startsWith(`${name}@`)), `${name} remains in ${filename}`);
  }
  for (const name of ['deepmerge@', 'js-cookie@']) {
    assert(![...identities].some(identity => identity.startsWith(name)), `${name} remains in ${filename}`);
  }
  assert.strictEqual(identities.has('webpack@5.112.2'), expectWebpack);
}
sbomStats(fullSbomFile, 769, 770, true);
sbomStats(productionSbomFile, 32, 33, false);

console.log(JSON.stringify({
  full,
  production,
  result: 'G4 build-chain findings removed and the production graph is limited to the static browser runtime.'
}, null, 2));
