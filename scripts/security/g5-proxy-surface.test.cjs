'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');
const path = require('node:path');
const providerPath = path.resolve(__dirname, '../../vendor/osjs-server/src/providers/core.js');
const realLoad = Module._load;
let proxyLoads = 0;
let CoreServiceProvider;
try {
  Module._load = function(request, parent, isMain) {
    if (parent && parent.filename === providerPath) {
      if (request === '@osjs/common') {
        return {ServiceProvider: class {
          constructor(core) { this.core = core; }
          destroy() {}
        }};
      }
      if (request === 'express-http-proxy') {
        proxyLoads++;
        return destination => ({destination});
      }
      if (request === 'express') return {};
      if (request === 'chokidar') return {};
      if (request === 'body-parser') return {};
      if (request === 'nocache') return () => {};
      if (request === '../utils/core.js') return {};
    }
    return realLoad.call(this, request, parent, isMain);
  };
  CoreServiceProvider = require(providerPath);
} finally {
  Module._load = realLoad;
}

function initialize(config) {
  const calls = [];
  const provider = new CoreServiceProvider({
    configuration: config,
    app: {use: (...args) => calls.push(args)},
    logger: {info() {}}
  });
  const previous = Module._load;
  try {
    Module._load = function(request, parent, isMain) {
      if (parent && parent.filename === providerPath &&
          request === 'express-http-proxy') {
        proxyLoads++;
        return destination => ({destination});
      }
      return previous.call(this, request, parent, isMain);
    };
    provider.initProxies();
  } finally {
    Module._load = previous;
  }
  return calls;
}

test('default startup never imports reverse proxy or exposes routes', () => {
  proxyLoads = 0;
  assert.deepEqual(initialize({development: false, proxy: []}), []);
  assert.deepEqual(initialize({development: true}), []);
  assert.equal(proxyLoads, 0);
});

for (const configuration of [
  {development: false, proxy: [{source: '/remote', destination: 'http://internal'}]},
  {development: undefined, proxy: [{source: '/remote', destination: 'http://internal'}]},
  {development: true, proxy: {source: '/remote', destination: 'http://internal'}},
  {development: true, proxy: [null]},
  {development: true, proxy: [{source: 'remote', destination: 'http://internal'}]},
  {development: true, proxy: [Object.create({source: '/remote', destination: 'http://internal'})]}
]) {
  test('invalid or production proxy configuration fails before importing module', () => {
    proxyLoads = 0;
    assert.throws(() => initialize(configuration));
    assert.equal(proxyLoads, 0);
  });
}

test('explicit development route retains opt-in compatibility', () => {
  proxyLoads = 0;
  const calls = initialize({
    development: true,
    proxy: [{source: '/local', destination: 'http://127.0.0.1:9000'}]
  });
  assert.deepEqual(calls, [['/local', {destination: 'http://127.0.0.1:9000'}]]);
  assert.equal(proxyLoads, 1);
});
