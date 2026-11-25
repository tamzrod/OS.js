'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const fs = require('node:fs');
const {spawnSync} = require('node:child_process');
const {
  CAPABILITIES,
  validateCapabilities,
  assertProductionStartup
} = require('../../src/server/security-profile.js');

test('capability contract defaults to every production capability disabled', () => {
  const result = validateCapabilities({});
  assert.deepEqual(Object.keys(result), CAPABILITIES);
  assert.ok(Object.values(result).every(value => value === false));
  assert.equal(Object.getPrototypeOf(result), null);
  assert.ok(Object.isFrozen(result));
});

test('capability contract accepts explicit booleans without inventing implicit permissions', () => {
  const result = validateCapabilities({staticAssets: true, websocket: false});
  assert.equal(result.staticAssets, true);
  assert.equal(result.websocket, false);
  assert.equal(result.uploads, false);
});

for (const [label, input] of [
  ['unknown capability', {unreviewed: true}],
  ['nonboolean capability', {uploads: 'false'}],
  ['array', []],
  ['null', null],
  ['inherited flags', Object.assign(Object.create({uploads: true}), {staticAssets: true})],
  ['prototype injection', JSON.parse('{"__proto__":{"uploads":true}}')],
  ['constructor injection', JSON.parse('{"constructor":{"prototype":{"uploads":true}}}')],
  ['symbol key', {[Symbol('admin')]: true}]
]) {
  test(`capability contract rejects ${label}`, () => {
    assert.throws(() => validateCapabilities(input));
  });
}

test('capability contract rejects getters without invoking them', () => {
  let called = false;
  const input = {};
  Object.defineProperty(input, 'staticAssets', {
    enumerable: true,
    get() { called = true; return true; }
  });
  assert.throws(() => validateCapabilities(input));
  assert.equal(called, false);
});

for (const [label, env] of [
  ['missing explicit production profile', {NODE_ENV: 'production'}],
  ['unknown production profile', {NODE_ENV: 'production', OSJS_DEPLOYMENT_PROFILE: 'legacy'}],
  ['server profile with default auth', {NODE_ENV: 'production', OSJS_DEPLOYMENT_PROFILE: 'server'}],
  ['server with forged secret override', {NODE_ENV: 'production', OSJS_DEPLOYMENT_PROFILE: 'server', OSJS_SESSION_SECRET: 'safe-looking-secret'}],
  ['browser-only Node boot', {NODE_ENV: 'production', OSJS_DEPLOYMENT_PROFILE: 'browser-only'}],
  ['browser profile enabling VFS', {NODE_ENV: 'production', OSJS_DEPLOYMENT_PROFILE: 'browser-only', OSJS_CAPABILITIES: '{"writableVfs":true}'}],
  ['malformed capability JSON', {NODE_ENV: 'production', OSJS_DEPLOYMENT_PROFILE: 'server', OSJS_CAPABILITIES: '{invalid'}],
  ['unknown capability JSON', {NODE_ENV: 'production', OSJS_DEPLOYMENT_PROFILE: 'server', OSJS_CAPABILITIES: '{"anything":true}'}],
  ['explicit server profile under development', {NODE_ENV: 'development', OSJS_DEPLOYMENT_PROFILE: 'server'}]
]) {
  test(`production startup denies ${label}`, () => {
    assert.throws(() => assertProductionStartup(env));
  });
}

for (const [label, env] of [
  ['unset environment', {}],
  ['unset NODE_ENV with opt-in', {OSJS_UNSAFE_LOCAL_DEV: 'true'}],
  ['development without opt-in', {NODE_ENV: 'development'}],
  ['development with false opt-in', {NODE_ENV: 'development', OSJS_UNSAFE_LOCAL_DEV: 'false'}],
  ['development with nonexact opt-in', {NODE_ENV: 'development', OSJS_UNSAFE_LOCAL_DEV: 'TRUE'}],
  ['test environment with opt-in', {NODE_ENV: 'test', OSJS_UNSAFE_LOCAL_DEV: 'true'}],
  ['development with enabled capability', {NODE_ENV: 'development', OSJS_UNSAFE_LOCAL_DEV: 'true', OSJS_CAPABILITIES: '{}'}]
]) {
  test(`unconfigured/development startup rejects ${label}`, () => {
    assert.throws(() => assertProductionStartup(env), /requires NODE_ENV=development/);
  });
}

test('explicit local development opt-in succeeds without a deployment profile', () => {
  assert.deepEqual(assertProductionStartup({
    NODE_ENV: 'development',
    OSJS_UNSAFE_LOCAL_DEV: 'true'
  }), {development: true});
});

test('legacy development entrypoint is restricted to 127.0.0.1 and listen honors hostname', () => {
  const config = fs.readFileSync(path.join(__dirname, '../../src/server/config.js'), 'utf8');
  const server = fs.readFileSync(path.join(__dirname, '../../vendor/osjs-server/src/core.js'), 'utf8');
  assert.ok(config.includes("hostname: '127.0.0.1'"));
  assert.ok(server.includes("this.httpServer.listen(httpPort, this.config('hostname'),"));
});

test('unconfigured process exits before server dependencies are imported', () => {
  const entry = path.join(__dirname, '../../src/server/index.js');
  const result = spawnSync(process.execPath, [entry], {
    env: {PATH: process.env.PATH || ''},
    encoding: 'utf8',
    timeout: 5000
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /development server requires/);
  assert.doesNotMatch(result.stderr, /Cannot find module/);
});

test('production hook runs before importing the Node server or registering providers', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../src/server/index.js'), 'utf8');
  const gate = source.indexOf("require('./security-profile.js').assertProductionStartup()");
  const imports = source.indexOf("require('../../vendor/osjs-server')");
  const register = source.indexOf('osjs.register(');
  assert.ok(gate !== -1 && imports > gate && register > gate);
});

test('production process fails before server bootstrap even without installed packages', () => {
  const entry = path.join(__dirname, '../../src/server/index.js');
  const result = spawnSync(process.execPath, [entry], {
    env: {
      PATH: process.env.PATH || '',
      NODE_ENV: 'production',
      OSJS_DEPLOYMENT_PROFILE: 'server'
    },
    encoding: 'utf8',
    timeout: 5000
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /blocked pending G5/);
  assert.doesNotMatch(result.stderr, /Cannot find module/);
});
