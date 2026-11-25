#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const lockfiles = [
  'package-lock.json',
  'vendor/osjs-common/package-lock.json',
  'vendor/osjs-client/package-lock.json',
  'vendor/osjs-dialogs/package-lock.json',
  'vendor/osjs-settings-application/package-lock.json'
];
const forbidden = new Set([
  '@osjs/dev-meta',
  'file-loader',
  'optimize-css-assets-webpack-plugin'
]);

for (const relative of lockfiles) {
  const lock = JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
  for (const [location, metadata] of Object.entries(lock.packages || {})) {
    const name = metadata.name || location.replace(/^.*node_modules\//, '');
    assert(!forbidden.has(name), `${relative} retains ${name}`);
    if (name === 'webpack') assert(!String(metadata.version).startsWith('4.'), `${relative} retains Webpack 4`);
    if (name === 'webpack-cli') assert(!String(metadata.version).startsWith('3.'), `${relative} retains webpack-cli 3`);
    if (name === 'html-webpack-plugin') assert(!String(metadata.version).startsWith('3.'), `${relative} retains html-webpack-plugin 3`);
  }
  assert(!JSON.stringify(lock).includes('deepmerge'), `${relative} reopens G3 with deepmerge`);
}

const rootLock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const exact = {
  webpack: '5.112.2',
  'webpack-cli': '7.3.1',
  'html-webpack-plugin': '5.6.8',
  'mini-css-extract-plugin': '2.10.2',
  'css-loader': '7.1.5',
  'sass-loader': '17.1.0',
  sass: '1.108.2',
  'babel-loader': '10.1.1',
  'css-minimizer-webpack-plugin': '8.0.0',
  'source-map-loader': '5.0.0'
};
for (const [name, version] of Object.entries(exact)) {
  assert.strictEqual(rootLock.packages[`node_modules/${name}`]?.version, version, `${name} pin`);
}

const webpackEntries = Object.entries(rootLock.packages).filter(([location, metadata]) =>
  location.endsWith('node_modules/webpack') || metadata.name === 'webpack'
);
assert.strictEqual(webpackEntries.length, 1, 'root lock must contain one Webpack installation');

for (const relative of [
  'vendor/osjs-common/package.json',
  'vendor/osjs-client/package.json',
  'vendor/osjs-dialogs/package.json',
  'vendor/osjs-settings-application/package.json'
]) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
  assert.deepStrictEqual(manifest.devDependencies, {}, `${relative} retains package-local build tooling`);
}

console.log('G4 toolchain verification passed: one exact Webpack 5 stack, no obsolete build meta-chain, G3 deepmerge invariant preserved.');
