#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const readJson = filename => JSON.parse(fs.readFileSync(path.join(root, filename), 'utf8'));
const reference = readJson('docs/evidence/security-build/t4.1-root-reference-contract.json');
const migrated = readJson('docs/evidence/security-build/t4.4-root-webpack5-contract.json');
const fail = message => {
  throw new Error(message);
};
const byPath = contract => new Map(contract.assets.map(asset => [asset.path, asset]));

for (const key of ['javascript', 'css', 'sourceMaps', 'fonts', 'images']) {
  if (migrated.summary[key] !== reference.summary[key]) {
    fail(`summary mismatch for ${key}: ${migrated.summary[key]} !== ${reference.summary[key]}`);
  }
}

if (migrated.summary.files !== reference.summary.files + 1) {
  fail('the only allowed file-count addition is the Webpack 5 license sidecar');
}

if (JSON.stringify(migrated.html) !== JSON.stringify(reference.html)) {
  fail('HTML title/reference contract changed');
}

const current = byPath(migrated);
for (const asset of reference.assets.filter(({path: filename}) => filename.startsWith('fonts/'))) {
  if (current.get(asset.path)?.sha256 !== asset.sha256) fail(`font identity changed: ${asset.path}`);
}

const imageHashes = contract => contract.assets
  .filter(({path: filename}) => /\.(?:png|jpe?g|gif|webp|svg)$/.test(filename))
  .map(({sha256}) => sha256)
  .sort();
if (JSON.stringify(imageHashes(migrated)) !== JSON.stringify(imageHashes(reference))) {
  fail('image byte identities changed');
}

for (const required of migrated.requiredAssets) {
  if (!current.has(required)) fail(`missing required migrated asset: ${required}`);
}
for (const map of migrated.assets.filter(({path: filename}) => filename.endsWith('.map'))) {
  if (!map.bytes) fail(`empty source map: ${map.path}`);
}

const config = fs.readFileSync(path.join(root, 'webpack.config.js'), 'utf8');
for (const obsolete of ['file-loader', 'optimize-css-assets-webpack-plugin', 'OptimizeCSSAssetsPlugin']) {
  if (config.includes(obsolete)) fail(`obsolete root build token remains: ${obsolete}`);
}
if (!config.includes("type: 'asset/resource'")) fail('Webpack 5 asset modules are not configured');
if (!config.includes('CssMinimizerPlugin')) fail('Webpack 5 CSS minimizer is not configured');

console.log('G4 root build verification passed: inventory shape, HTML, fonts, images, source maps, and Webpack 5 configuration reconcile.');
