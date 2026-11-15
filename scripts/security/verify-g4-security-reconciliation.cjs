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

assert.deepStrictEqual(fullAudit.metadata.vulnerabilities,
  {info: 0, low: 8, moderate: 15, high: 21, critical: 2, total: 46});
assert.deepStrictEqual(productionAudit.metadata.vulnerabilities,
  {info: 0, low: 8, moderate: 3, high: 17, critical: 2, total: 30});

const expectedProduction = {
  '@osjs/musicplayer-application': 'application',
  'body-parser': 'server',
  'brace-expansion': 'server-cli',
  braces: 'server-cli',
  'decode-uri-component': 'server-cli',
  express: 'server',
  'glob-parent': 'server-cli',
  micromatch: 'server-cli',
  minimatch: 'server-cli',
  minimist: 'server-cli',
  moment: 'server',
  'music-metadata': 'application',
  'path-to-regexp': 'server',
  picomatch: 'server-cli',
  'proxy-addr': 'server',
  qs: 'server',
  'source-map-resolve': 'server-cli',
  tmp: 'server-cli',
  ws: 'server'
};
const severe = Object.fromEntries(Object.entries(productionAudit.vulnerabilities)
  .filter(([, finding]) => ['high', 'critical'].includes(finding.severity))
  .map(([name, finding]) => [name, finding.severity]));
assert.deepStrictEqual(Object.keys(severe).sort(), Object.keys(expectedProduction).sort());
assert.strictEqual(Object.values(severe).filter(value => value === 'high').length, 17);
assert.strictEqual(Object.values(severe).filter(value => value === 'critical').length, 2);

const removedBuildPackages = [
  '@osjs/dev-meta', 'file-loader', 'optimize-css-assets-webpack-plugin'
];
for (const [location, metadata] of Object.entries(lock.packages)) {
  const name = metadata.name || location.replace(/^.*node_modules\//, '');
  assert(!removedBuildPackages.includes(name), `${name} remains in the lock`);
  if (name === 'webpack') assert(!String(metadata.version).startsWith('4.'), 'Webpack 4 remains in the lock');
}
for (const name of [...removedBuildPackages, 'webpack']) {
  if (name === 'webpack') continue;
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
  for (const forbidden of ['@osjs/dev-meta@', 'file-loader@', 'optimize-css-assets-webpack-plugin@', 'webpack@4.', 'deepmerge@', 'js-cookie@']) {
    assert(![...identities].some(identity => identity.startsWith(forbidden)), `${forbidden} remains in ${filename}`);
  }
  assert.strictEqual(identities.has('webpack@5.112.2'), expectWebpack);
}
sbomStats(fullSbomFile, 1004, 1005, true);
sbomStats(productionSbomFile, 437, 438, false);

console.log(JSON.stringify({
  full: fullAudit.metadata.vulnerabilities,
  production: productionAudit.metadata.vulnerabilities,
  residualOwnership: expectedProduction,
  result: 'G4 build-chain findings removed; production high/critical findings remain assigned to G5.'
}, null, 2));
