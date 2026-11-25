#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = relative => fs.existsSync(path.join(root, relative));

const common = require(path.join(root, 'vendor/osjs-common/dist/main.js'));
assert.strictEqual(typeof common.safeMerge, 'function', 'common CommonJS safeMerge export');
assert.strictEqual(typeof common.safeSetPath, 'function', 'common CommonJS safeSetPath export');

const contracts = [
  ['client', 'osjsClient'],
  ['dialogs', 'osjsDialogs']
];
for (const [name, globalName] of contracts) {
  const javascript = read(`vendor/osjs-${name}/dist/main.js`);
  assert(javascript.includes(`define("${globalName}"`), `${name} AMD name`);
  assert(javascript.includes(`.${globalName}=`), `${name} UMD browser global`);
  assert(!/deepmerge/i.test(javascript), `${name} bundle contains deepmerge`);
  const map = JSON.parse(read(`vendor/osjs-${name}/dist/main.js.map`));
  assert(Array.isArray(map.sources) && map.sources.length > 0, `${name} JavaScript source map`);
}

const settings = read('vendor/osjs-settings-application/dist/main.js');
assert(/OSjs/.test(settings), 'settings bundle lost OSjs external');
assert(!/deepmerge/i.test(settings), 'settings bundle contains deepmerge');
assert(JSON.parse(read('vendor/osjs-settings-application/dist/main.js.map')).sources.length > 0, 'settings source map');

for (const name of ['client', 'dialogs']) {
  const css = read(`vendor/osjs-${name}/dist/main.css`);
  assert(css.length > 0, `${name} extracted CSS`);
  assert(JSON.parse(read(`vendor/osjs-${name}/dist/main.css.map`)).sources.length > 0, `${name} CSS source map`);
  for (const match of css.matchAll(/url\((?:"|')?([^"')]+)(?:"|')?\)/g)) {
    const reference = match[1].split(/[?#]/)[0];
    if (!/^(?:data:|https?:|\/)/.test(reference)) {
      assert(exists(`vendor/osjs-${name}/dist/${reference}`), `${name} missing CSS asset ${reference}`);
    }
  }
}

for (const asset of ['0a980ab62d8f976c8392.png', 'c321a96bf36fe6ee8d62.png']) {
  assert(exists(`vendor/osjs-client/dist/${asset}`), `client asset ${asset}`);
}

console.log('G4 library verification passed: CommonJS, UMD globals, OSjs external, CSS/assets, source maps, and G3 absence contracts preserved.');
