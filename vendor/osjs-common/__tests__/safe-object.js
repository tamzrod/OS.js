/* eslint-env jest */

import {
  UnsafeObjectInputError,
  assertSafeObject,
  safeMerge,
  safeSetPath
} from '../src/safe-object.js';

const replace = {array: 'replace'};

test('merges ordinary nested data without mutating inputs', () => {
  const base = {nested: {left: 1}, items: [1]};
  const override = {nested: {right: 2}, items: [2]};
  expect(safeMerge(base, override, replace)).toEqual({
    nested: {left: 1, right: 2}, items: [2]
  });
  expect(base).toEqual({nested: {left: 1}, items: [1]});
});

test('supports explicit array concatenation', () => {
  expect(safeMerge({items: [1]}, {items: [2]}, {array: 'concat'})).toEqual({items: [1, 2]});
});

test.each(['__proto__', 'prototype', 'constructor'])('rejects reserved key %s recursively', key => {
  const input = JSON.parse(`{"nested":{"${key}":{}}}`);
  expect(() => safeMerge({}, input, replace)).toThrow(UnsafeObjectInputError);
});

test('rejects accessors without invoking them', () => {
  let invoked = 0;
  const input = {};
  Object.defineProperty(input, 'value', {enumerable: true, get: () => ++invoked});
  expect(() => assertSafeObject(input, replace)).toThrow(/accessor property/);
  expect(invoked).toBe(0);
});

test('rejects inherited data and unsupported instances', () => {
  expect(() => assertSafeObject(Object.create({admin: true}), replace)).toThrow(/prototype/);
  expect(() => assertSafeObject({when: new Date(0)}, replace)).toThrow(/prototype/);
});

test('rejects symbols, cycles, and excessive depth', () => {
  expect(() => assertSafeObject({[Symbol('x')]: true}, replace)).toThrow(/symbol/);
  const cycle = {};
  cycle.self = cycle;
  expect(() => assertSafeObject(cycle, replace)).toThrow(/cyclic/);
  expect(() => assertSafeObject({a: {b: true}}, {...replace, maxDepth: 1})).toThrow(/depth/);
});

test('requires an explicit array policy', () => {
  expect(() => safeMerge({}, {}, {})).toThrow(/explicit replace or concat/);
});

test('allows functions only under explicit policy', () => {
  const fn = () => true;
  expect(() => assertSafeObject({fn}, replace)).toThrow(/unsupported function/);
  expect(safeMerge({}, {fn}, {...replace, allowFunctions: true}).fn).toBe(fn);
});

test('sets safe dotted paths and rejects reserved segments', () => {
  expect(safeSetPath({desktop: {theme: 'a'}}, 'desktop.theme', 'b', replace))
    .toEqual({desktop: {theme: 'b'}});
  expect(() => safeSetPath({}, 'desktop.__proto__.admin', true, replace))
    .toThrow(UnsafeObjectInputError);
});

test('does not invoke an ambient prototype setter', () => {
  let invoked = 0;
  Object.defineProperty(Object.prototype, 'safeObjectSentinel', {
    configurable: true,
    set: () => {
      invoked++;
    }
  });
  try {
    const result = safeMerge({}, {safeObjectSentinel: true}, replace);
    expect(result.safeObjectSentinel).toBe(true);
    expect(invoked).toBe(0);
  } finally {
    delete Object.prototype.safeObjectSentinel;
  }
});
