#!/usr/bin/env node

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error(message);
  process.exit(2);
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function sha256(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function packageNameFromPath(packagePath) {
  const normalized = packagePath.replace(/^node_modules\//, '');
  return normalized.split('/node_modules/').pop();
}

function normalizePackage(packagePath, name, entry) {
  return {
    path: packagePath,
    name,
    version: entry.version || null,
    resolved: entry.resolved || null,
    integrity: entry.integrity || null,
    dev: entry.dev === true,
    optional: entry.optional === true
  };
}

function inventoryV1(lockfile) {
  const packages = [];

  function walk(dependencies, parentPath) {
    for (const name of Object.keys(dependencies || {}).sort()) {
      const entry = dependencies[name];
      const packagePath = parentPath
        ? `${parentPath}/node_modules/${name}`
        : `node_modules/${name}`;
      packages.push(normalizePackage(packagePath, name, entry));
      walk(entry.dependencies, packagePath);
    }
  }

  walk(lockfile.dependencies, '');
  return packages;
}

function inventoryModern(lockfile) {
  return Object.entries(lockfile.packages || {})
    .filter(([packagePath]) => packagePath !== '')
    .map(([packagePath, entry]) => normalizePackage(
      packagePath,
      entry.name || packageNameFromPath(packagePath),
      entry
    ));
}

function createInventory(lockfilePath) {
  const lockfile = readJson(lockfilePath);
  const lockfileVersion = Number(lockfile.lockfileVersion);
  const packages = lockfileVersion === 1
    ? inventoryV1(lockfile)
    : inventoryModern(lockfile);

  packages.sort((left, right) => left.path.localeCompare(right.path));

  return {
    formatVersion: 1,
    source: path.basename(lockfilePath),
    lockfileVersion,
    lockfileSha256: sha256(lockfilePath),
    packageCount: packages.length,
    packages
  };
}

function writeJson(filename, value) {
  const output = `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(filename, output, {encoding: 'utf8', flag: 'wx'});
}

function indexByPath(inventory) {
  return new Map(inventory.packages.map(entry => [entry.path, entry]));
}

function compare(before, after, allowedAdditions = []) {
  const beforeByPath = indexByPath(before);
  const afterByPath = indexByPath(after);
  const fields = ['name', 'version', 'resolved', 'integrity', 'dev', 'optional'];
  const added = [];
  const removed = [];
  const changed = [];

  for (const packagePath of [...afterByPath.keys()].sort()) {
    if (!beforeByPath.has(packagePath)) {
      added.push(afterByPath.get(packagePath));
    }
  }

  for (const packagePath of [...beforeByPath.keys()].sort()) {
    if (!afterByPath.has(packagePath)) {
      removed.push(beforeByPath.get(packagePath));
      continue;
    }

    const beforeEntry = beforeByPath.get(packagePath);
    const afterEntry = afterByPath.get(packagePath);
    const differences = {};
    for (const field of fields) {
      if (beforeEntry[field] !== afterEntry[field]) {
        differences[field] = {
          before: beforeEntry[field],
          after: afterEntry[field]
        };
      }
    }
    if (Object.keys(differences).length > 0) {
      changed.push({path: packagePath, differences});
    }
  }

  const matches = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  const approvedAdditions = added.filter(entry => allowedAdditions.some(allowed => matches(entry, allowed)));
  const unapprovedAdditions = added.filter(entry => !allowedAdditions.some(allowed => matches(entry, allowed)));
  const missingApprovedAdditions = allowedAdditions.filter(allowed => !added.some(entry => matches(entry, allowed)));

  return {
    formatVersion: 1,
    before: {
      lockfileVersion: before.lockfileVersion,
      lockfileSha256: before.lockfileSha256,
      packageCount: before.packageCount
    },
    after: {
      lockfileVersion: after.lockfileVersion,
      lockfileSha256: after.lockfileSha256,
      packageCount: after.packageCount
    },
    equivalent: unapprovedAdditions.length === 0 && missingApprovedAdditions.length === 0 && removed.length === 0 && changed.length === 0,
    added,
    approvedAdditions,
    unapprovedAdditions,
    missingApprovedAdditions,
    removed,
    changed
  };
}

const [command, ...args] = process.argv.slice(2);

if (command === 'inventory') {
  if (args.length !== 2) fail('Usage: lockfile-inventory.js inventory <package-lock.json> <output.json>');
  writeJson(args[1], createInventory(args[0]));
  console.log(`${args[1]}: inventory created`);
} else if (command === 'compare') {
  if (args.length < 3 || args.length > 4) fail('Usage: lockfile-inventory.js compare <before.json> <after.json> <output.json> [allowed-additions.json]');
  const allowedAdditions = args[3] ? readJson(args[3]) : [];
  if (!Array.isArray(allowedAdditions)) fail('Allowed additions must be a JSON array');
  const result = compare(readJson(args[0]), readJson(args[1]), allowedAdditions);
  writeJson(args[2], result);
  console.log(`${args[2]}: ${result.equivalent ? 'equivalent' : 'graph drift detected'}`);
  process.exit(result.equivalent ? 0 : 1);
} else {
  fail('Usage: lockfile-inventory.js <inventory|compare> ...');
}
