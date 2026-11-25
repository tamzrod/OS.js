'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const common = require(path.join(root, 'vendor/osjs-common'));
const {safeMerge, safeSetPath, assertSafeObject, UnsafeObjectInputError} = common;
const replace = {array: 'replace'};

const nested = depth => {
  let value = {leaf: true};
  for (let index = 0; index < depth; index++) value = {child: value};
  return value;
};

test('nesting beyond the depth limit is rejected before it can exhaust the stack', () => {
  assert.equal(safeMerge({}, nested(63), replace).child !== undefined, true);
  const startedAt = process.hrtime.bigint();
  assert.throws(() => safeMerge({}, nested(100000), replace), UnsafeObjectInputError);
  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
  assert(elapsedMs < 1000, `deep input took ${elapsedMs}ms`);
});

test('malformed stored JSON fails fast without poisoning globals', () => {
  const startedAt = process.hrtime.bigint();
  assert.throws(() => JSON.parse('{"settings":'.repeat(100000)), SyntaxError);
  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
  assert(elapsedMs < 1000, `malformed JSON took ${elapsedMs}ms`);

  const parsed = JSON.parse('{"__proto__":{"polluted":true}}');
  assert.throws(() => assertSafeObject(parsed, replace), UnsafeObjectInputError);
  assert.equal({}.polluted, undefined);
});

test('oversized flat inputs complete in bounded time', () => {
  const wide = {};
  for (let index = 0; index < 50000; index++) wide[`key${index}`] = index;
  const startedAt = process.hrtime.bigint();
  const merged = safeMerge({}, wide, replace);
  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
  assert.equal(Object.keys(merged).length, 50000);
  assert(elapsedMs < 3000, `wide object took ${elapsedMs}ms`);

  const list = new Array(100000).fill(1);
  const listMerged = safeMerge([], list, replace);
  assert.equal(listMerged.length, 100000);

  const large = 'x'.repeat(8 * 1024 * 1024);
  assert.equal(safeMerge({value: ''}, {value: large}, replace).value.length, large.length);
});

test('oversized dotted paths fail closed', () => {
  const segments = new Array(10000).fill('segment');
  const startedAt = process.hrtime.bigint();
  assert.throws(() => safeSetPath({}, segments, 1, replace), UnsafeObjectInputError);
  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
  assert(elapsedMs < 3000, `dotted path took ${elapsedMs}ms`);
});
