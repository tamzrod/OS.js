'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const merge4 = require(path.join(root, 'vendor/osjs-common/node_modules/deepmerge'));
const merge2 = require(path.join(root, 'vendor/osjs-dialogs/node_modules/deepmerge'));
const forbidden = /Unsafe object input/;
const parsed = value => JSON.parse(value);

const sites = [
  ['vendor/osjs-client/src/settings.js', /merge\(defaults, settings,/],
  ['vendor/osjs-client/src/filesystem.js', /const result = merge\(\{/],
  ['vendor/osjs-client/src/application.js', /merge\(options, applyOptions\)/],
  ['vendor/osjs-client/src/desktop.js', /merge\(defaultSettings, userSettings,/],
  ['vendor/osjs-client/src/providers/core.js', /merge\(translations, this\.options\.locales/],
  ['vendor/osjs-common/src/core.js', /merger\(omitted, configuration\)/],
  ['vendor/osjs-dialogs/src/dialog.js', /merge\(\{[\s\S]*?\}, options,/],
  ['vendor/osjs-dialogs/src/dialog.js', /merge\(this\.options\.window \|\| \{\}, options,/],
  ['vendor/osjs-server/src/core.js', /deepmerge\(o, val\(k\)\)/],
  ['vendor/osjs-server/src/core.js', /deepmerge\(cfg, argvConfig\)/],
  ['vendor/osjs-settings-application/index.js', /merge\(state\.settings, object\)/]
];

test('inventory remains bound to all eleven production merge sites', () => {
  for (const [filename, pattern] of sites) {
    assert.match(fs.readFileSync(path.join(root, filename), 'utf8'), pattern, filename);
  }
});

test('ordinary precedence and nested compatibility baseline is reproduced', () => {
  assert.deepEqual(merge4({a: {x: 1}, keep: true}, {a: {y: 2}}), {
    a: {x: 1, y: 2}, keep: true
  });
});

test('4.x rejects nested constructor/prototype keys', () => {
  assert.throws(() => merge4({}, parsed('{"nested":{"constructor":{"prototype":{"admin":true}}}}')), forbidden);
});

test('4.x rejects accessors without invoking them', () => {
  let invoked = 0;
  const input = {};
  Object.defineProperty(input, 'secret', {enumerable: true, get: () => ++invoked});
  assert.throws(() => merge4({}, input), forbidden);
  assert.equal(invoked, 0);
});

test('4.x rejects inherited enumerable data', () => {
  const input = Object.create({admin: true});
  input.visible = true;
  assert.throws(() => merge4({}, input), forbidden);
});

test('4.x rejects symbol-keyed configuration', () => {
  assert.throws(() => merge4({}, {[Symbol('hidden')]: true}), forbidden);
});

test('4.x rejects unsupported object instances', () => {
  assert.throws(() => merge4({}, {when: new Date(0)}), forbidden);
});

test('4.x rejects cycles with a typed safe-input error', () => {
  const input = {};
  input.self = input;
  assert.throws(() => merge4({}, input), forbidden);
});

test('array behavior requires an explicit policy', () => {
  assert.throws(() => merge4({items: [1]}, {items: [2]}), forbidden);
});

test('dialogs 2.x rejects parsed __proto__ instead of poisoning result inheritance', () => {
  assert.throws(() => merge2({}, parsed('{"__proto__":{"dialogAdmin":true}}')), forbidden);
  assert.equal({}.dialogAdmin, undefined);
});

test('local-storage accumulator rejects a reserved storage key', () => {
  const accumulate = (target, key, value) => Object.assign(target, {[key]: value});
  assert.throws(() => accumulate({}, '__proto__', {storageAdmin: true}), forbidden);
});

test('settings dotted-path builder rejects reserved path segments', () => {
  const build = (key, value) => {
    const object = {};
    const keys = key.split(/\./g);
    let previous = object;
    keys.forEach((segment, index) => {
      previous[segment] = index === keys.length - 1 ? value : {};
      previous = previous[segment];
    });
    return object;
  };
  try {
    assert.throws(() => build('desktop.__proto__.g3PathPolluted', true), forbidden);
  } finally {
    delete Object.prototype.g3PathPolluted;
  }
});
