#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const evidence = JSON.parse(fs.readFileSync(path.join(root, 'docs/evidence/security-merge/t3.2-baseline.json')));
const sha256 = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');

for (const [key, expected] of Object.entries(evidence.packages)) {
  const directory = path.join(root, 'vendor', `osjs-${key}`);
  const lockfile = path.join(directory, 'package-lock.json');
  const lock = JSON.parse(fs.readFileSync(lockfile));
  if (lock.name !== expected.name || lock.version !== expected.version ||
      sha256(lockfile) !== expected.lockSha256 ||
      Object.keys(lock.packages || {}).length !== expected.lockPackages) {
    throw new Error(`${key}: retained lock identity differs from baseline`);
  }
  for (const [filename, artifact] of Object.entries(expected.dist)) {
    const target = path.join(directory, 'dist', filename);
    if (!fs.existsSync(target) || fs.statSync(target).size !== artifact.bytes ||
        sha256(target) !== artifact.sha256) {
      throw new Error(`${key}: output identity differs for ${filename}`);
    }
  }
  console.log(`${expected.name}@${expected.version}: ${expected.lockPackages} locked packages, ${Object.keys(expected.dist).length} outputs verified`);
}
