'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');
const path = require('node:path');

const authPath = path.resolve(__dirname, '../../vendor/osjs-server/src/auth.js');
const nullPath = path.resolve(__dirname, '../../vendor/osjs-server/src/adapters/auth/null.js');
const nullAdapter = require(nullPath);
const originalLoad = Module._load;
let Auth;
try {
  Module._load = function(request, parent, isMain) {
    if (parent && parent.filename === authPath && request === 'fs-extra') {
      return {ensureDir: async () => {}};
    }
    if (parent && parent.filename === authPath && request === 'consola') {
      return {withTag: () => ({warn() {}})};
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  Auth = require(authPath);
} finally {
  Module._load = originalLoad;
}

const createCore = (development = false) => ({
  configuration: {
    development,
    auth: {requiredGroups: [], denyUsers: []}
  },
  logger: {warn() {}}
});

const previousEnv = process.env.NODE_ENV;
test.after(() => {
  if (previousEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousEnv;
});

test('production refuses implicit default null adapter', () => {
  delete process.env.NODE_ENV;
  assert.throws(() => new Auth(createCore(false)), /non-null adapter/);
});

test('production refuses explicitly supplied null adapter', () => {
  delete process.env.NODE_ENV;
  assert.throws(() => new Auth(createCore(false), {adapter: nullAdapter}), /non-null adapter/);
});

test('NODE_ENV production refuses null adapter even if development configuration is true', () => {
  process.env.NODE_ENV = 'production';
  assert.throws(() => new Auth(createCore(true)), /non-null adapter/);
  delete process.env.NODE_ENV;
});

test('production refuses invalid adapter factories or missing login method', () => {
  delete process.env.NODE_ENV;
  for (const adapter of [null, false, () => null, () => ({}), () => ({login: true})]) {
    assert.throws(() => new Auth(createCore(false), {adapter}));
  }
});

test('production never falls back to null authentication after adapter errors', () => {
  delete process.env.NODE_ENV;
  const failing = () => { throw new Error('adapter unavailable'); };
  assert.throws(() => new Auth(createCore(false), {adapter: failing}), /adapter unavailable/);
});

test('custom adapter can be constructed but does not authorize production server startup', () => {
  delete process.env.NODE_ENV;
  const actualAdapter = {login: async () => false};
  const auth = new Auth(createCore(false), {adapter: () => actualAdapter});
  assert.equal(auth.adapter, actualAdapter);
  assert.notEqual(auth.adapter.login, nullAdapter().login);
  assert.throws(
    () => require('../../src/server/security-profile.js').assertProductionStartup({
      NODE_ENV: 'production', OSJS_DEPLOYMENT_PROFILE: 'server'
    }),
    /blocked pending G5/
  );
});

test('legacy development-only null adapter remains available', () => {
  delete process.env.NODE_ENV;
  const auth = new Auth(createCore(true));
  assert.equal(typeof auth.adapter.login, 'function');
});

test('legacy development adapter failure fallback remains available', () => {
  delete process.env.NODE_ENV;
  const auth = new Auth(createCore(true), {adapter: () => { throw Error('offline'); }});
  assert.equal(typeof auth.adapter.login, 'function');
});
