#!/usr/bin/env node

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const client = path.join(root, 'vendor/osjs-client');
const pkg = JSON.parse(fs.readFileSync(path.join(client, 'package.json')));
const source = fs.readFileSync(path.join(client, 'index.js'), 'utf8');
const declarations = fs.readFileSync(path.join(client, 'index.d.ts'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

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

console.log(`Client baseline verified: ${pkg.name}@${pkg.version}, ${actualExports.length} exports, declarations and 2 assets`);
