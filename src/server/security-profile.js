'use strict';

// Production gate for the legacy OS.js Node server. This gate deliberately does
// not infer secure authentication from an environment variable or an adapter name.
// A production server profile stays unavailable until the actual adapter, provider
// startup and inbound handlers have been reviewed and tested in G5.
const CAPABILITIES = Object.freeze([
  'staticAssets', 'authenticatedApi', 'sessions', 'publicRegistration',
  'settingsPersistence', 'distributionVfs', 'writableVfs', 'uploads',
  'vfsSearch', 'fileWatching', 'websocket', 'reverseProxy',
  'runtimeDiscovery', 'generators', 'musicMetadata', 'developmentTools'
]);

const ownData = (value, label) => {
  if (value === null || typeof value !== 'object' || Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype &&
       Object.getPrototypeOf(value) !== null)) {
    throw new Error(`Invalid ${label}: expected a plain object`);
  }

  const result = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || key === '__proto__' ||
        key === 'constructor' || key === 'prototype') {
      throw new Error(`Invalid ${label}: unsafe key`);
    }

    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      throw new Error(`Invalid ${label}: accessors are forbidden`);
    }
    result[key] = descriptor.value;
  }
  return result;
};

const validateCapabilities = input => {
  const values = ownData(input, 'capability contract');
  const result = Object.create(null);
  for (const key of Object.keys(values)) {
    if (!CAPABILITIES.includes(key) || typeof values[key] !== 'boolean') {
      throw new Error(`Invalid production capability: ${key}`);
    }
  }

  for (const key of CAPABILITIES) {
    result[key] = values[key] === true;
  }
  return Object.freeze(result);
};

const assertProductionStartup = (environment = process.env) => {
  // Node's process.env is a special host object, not a plain object. Read
  // only recognized fields instead of trusting its prototype or enumeration.
  const env = environment === process.env ? {
    NODE_ENV: process.env.NODE_ENV,
    OSJS_DEPLOYMENT_PROFILE: process.env.OSJS_DEPLOYMENT_PROFILE,
    OSJS_CAPABILITIES: process.env.OSJS_CAPABILITIES,
    OSJS_UNSAFE_LOCAL_DEV: process.env.OSJS_UNSAFE_LOCAL_DEV
  } : ownData(environment, 'environment');
  const production = /^prod/i.test(String(env.NODE_ENV || ''));
  const selected = env.OSJS_DEPLOYMENT_PROFILE;

  // Legacy null authentication is development-only, and it must never be
  // enabled merely by omitting NODE_ENV. Require an exact, explicit opt-in.
  // The application configuration binds this mode to 127.0.0.1 only.
  if (!production && selected === undefined) {
    if (env.NODE_ENV === 'development' &&
        env.OSJS_UNSAFE_LOCAL_DEV === 'true' &&
        env.OSJS_CAPABILITIES === undefined) {
      return {development: true};
    }
    throw new Error('OS.js development server requires NODE_ENV=development and OSJS_UNSAFE_LOCAL_DEV=true (loopback only)');
  }

  if (typeof selected !== 'string' || !['browser-only', 'server'].includes(selected)) {
    throw new Error('OS.js production requires an explicit valid OSJS_DEPLOYMENT_PROFILE');
  }

  let requested;
  try {
    requested = env.OSJS_CAPABILITIES ? JSON.parse(env.OSJS_CAPABILITIES) : {};
  } catch (_) {
    throw new Error('Invalid OSJS_CAPABILITIES JSON');
  }
  const capabilities = validateCapabilities(requested);

  if (selected === 'browser-only') {
    if (Object.values(capabilities).some(Boolean)) {
      throw new Error('Browser-only profile does not permit Node server capabilities');
    }
    throw new Error('Browser-only distribution must be served by a static host; OS.js Node server is disabled');
  }

  // Even a strong secret cannot make the current null-auth fallback safe.
  // No production server is approved until G5 wires and verifies a real
  // adapter and the startup/removal tests. Fail before constructing Core.
  throw new Error('OS.js production Node server is blocked pending G5 authentication and capability hardening');
};

module.exports = {CAPABILITIES, validateCapabilities, assertProductionStartup};
