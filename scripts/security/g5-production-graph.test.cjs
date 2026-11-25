'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const readJson = filename => JSON.parse(fs.readFileSync(path.join(root, filename), 'utf8'));
const manifest = readJson('package.json');
const lock = readJson('package-lock.json');
const packages = lock.packages;
const serverManifest = readJson('vendor/osjs-server/package.json');

const resolvePackage = (parent, name) => {
  let current = parent;
  while (true) {
    const candidate = current
      ? `${current}/node_modules/${name}`
      : `node_modules/${name}`;
    if (packages[candidate]) {
      return candidate;
    }
    if (!current) {
      return null;
    }
    const marker = current.lastIndexOf('/node_modules/');
    current = marker === -1 ? '' : current.slice(0, marker);
  }
};

const reachableFromProduction = () => {
  const reached = new Set();
  const queue = [];
  for (const name of Object.keys(manifest.dependencies || {})) {
    const target = resolvePackage('', name);
    if (target) {
      queue.push(target);
    }
  }

  while (queue.length > 0) {
    const current = queue.pop();
    if (reached.has(current)) {
      continue;
    }
    reached.add(current);
    for (const name of Object.keys(packages[current].dependencies || {})) {
      const target = resolvePackage(current, name);
      if (target) {
        queue.push(target);
      }
    }
  }
  return reached;
};

const nameOf = packagePath => packages[packagePath].name ||
  packagePath.replace(/^node_modules\//, '').split('/node_modules/').pop();

const productionNames = () => new Set(
  [...reachableFromProduction()].map(nameOf)
);

test('root manifest declares the Node server in neither dependency section', () => {
  assert.equal(Object.hasOwn(manifest.dependencies || {}, '@osjs/server'), false);
  assert.equal(Object.hasOwn(manifest.devDependencies || {}, '@osjs/server'), false);
});

test('lock graph contains no Node server package or link', () => {
  const entries = Object.entries(packages).filter(([packagePath]) => packagePath !== '');
  assert.equal(entries.some(([, entry]) => entry.name === '@osjs/server'), false);
  assert.equal(Object.hasOwn(packages, 'vendor/osjs-server'), false);
});

test('every Node server runtime dependency is absent from the production graph', () => {
  const names = productionNames();
  for (const name of Object.keys(serverManifest.dependencies || {})) {
    if (name === '@osjs/common') {
      continue; // Shared with the browser runtime under a separate consumer path.
    }
    assert.equal(names.has(name), false, `${name} remains production-reachable`);
  }
});

test('the Node server entrypoint loads the vendored package only after the security gate', () => {
  const source = fs.readFileSync(path.join(root, 'src/server/index.js'), 'utf8');
  const gate = source.indexOf("require('./security-profile.js').assertProductionStartup()");
  const server = source.indexOf("require('../../vendor/osjs-server')");
  const register = source.indexOf('osjs.register(');
  assert.ok(gate !== -1, 'missing fail-closed startup gate');
  assert.ok(server > gate, 'server import must follow the startup gate');
  assert.ok(register > server, 'providers must not register before the server import');
  assert.equal(source.includes("require('@osjs/server')"), false);
});

test('the browser build entrypoint does not reference the Node server', () => {
  const config = fs.readFileSync(path.join(root, 'webpack.config.js'), 'utf8');
  assert.ok(config.includes("path.resolve(__dirname, 'src/client/index.js')"));
  assert.equal(config.includes('vendor/osjs-server'), false);
  assert.equal(config.includes('@osjs/server'), false);
});
