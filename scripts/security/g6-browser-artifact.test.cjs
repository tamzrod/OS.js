'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const dist = path.join(root, 'dist');
const allowlist = JSON.parse(fs.readFileSync(path.join(__dirname, 'browser-runtime-allowlist.json'), 'utf8'));
const hashAsset = new RegExp(allowlist.hashAssetPattern);
const allowedPackages = new Set(Object.keys(allowlist.packages));

const entries = directory => fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
  const relative = path.relative(dist, path.join(directory, entry.name));
  return entry.isDirectory() ? entries(path.join(directory, entry.name)) : [{entry, relative}];
});

test('the artifact contains only allowlisted files and reviewed package links', () => {
  for (const {entry, relative} of entries(dist)) {
    const normalized = relative.split(path.sep).join('/');
    if (entry.isSymbolicLink()) {
      assert.match(normalized, /^(?:apps|themes|icons|sounds)\/[^/]+$/,
        `${normalized} is an unexpected link`);
      const target = fs.realpathSync(path.join(dist, relative));
      const match = target.match(/\/(?:node_modules\/@osjs\/|vendor\/osjs-)([^/]+)\/dist$/);
      assert(match, `${normalized} points outside a reviewed package: ${target}`);
      const packageName = match[1].startsWith('@osjs/') ? match[1].slice(6) : match[1];
      assert(allowedPackages.has(packageName), `${normalized} links unreviewed package ${packageName}`);
      continue;
    }
    assert(!entry.name.startsWith('.') || normalized === '.gitignore',
      `${normalized} is an unexpected dotfile`);
    if (allowlist.rootFiles.includes(normalized)) continue;
    if (/^fonts\/roboto-latin-[^/]+\.woff2?$/.test(normalized)) continue;
    if (!normalized.includes('/') && hashAsset.test(normalized)) continue;
    assert.fail(`${normalized} is not in the browser artifact allowlist`);
  }
});

test('the artifact has no source, server, test or dependency tree', () => {
  for (const {entry, relative} of entries(dist)) {
    const normalized = relative.split(path.sep).join('/');
    assert(!/^(?:src|vendor|scripts|test|tests|node_modules)(?:\/|$)/.test(normalized),
      `${normalized} must not ship`);
    if (!entry.isSymbolicLink()) {
      assert(!/\.(?:test|spec)\.c?js$/.test(normalized), `${normalized} must not ship`);
    }
  }
});

test('the production SBOM matches the reviewed allowlist exactly', () => {
  const sbomFile = process.env.G6_SBOM;
  if (!sbomFile) return;
  const sbom = JSON.parse(fs.readFileSync(sbomFile, 'utf8'));
  const actual = new Map(sbom.components.map(component => [component.name, component.version]));
  assert.deepEqual(Object.fromEntries([...actual].sort()), allowlist.packages);
});

test('the root manifest declares only allowlisted browser packages', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const dependency of Object.keys(manifest.dependencies || {})) {
    const name = dependency.startsWith('@osjs/') ? dependency.slice(6) : dependency;
    assert(allowedPackages.has(name), `root dependency ${dependency} is not allowlisted`);
  }
});

test('the HTML entry point loads only local artifact assets', () => {
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  const references = [...html.matchAll(/(?:src|href)=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/g)]
    .map(match => match[1] || match[2] || match[3]);
  assert(references.length > 0);
  for (const reference of references) {
    assert(!/^(?:[a-z]+:)?\/\//i.test(reference), `${reference} is not local`);
    assert(!reference.split('/').includes('..'), `${reference} escapes the artifact`);
  }
  assert(references.some(reference => reference.endsWith('osjs.js')));
});

test('metadata lists only linked application packages', () => {
  const metadata = JSON.parse(fs.readFileSync(path.join(dist, 'metadata.json'), 'utf8'));
  assert(Array.isArray(metadata) && metadata.length > 0);
  const linked = new Set(fs.readdirSync(path.join(dist, 'apps'))
    .concat(fs.readdirSync(path.join(dist, 'themes')))
    .concat(fs.readdirSync(path.join(dist, 'icons')))
    .concat(fs.readdirSync(path.join(dist, 'sounds'))));
  for (const item of metadata) {
    assert(linked.has(item.name), `metadata lists unlinked package ${item.name}`);
  }
});
