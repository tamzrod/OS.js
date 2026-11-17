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

test('ordinary local development without production profile retains legacy behavior', () => {
  assert.deepEqual(assertProductionStartup({NODE_ENV: 'development'}), {development: true});
});

test('production hook runs before importing @osjs/server or registering providers', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../src/server/index.js'), 'utf8');
  const gate = source.indexOf("require('./security-profile.js').assertProductionStartup()");
  const imports = source.indexOf("require('@osjs/server')");
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
