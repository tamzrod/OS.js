'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const common = require(path.join(root, 'vendor/osjs-common'));
const {safeMerge, safeSetPath, UnsafeObjectInputError} = common;
const replace = {array: 'replace'};

const productionSources = [
  'vendor/osjs-client/src',
  'vendor/osjs-common/src',
  'vendor/osjs-dialogs/src',
  'vendor/osjs-server/src',
  'vendor/osjs-settings-application/index.js'
];

const files = target => {
  const absolute = path.join(root, target);
  if (!fs.statSync(absolute).isDirectory()) return [absolute];
  return fs.readdirSync(absolute, {withFileTypes: true}).flatMap(entry =>
    files(path.join(target, entry.name))
  );
};

test('all reviewed production sources are free of deepmerge imports and calls', () => {
  const forbidden = /(?:from\s+['"]deepmerge['"]|require\(['"]deepmerge['"]\)|\bdeepmerge\s*\()/;
  for (const filename of productionSources.flatMap(files)) {
    if (/\.(?:js|mjs|cjs)$/.test(filename)) {
      assert.doesNotMatch(fs.readFileSync(filename, 'utf8'), forbidden, path.relative(root, filename));
    }
  }
});

test('safe merge preserves ordinary precedence without mutating inputs', () => {
  const base = {desktop: {theme: 'light', icons: true}, items: [1]};
  const override = {desktop: {theme: 'dark'}, items: [2]};
  assert.deepEqual(safeMerge(base, override, replace), {
    desktop: {theme: 'dark', icons: true}, items: [2]
  });
  assert.deepEqual(base, {desktop: {theme: 'light', icons: true}, items: [1]});
});

for (const [name, input] of [
  ['prototype key', JSON.parse('{"__proto__":{"admin":true}}')],
  ['nested constructor/prototype', JSON.parse('{"nested":{"constructor":{"prototype":{"admin":true}}}}')],
  ['symbol key', {[Symbol('hidden')]: true}],
  ['unsupported instance', {when: new Date(0)}]
]) {
  test(`safe merge rejects ${name}`, () => {
    assert.throws(() => safeMerge({}, input, replace), UnsafeObjectInputError);
    assert.equal({}.admin, undefined);
  });
}

test('safe merge rejects accessors without invoking them', () => {
  let invoked = 0;
  const hostile = {};
  Object.defineProperty(hostile, 'secret', {enumerable: true, get: () => ++invoked});
  assert.throws(() => safeMerge({}, hostile, replace), UnsafeObjectInputError);
  assert.equal(invoked, 0);
});

test('safe merge rejects inherited enumerable state', () => {
  const hostile = Object.create({admin: true});
  hostile.visible = true;
  assert.throws(() => safeMerge({}, hostile, replace), UnsafeObjectInputError);
});

test('safe merge rejects cycles and requires an explicit array policy', () => {
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => safeMerge({}, cyclic, replace), UnsafeObjectInputError);
  assert.throws(() => safeMerge({items: [1]}, {items: [2]}, {}), UnsafeObjectInputError);
});

test('safe dotted paths reject every reserved segment', () => {
  for (const segment of ['__proto__', 'prototype', 'constructor']) {
    assert.throws(
      () => safeSetPath({}, `desktop.${segment}.admin`, true, replace),
      UnsafeObjectInputError
    );
  }
  assert.equal({}.admin, undefined);
});
