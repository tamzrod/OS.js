'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');
const path = require('node:path');

// Import the real auth provider with strictly mocked service-layer dependencies.
// This exercises its route registrations without requiring an HTTP listener or
// an installed dependency graph. It does not claim end-to-end server coverage.
const providerPath = path.resolve(__dirname, '../../vendor/osjs-server/src/providers/auth.js');
const originalLoad = Module._load;
let AuthServiceProvider;
try {
  Module._load = function(request, parent, isMain) {
    if (parent && parent.filename === providerPath && request === '@osjs/common') {
      return {ServiceProvider: class {
        constructor(core, options) {
          this.core = core;
          this.options = options;
        }
        destroy() {}
      }};
    }
    if (parent && parent.filename === providerPath && request === '../auth.js') {
      return class {
        async init() { return true; }
        register() {}
        login() {}
        logout() {}
        destroy() {}
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  AuthServiceProvider = require(providerPath);
} finally {
  Module._load = originalLoad;
}

async function getRoutes(configuration) {
  const routes = [];
  const express = {
    route(method, url) { routes.push({method, url, authenticated: false}); },
    routeAuthenticated(method, url) { routes.push({method, url, authenticated: true}); }
  };
  const provider = new AuthServiceProvider({
    configuration,
    make(name) {
      assert.equal(name, 'osjs/express');
      return express;
    }
  }, {});
  await provider.init();
  return routes;
}

for (const [name, configuration] of [
  ['default config', {development: true, auth: {}}],
  ['explicit disabled', {development: true, auth: {allowRegistration: false}}],
  ['missing auth config', {development: true}],
  ['production default', {development: false, auth: {}}],
  ['production even with opt-in', {development: false, auth: {allowRegistration: true}}],
  ['nonboolean string opt-in', {development: true, auth: {allowRegistration: 'true'}}],
  ['inherited opt-in', {development: true, auth: Object.create({allowRegistration: true})}]
]) {
  test(`register route absent for ${name}`, async () => {
    const routes = await getRoutes(configuration);
    assert.deepEqual(routes, [
      {method: 'post', url: '/login', authenticated: false},
      {method: 'post', url: '/logout', authenticated: true}
    ]);
  });
}

test('explicit opt-in enables registration only in development', async () => {
  assert.deepEqual(await getRoutes({
    development: true,
    auth: {allowRegistration: true}
  }), [
    {method: 'post', url: '/register', authenticated: false},
    {method: 'post', url: '/login', authenticated: false},
    {method: 'post', url: '/logout', authenticated: true}
  ]);
});

test('default server configuration declares registration disabled', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(
    path.resolve(__dirname, '../../vendor/osjs-server/src/config.js'), 'utf8'
  );
  assert.match(source, /allowRegistration:\s*false/);
});
