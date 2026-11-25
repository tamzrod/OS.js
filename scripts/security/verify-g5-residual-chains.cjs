#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const [fullAuditFile, productionAuditFile, productionSbomFile, distDir] = process.argv.slice(2);
assert(distDir, 'usage: verify-g5-residual-chains.cjs <full-audit> <production-audit> <production-sbom> <dist-dir>');

const root = path.resolve(__dirname, '../..');
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const lock = read(path.join(root, 'package-lock.json'));
const fullAudit = read(fullAuditFile);
const productionAudit = read(productionAuditFile);
const sbom = read(productionSbomFile);

const vulnerabilities = audit => audit.metadata.vulnerabilities;
const production = vulnerabilities(productionAudit);
for (const severity of ['critical', 'high', 'moderate', 'low', 'total']) {
  assert.strictEqual(production[severity], 0, `production ${severity} finding remains`);
}
assert.strictEqual(vulnerabilities(fullAudit).critical, 0, 'full-tree critical finding remains');

// Server-side parsing, query, WebSocket, glob, UUID, archive and metadata chains.
// None of these may be reachable from the browser production graph.
const forbiddenChains = [
  'express', 'express-ws', 'express-session', 'express-http-proxy', 'body-parser',
  'connect-loki', 'morgan', 'nocache', 'proxy-addr', 'path-to-regexp', 'qs',
  'cookie-parser', 'busboy', 'formidable', 'multiparty', 'multer',
  'ws', 'socket.io', 'socket.io-client',
  'glob', 'glob-parent', 'minimatch', 'brace-expansion', 'braces',
  'picomatch', 'micromatch',
  'uuid', 'shortid', 'nanoid',
  'archiver', 'tar', 'tar-stream', 'unzipper', 'yauzl', 'yazl', 'adm-zip',
  'node-stream-zip', 'decompress', 'file-type', 'mime', 'mime-types',
  'chokidar', 'fs-extra', 'minimist', 'filehound', 'moment',
  'exif', 'exiftool', 'exifr',
  'deepmerge', 'js-cookie', '@osjs/server'
];
const components = [];
const walk = entries => (entries || []).forEach(component => {
  components.push(component);
  walk(component.components);
});
walk(sbom.components);
walk(sbom.metadata?.component?.components);
for (const component of components) {
  assert(!forbiddenChains.includes(component.name),
    `${component.name}@${component.version} is reachable from the production graph`);
}

// Full-tree highs are development-only. Each one needs a recorded reason and
// an expiry before G8 can carry it as an advisory exception.
const developmentExceptions = new Map([
  ['postcss', {
    reason: 'stylelint 13 and @osjs/stylelint-config pin PostCSS 7 for SCSS linting',
    expiry: '2027-02-28'
  }]
]);
for (const [name, finding] of Object.entries(fullAudit.vulnerabilities)) {
  if (finding.severity !== 'high' && finding.severity !== 'critical') continue;
  const exception = developmentExceptions.get(name);
  assert(exception, `${name} high finding has no development exception`);
  assert(new Date(exception.expiry + 'T00:00:00Z') > new Date(), `${name} exception is expired`);
  const copies = Object.entries(lock.packages)
    .filter(([location, metadata]) => (metadata.name || location.replace(/^.*node_modules\//, '')) === name);
  assert(copies.length > 0, `${name} is not present in the lock`);
  for (const [location, metadata] of copies) {
    assert.strictEqual(metadata.dev, true, `${name} at ${location} is not development-only`);
  }
}

const markers = [
  '@osjs/server', 'body-parser', 'connect-loki', 'express-http-proxy',
  'express-session', 'express-ws', 'filehound', 'formidable', 'multiparty',
  'path-to-regexp', 'proxy-addr', 'sanitize-filename', 'chokidar'
];
const files = [];
const collect = directory => fs.readdirSync(directory, {withFileTypes: true}).forEach(entry => {
  if (entry.isSymbolicLink()) return;
  const target = path.join(directory, entry.name);
  if (entry.isDirectory()) collect(target);
  else files.push(target);
});
collect(distDir);
for (const filename of files) {
  const content = fs.readFileSync(filename);
  for (const marker of markers) {
    assert(!content.includes(marker), `${marker} marker remains in ${path.relative(root, filename)}`);
  }
}

console.log(JSON.stringify({
  production,
  full: vulnerabilities(fullAudit),
  productionComponents: components.length,
  developmentExceptions: [...developmentExceptions.keys()],
  scannedFiles: files.length,
  result: 'Production graph contains no server parsing, WebSocket, glob, UUID, archive or metadata chain.'
}, null, 2));
