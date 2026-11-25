'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const corePath = path.resolve(__dirname, '../../vendor/osjs-server/src/providers/core.js');
const packagesPath = path.resolve(__dirname, '../../vendor/osjs-server/src/providers/packages.js');
const watched = [];
let watcherImports = 0;

class ServiceProvider {
  constructor(core) {
    this.core = core;
  }
  destroy() {}
}

class MockPackages {
  constructor(core, options) {
    this.options = options;
  }
  start() {}
  async init() {}
  async destroy() {}
}

const originalLoad = Module._load;
let CoreServiceProvider;
let PackageServiceProvider;

try {
  Module._load = function(request, parent, isMain) {
    if (parent && (parent.filename === corePath || parent.filename === packagesPath)) {
      if (request === '@osjs/common') return {ServiceProvider};
      if (request === '../utils/core.js' || request === '../utils/core') return {closeWatches: async () => {}, isAuthenticated: () => {}};
      if (request === 'express') return {Router: () => ({use() {}})};
      if (request === 'body-parser') return {};
      if (request === 'nocache') return () => {};
      if (request === 'fs-extra') return {existsSync: () => true};
      if (request === '../packages') return MockPackages;
      if (request === 'chokidar') {
        watcherImports++;
        return {watch: filename => {
          watched.push(filename);
          return {on() { return this; }, close() {}};
        }};
      }
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[corePath];
  delete require.cache[packagesPath];
  CoreServiceProvider = require(corePath);
  PackageServiceProvider = require(packagesPath);
} finally {
  Module._load = originalLoad;
}

const makeCore = development => ({
  configuration: {
    development,
    public: '/tmp/osjs-test-public',
    root: '/tmp/osjs-test-root',
    packages: {metadata: 'metadata.json', discovery: 'packages.json'}
  },
  logger: {warn() {}},
  broadcast() {}
});

const run = (provider, method) => {
  const previousLoad = Module._load;
  try {
    Module._load = function(request, parent, isMain) {
      if (request === 'chokidar' && parent &&
          (parent.filename === corePath || parent.filename === packagesPath)) {
        watcherImports++;
        return {watch: filename => {
          watched.push(filename);
          return {on() { return this; }, close() {}};
        }};
      }
      return previousLoad.call(this, request, parent, isMain);
    };
    provider[method]();
  } finally {
    Module._load = previousLoad;
  }
};

test('provider module imports do not load the optional watcher', () => {
  assert.equal(watcherImports, 0);
  assert.deepEqual(watched, []);
});

test('production provider starts never load watcher or create watchers', () => {
  watcherImports = 0;
  watched.length = 0;
  run(new CoreServiceProvider(makeCore(false)), 'start');
  run(new PackageServiceProvider(makeCore(false)), 'start');
  assert.equal(watcherImports, 0);
  assert.deepEqual(watched, []);
});

test('development explicitly starts both legacy watcher features', () => {
  watcherImports = 0;
  watched.length = 0;
  run(new CoreServiceProvider(makeCore(true)), 'start');
  run(new PackageServiceProvider(makeCore(true)), 'start');
  assert.equal(watcherImports, 2);
  assert.equal(watched.length, 2);
  assert.match(watched[0], /osjs-test-public/);
  assert.match(watched[1], /metadata.json/);
});
