'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const dist = path.join(root, 'dist');

const files = directory => fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
  if (entry.isSymbolicLink()) return [];
  const target = path.join(directory, entry.name);
  return entry.isDirectory() ? files(target) : [target];
});

test('the distribution contains no native addon or package manifest', () => {
  const entries = files(dist);
  assert(entries.some(filename => filename.endsWith('index.html')));
  for (const filename of entries) {
    assert(!filename.endsWith('.node'), `${path.relative(root, filename)} is a native addon`);
    if (path.basename(filename) === 'package.json') {
      const manifest = JSON.parse(fs.readFileSync(filename, 'utf8'));
      assert(!manifest.dependencies && !manifest.devDependencies,
        `${path.relative(root, filename)} declares runtime dependencies`);
      assert(!manifest.scripts, `${path.relative(root, filename)} declares scripts`);
    }
  }
});

test('the distribution exposes no server request, upload or archive surface', () => {
  const markers = [
    'http.createServer', 'https.createServer', 'net.createServer',
    'express()', 'body-parser', 'connect-loki', 'express-session',
    'express-ws', 'filehound', 'formidable', 'multiparty', 'busboy',
    'path-to-regexp', 'proxy-addr', 'archiver', 'unzipper', 'yauzl',
    '@osjs/server'
  ];
  for (const filename of files(dist)) {
    const content = fs.readFileSync(filename);
    for (const marker of markers) {
      assert(!content.includes(marker), `${marker} remains in ${path.relative(root, filename)}`);
    }
  }
});

test('the distribution has no runtime listener or request handler', () => {
  const common = require(path.join(root, 'vendor/osjs-common'));
  assert.equal(typeof common.safeMerge, 'function');
  const resources = process.getActiveResourcesInfo().filter(name => /Server|Socket/.test(name));
  assert.deepEqual(resources, []);
});
