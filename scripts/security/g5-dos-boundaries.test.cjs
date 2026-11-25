'use strict';

const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const bundle = path.join(root, 'vendor/osjs-common');

const probe = `
const common = require(${JSON.stringify(bundle)});
const {safeMerge} = common;
const replace = {array: 'replace'};
const nested = depth => {
  let value = {leaf: true};
  for (let index = 0; index < depth; index++) value = {child: value};
  return value;
};
let deepRejected = false;
try { safeMerge({}, nested(200000), replace); } catch (error) { deepRejected = error.name === 'UnsafeObjectInputError'; }
const wide = {};
for (let index = 0; index < 50000; index++) wide['key' + index] = index;
const merged = safeMerge({}, wide, replace);
const large = 'x'.repeat(8 * 1024 * 1024);
const result = safeMerge({value: ''}, {value: large}, replace);
let malformed = false;
try { JSON.parse('{"settings":'.repeat(100000)); } catch (error) { malformed = error instanceof SyntaxError; }
process.stdout.write(JSON.stringify({
  deepRejected,
  wide: Object.keys(merged).length,
  large: result.value.length,
  malformed,
  handles: process.getActiveResourcesInfo().filter(name => /Server|Socket/.test(name))
}));
`;

test('hostile inputs fail safely under a constrained heap', () => {
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, ['--max-old-space-size=64', '-e', probe], {
    cwd: root, encoding: 'utf8', timeout: 30000
  });
  const elapsedMs = Date.now() - startedAt;
  assert.equal(result.status, 0, result.stderr);
  assert(!/heap out of memory|Allocation failed/i.test(result.stderr), result.stderr);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output, {
    deepRejected: true,
    wide: 50000,
    large: 8 * 1024 * 1024,
    malformed: true,
    handles: []
  });
  assert(elapsedMs < 15000, `hostile inputs took ${elapsedMs}ms`);
});
