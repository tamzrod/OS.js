#!/usr/bin/env node

const assert = require('assert');
const crypto = require('crypto');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const client = path.join(root, 'vendor/osjs-client');
const pkg = JSON.parse(fs.readFileSync(path.join(client, 'package.json')));
const source = fs.readFileSync(path.join(client, 'index.js'), 'utf8');
const declarations = fs.readFileSync(path.join(client, 'index.d.ts'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const evidenceLock = path.join(root, 'docs/evidence/security-cookie/t2.2-client-package-lock.json');

const expectedExports = [
  'Application', 'Auth', 'AuthServiceProvider', 'BasicApplication', 'Clipboard',
  'Core', 'CoreServiceProvider', 'Desktop', 'DesktopServiceProvider', 'Filesystem',
  'Login', 'Middleware', 'Notification', 'NotificationServiceProvider',
  'Notifications', 'Packages', 'Search', 'Settings', 'SettingsServiceProvider',
  'Splash', 'Tray', 'VFSServiceProvider', 'Websocket', 'Window', 'WindowBehavior',
  'configuration', 'icon', 'logger'
].sort();

const actualExports = [...source.matchAll(/export\s+\{([^}]+)\}\s+from/g)]
  .flatMap(match => match[1].split(','))
  .map(value => {
    const parts = value.trim().split(/\s+as\s+/);
    return parts.length === 2 ? parts[1] : parts[0];
  })
  .sort();

assert.strictEqual(pkg.name, '@osjs/client');
assert.strictEqual(pkg.version, '3.7.1');
assert.strictEqual(pkg.main, 'dist/main.js');
assert.strictEqual(pkg.style, 'dist/main.css');
assert.strictEqual(pkg.typings, 'index.d.ts');
assert.deepStrictEqual(actualExports, expectedExports);
assert.strictEqual(
  hash(declarations),
  'ac35fb21572ebf04baeb49933145d4ea1ab24df2f24a795fb83967d168283ee0',
  'index.d.ts no longer matches the published 3.7.1 declaration surface'
);

const assets = {
  'src/styles/logo-blue-32x32.png': '709719c1d3aad1d8d36bf3cdf47ce5c37f2c5a615a435a59c9c5f53e7afeb03d',
  'src/styles/wallpaper.png': '195a76837c40b0965f156ecd2dd749e321ad0c4c0cd5a90dea94b10c0ee056c5'
};

for (const [filename, expected] of Object.entries(assets)) {
  assert.strictEqual(hash(fs.readFileSync(path.join(client, filename))), expected, `${filename} drifted`);
}

assert.strictEqual(
  hash(fs.readFileSync(evidenceLock)),
  'c680750d6a4faaa8815c42f4c2c1130f45744a4b5a1423eca86ce7b90b7e56be',
  'retained client resolution lock drifted'
);

const builtFlag = process.argv.indexOf('--built-dir');
if (builtFlag !== -1) {
  const builtDir = path.resolve(process.argv[builtFlag + 1] || '');
  assert.ok(fs.statSync(builtDir).isDirectory(), '--built-dir must identify the replayed client directory');

  const expectedOutputs = {
    'dist/881c86876af63b732063d7bdd51bb226.png': '709719c1d3aad1d8d36bf3cdf47ce5c37f2c5a615a435a59c9c5f53e7afeb03d',
    'dist/f4cfc6708cf6bfc17d4b1e775f594ae2.png': '195a76837c40b0965f156ecd2dd749e321ad0c4c0cd5a90dea94b10c0ee056c5',
    'dist/main.css': 'cdf2bb175feb1156b6e83ce9fb69f7a84802fa3dd8b06d31cc356d0f9d10f1b4',
    'dist/main.css.map': '7742895060f90bef66ee621213384b8b48d784dc48bb8eb4cb646cdab6b2488f',
    'dist/main.js': '7c5163166328f4acd13136493506061f02006cc615a992381dba7988549e63e7',
    'dist/main.js.map': '2cf131e8f4760c640f518d423da9573671c131c11bf98335df6166a41d10e515'
  };
  for (const [filename, expected] of Object.entries(expectedOutputs)) {
    assert.strictEqual(hash(fs.readFileSync(path.join(builtDir, filename))), expected, `${filename} replay drifted`);
  }

  const packed = childProcess.spawnSync('npm', ['pack', '--dry-run', '--json'], {cwd: builtDir, encoding: 'utf8'});
  assert.strictEqual(packed.status, 0, packed.stderr || 'npm pack dry-run failed');
  const actualPaths = JSON.parse(packed.stdout)[0].files.map(file => file.path).sort();
  const expectedPaths = [
    'CHANGELOG.md', 'LICENSE', 'README.md',
    'dist/881c86876af63b732063d7bdd51bb226.png',
    'dist/f4cfc6708cf6bfc17d4b1e775f594ae2.png',
    'dist/main.css', 'dist/main.css.map', 'dist/main.js', 'dist/main.js.map',
    'index.d.ts', 'package.json'
  ].sort();
  assert.deepStrictEqual(actualPaths, expectedPaths, 'dry-run package inventory drifted');
  console.log(`Replayed outputs verified: ${Object.keys(expectedOutputs).length} hashes and ${actualPaths.length} package paths`);
}

console.log(`Client baseline verified: ${pkg.name}@${pkg.version}, ${actualExports.length} exports, declarations, 2 assets, and retained lock`);
