#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const lock = JSON.parse(read('package-lock.json'));
const packages = ['client', 'common', 'dialogs', 'settings-application'];

for (const name of packages) {
  const dependency = `@osjs/${name}`;
  const expected = `file:vendor/osjs-${name}`;
  assert.strictEqual(lock.packages[''].dependencies[dependency], expected, `${dependency} root link`);
  assert.strictEqual(lock.packages[`node_modules/${dependency}`].link, true, `${dependency} lock link`);
}

assert(!Object.hasOwn(lock.packages[''].dependencies || {}, '@osjs/server'),
  '@osjs/server must not be a root dependency');
assert(!Object.hasOwn(lock.packages[''].devDependencies || {}, '@osjs/server'),
  '@osjs/server must not be a root development link');
assert(!Object.hasOwn(lock.packages, 'node_modules/@osjs/server'),
  '@osjs/server must not enter the root lock graph');
assert(fs.existsSync(path.join(root, 'vendor/osjs-server/package.json')),
  'vendored development server is missing');

assert(!JSON.stringify(lock).includes('deepmerge'), 'root release lock contains deepmerge');

for (const relative of [
  'vendor/osjs-client/package.json',
  'vendor/osjs-common/package.json',
  'vendor/osjs-dialogs/package.json',
  'vendor/osjs-server/package.json',
  'vendor/osjs-settings-application/package.json'
]) {
  const manifest = JSON.parse(read(relative));
  assert(!Object.prototype.hasOwnProperty.call(manifest.dependencies || {}, 'deepmerge'), `${relative} declares deepmerge`);
}

const markers = ['node_modules/deepmerge', 'deepmerge/dist', 'isMergeableObject'];
for (const relative of [
  'vendor/osjs-client/dist/main.js',
  'vendor/osjs-client/dist/main.js.map',
  'vendor/osjs-common/dist/main.js',
  'vendor/osjs-common/dist/main.js.map',
  'vendor/osjs-dialogs/dist/main.js',
  'vendor/osjs-dialogs/dist/main.js.map',
  'vendor/osjs-settings-application/dist/main.js',
  'vendor/osjs-settings-application/dist/main.js.map'
]) {
  const content = read(relative);
  markers.forEach(marker => assert(!content.includes(marker), `${relative} contains ${marker}`));
}

const {safeMerge, safeSetPath, UnsafeObjectInputError} = require(path.join(root, 'vendor/osjs-common'));
assert.throws(() => safeMerge({}, JSON.parse('{"__proto__":{"admin":true}}'), {array: 'replace'}), UnsafeObjectInputError);
assert.throws(() => safeSetPath({}, 'desktop.constructor.prototype.admin', true, {array: 'replace'}), UnsafeObjectInputError);
assert.strictEqual(({}).admin, undefined);

console.log('G3 integration verification passed: 4 browser links, no root server link, and no deepmerge runtime.');
