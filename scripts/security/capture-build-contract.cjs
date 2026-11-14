#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const [directory, sourceCommit, runtimeVersion] = process.argv.slice(2);
if (!runtimeVersion) {
  console.error('Usage: capture-build-contract.cjs <dist-directory> <source-commit> <runtime-version>');
  process.exit(2);
}

const root = path.resolve(directory);
const walk = current => fs.readdirSync(current, {withFileTypes: true}).flatMap(entry => {
  const target = path.join(current, entry.name);
  return entry.isDirectory() ? walk(target) : [target];
});
const sha256 = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
const assets = walk(root).map(filename => ({
  path: path.relative(root, filename).split(path.sep).join('/'),
  bytes: fs.statSync(filename).size,
  sha256: sha256(filename)
})).sort((a, b) => a.path.localeCompare(b.path));
const bySuffix = suffix => assets.filter(asset => asset.path.endsWith(suffix)).length;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(match => match[1]).sort();
const missingReferences = references.filter(reference =>
  !/^(?:https?:|data:|#)/.test(reference) && !fs.existsSync(path.join(root, reference.replace(/^\//, '')))
);

const contract = {
  schemaVersion: 1,
  sourceCommit,
  runtimeVersion,
  buildSystem: 'webpack 4.46.0',
  mode: 'production',
  commandPolicy: {legacyOpenSSLProvider: false},
  summary: {
    files: assets.length,
    javascript: bySuffix('.js'),
    css: bySuffix('.css'),
    sourceMaps: bySuffix('.map'),
    fonts: assets.filter(asset => asset.path.startsWith('fonts/')).length,
    images: assets.filter(asset => /\.(?:png|jpe?g|gif|webp|svg)$/.test(asset.path)).length
  },
  html: {
    title: (html.match(/<title>([^<]*)<\/title>/) || [null, null])[1],
    references,
    missingReferences
  },
  requiredAssets: ['index.html', 'favicon.png', 'osjs.js', 'osjs.css', 'vendors~osjs.js', 'vendors~osjs.css'],
  assets
};

for (const required of contract.requiredAssets) {
  if (!assets.some(asset => asset.path === required)) throw new Error(`missing required reference asset: ${required}`);
}
if (missingReferences.length) throw new Error(`missing HTML references: ${missingReferences.join(', ')}`);
process.stdout.write(`${JSON.stringify(contract, null, 2)}\n`);
