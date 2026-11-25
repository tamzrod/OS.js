'use strict';

const assert = require('node:assert/strict');
const {spawn, spawnSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const script = path.join(__dirname, 'verify-client-import.js');

const makeRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'osjs-import-'));
  const vendor = path.join(root, 'vendor', 'osjs-client');
  fs.mkdirSync(vendor, {recursive: true});
  fs.writeFileSync(path.join(vendor, 'client.js'), 'module.exports = 1;\n');
  return {root, vendor, manifest: path.join(vendor, 'IMPORT_MANIFEST.json')};
};

const run = (root, extraEnv = {}) => spawnSync(process.execPath, [script, '--write'], {
  encoding: 'utf8',
  env: {...process.env, OSJS_IMPORT_ROOT: root, ...extraEnv}
});

test('--write creates a mode-0600 manifest with the client inventory', () => {
  const {root, manifest} = makeRoot();
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.statSync(manifest).mode & 0o777, 0o600);
  const parsed = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  assert.deepEqual(parsed.files.map(file => file.path), ['client.js']);
});

test('--write refuses an existing manifest and preserves its bytes', () => {
  const {root, manifest} = makeRoot();
  const sentinel = '{"sentinel":true}\n';
  fs.writeFileSync(manifest, sentinel);
  const result = run(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing to overwrite existing import manifest/);
  assert.equal(fs.readFileSync(manifest, 'utf8'), sentinel);
});

test('--write refuses a symlink without touching its target', () => {
  const {root, manifest} = makeRoot();
  const target = path.join(root, 'target.json');
  const sentinel = '{"target":true}\n';
  fs.writeFileSync(target, sentinel);
  fs.symlinkSync(target, manifest);
  const result = run(root);
  assert.notEqual(result.status, 0);
  assert.equal(fs.readFileSync(target, 'utf8'), sentinel);
  assert.equal(fs.lstatSync(manifest).isSymbolicLink(), true);
});

test('a file created after a check cannot be overwritten by --write', () => {
  const {root, manifest} = makeRoot();
  const sentinel = '{"raced":true}\n';
  fs.writeFileSync(manifest, sentinel);
  const preload = path.join(root, 'preload.cjs');
  fs.writeFileSync(preload, [
    "'use strict';",
    "const fs = require('node:fs');",
    'const original = fs.existsSync;',
    'const target = process.env.OSJS_RACE_TARGET;',
    'fs.existsSync = candidate => String(candidate) === target ? false : original(candidate);'
  ].join('\n'));
  const result = run(root, {
    OSJS_RACE_TARGET: manifest,
    NODE_OPTIONS: `--require=${preload}`
  });
  assert.notEqual(result.status, 0, 'a raced writer must not succeed');
  assert.equal(fs.readFileSync(manifest, 'utf8'), sentinel);
});

test('concurrent writers create exactly one valid manifest', async () => {
  const {root, manifest} = makeRoot();
  const outcomes = await Promise.all(Array.from({length: 8}, () => new Promise(resolve => {
    const child = spawn(process.execPath, [script, '--write'], {
      env: {...process.env, OSJS_IMPORT_ROOT: root},
      stdio: ['ignore', 'ignore', 'pipe']
    });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('close', status => resolve({status, stderr}));
  })));
  assert.equal(outcomes.filter(outcome => outcome.status === 0).length, 1);
  const parsed = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  assert.deepEqual(parsed.files.map(file => file.path), ['client.js']);
});
