#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const baseRef = process.argv[2];
assert(baseRef, 'usage: review-lockfile.cjs <base-ref>');
const root = path.resolve(__dirname, '../..');
const allowlist = JSON.parse(fs.readFileSync(path.join(root, 'scripts/security/browser-runtime-allowlist.json'), 'utf8'));
const allowed = new Map(Object.entries(allowlist.packages));

const lockAt = ref => JSON.parse(execFileSync('git', ['show', `${ref}:package-lock.json`], {cwd: root, encoding: 'utf8'}));
const nameOf = (location, metadata) =>
  (metadata.name || location.replace(/^.*node_modules\//, '')).replace(/^@osjs\//, '');
const base = lockAt(baseRef).packages || {};
const head = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8')).packages;

const added = [], changed = [];
for (const [location, metadata] of Object.entries(head)) {
  if (!location || metadata.dev || metadata.link) continue;
  const previous = base[location];
  const name = nameOf(location, metadata);
  if (!previous) {
    added.push(`${name}@${metadata.version}`);
    assert(allowed.has(name), `new production package ${name}@${metadata.version} is not in the allowlist`);
  } else if (previous.version !== metadata.version) {
    changed.push(`${name}@${previous.version} -> ${metadata.version}`);
    assert.strictEqual(allowed.get(name), metadata.version,
      `production package ${name} changed to ${metadata.version} without an allowlist update`);
  }
}
for (const name of allowed.keys()) {
  assert(Object.entries(head).some(([location, metadata]) => location && !metadata.dev && !metadata.link && nameOf(location, metadata) === name),
    `allowlisted production package ${name} is missing from the lock`);
}

console.log(JSON.stringify({baseRef, added, changed, result: 'production lock changes match the reviewed allowlist'}, null, 2));
