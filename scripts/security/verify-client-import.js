#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const vendor = path.join(root, 'vendor/osjs-client');
const manifestPath = path.join(vendor, 'IMPORT_MANIFEST.json');
const expected = {
  upstreamRepository: 'https://github.com/os-js/osjs-client.git',
  upstreamTag: '3.7.1',
  upstreamCommit: '53b8376d9681cf5429e6882417da9d421b1b869c',
  npmName: '@osjs/client',
  npmVersion: '3.7.1',
  npmIntegrity: 'sha512-Ov99zmdlzD2uOaVPpKy4xD2WA45wtTCgplDbgt3qzhyfU7j70fJwlMJ3SWX3xCc2lFvf2o7AQBczHdPxGpmQdA==',
  rootPackageSha256: '6f169c289d2b0f79e23e419e8f94b2acb78f55eb715556f1df8c39185ac30a4b',
  rootLockfileSha256: '5ab111720c4d3159aece1462feae3ff45bd470b73af19ea0683f0c4ee828a10d'
};

const sha256 = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');

const inventory = directory => {
  const result = [];
  const visit = current => fs.readdirSync(current, {withFileTypes: true})
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(entry => {
      const absolute = path.join(current, entry.name);
      const relative = path.relative(directory, absolute).split(path.sep).join('/');
      if (relative === 'IMPORT_MANIFEST.json') return;
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) result.push({path: relative, bytes: fs.statSync(absolute).size, sha256: sha256(absolute)});
      else throw new Error(`Unsupported import entry: ${relative}`);
    });
  visit(directory);
  return result;
};

if (!fs.existsSync(vendor)) throw new Error(`Missing client import: ${vendor}`);

if (process.argv.includes('--write')) {
  if (fs.existsSync(manifestPath)) throw new Error('Refusing to overwrite existing import manifest');
  const value = {...expected, generatedAt: '2026-11-11', files: inventory(vendor)};
  fs.writeFileSync(manifestPath, `${JSON.stringify(value, null, 2)}\n`);
  console.log(`${manifestPath}: created (${value.files.length} files)`);
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
for (const [key, value] of Object.entries(expected)) {
  if (manifest[key] !== value) throw new Error(`Import manifest ${key} mismatch`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(vendor, 'package.json'), 'utf8'));
if (packageJson.name !== expected.npmName || packageJson.version !== expected.npmVersion) {
  throw new Error(`Unexpected imported package identity: ${packageJson.name}@${packageJson.version}`);
}

const actualFiles = inventory(vendor);
if (JSON.stringify(actualFiles) !== JSON.stringify(manifest.files)) throw new Error('Imported client inventory mismatch');
if (sha256(path.join(root, 'package.json')) !== expected.rootPackageSha256) throw new Error('Root package.json changed');
if (sha256(path.join(root, 'package-lock.json')) !== expected.rootLockfileSha256) throw new Error('Root package-lock.json changed');

console.log(`client import valid: ${expected.npmName}@${expected.npmVersion}, commit ${expected.upstreamCommit}, ${actualFiles.length} files`);
