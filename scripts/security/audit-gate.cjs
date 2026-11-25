#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const [fullAuditFile, productionAuditFile] = process.argv.slice(2);
assert(productionAuditFile, 'usage: audit-gate.cjs <full-audit.json> <production-audit.json>');

const root = path.resolve(__dirname, '../..');
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const lock = read(path.join(root, 'package-lock.json'));
const full = read(fullAuditFile).metadata.vulnerabilities;
const production = read(productionAuditFile).metadata.vulnerabilities;

for (const severity of ['critical', 'high']) {
  assert.strictEqual(production[severity], 0, `production ${severity} finding blocks the gate`);
}
assert.strictEqual(full.critical, 0, 'full-tree critical finding blocks the gate');

const developmentHighs = new Map([
  ['postcss', {expiry: '2027-02-28', owner: 'security owner at G8 T8.5'}]
]);
const audit = read(fullAuditFile);
for (const [name, finding] of Object.entries(audit.vulnerabilities)) {
  if (finding.severity !== 'high' && finding.severity !== 'critical') continue;
  const exception = developmentHighs.get(name);
  assert(exception, `${name} high finding has no recorded exception`);
  assert(new Date(exception.expiry + 'T00:00:00Z') > new Date(), `${name} exception is expired`);
  const copies = Object.entries(lock.packages)
    .filter(([location, metadata]) => (metadata.name || location.replace(/^.*node_modules\//, '')) === name);
  assert(copies.length > 0, `${name} is not present in the lock`);
  for (const [location, metadata] of copies) {
    assert.strictEqual(metadata.dev, true, `${name} at ${location} is not development-only`);
  }
}

console.log(JSON.stringify({
  production,
  full,
  result: 'production high/critical zero; full-tree highs are recorded development-only exceptions'
}, null, 2));
