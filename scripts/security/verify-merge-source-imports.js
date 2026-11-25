#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const packages = ['common', 'dialogs', 'server', 'settings-application'];
const sha256 = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');

function filesIn(directory) {
  const result = [];
  const walk = current => fs.readdirSync(current, {withFileTypes: true}).forEach(entry => {
    const target = path.join(current, entry.name);
    if (entry.isDirectory()) walk(target);
    else result.push(path.relative(directory, target));
  });
  walk(directory);
  return result.sort();
}

for (const name of packages) {
  const directory = path.join(root, 'vendor', `osjs-${name}`);
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'IMPORT_MANIFEST.json')));
  const expected = manifest.files.map(entry => entry.path).sort();
  const actual = filesIn(directory).filter(file => !['IMPORT_MANIFEST.json', 'UPSTREAM.md'].includes(file));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${name}: imported file set differs from manifest`);
  }
  for (const entry of manifest.files) {
    const filename = path.join(directory, entry.path);
    if (fs.statSync(filename).size !== entry.bytes || sha256(filename) !== entry.sha256) {
      throw new Error(`${name}: identity mismatch for ${entry.path}`);
    }
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json')));
  if (pkg.name !== manifest.npmName || pkg.version !== manifest.npmVersion) {
    throw new Error(`${name}: package identity mismatch`);
  }
  if (sha256(path.join(root, 'package.json')) !== manifest.rootPackageSha256 ||
      sha256(path.join(root, 'package-lock.json')) !== manifest.rootLockfileSha256) {
    throw new Error(`${name}: root dependency identity changed during source import`);
  }
  console.log(`${manifest.npmName}@${manifest.npmVersion}: ${expected.length} files verified at ${manifest.upstreamCommit}`);
}
