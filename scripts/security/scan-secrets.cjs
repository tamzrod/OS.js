#!/usr/bin/env node
'use strict';

const {spawnSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const tracked = spawnSync('git', ['ls-files', '-z'], {cwd: root, encoding: 'utf8'});
if (tracked.status !== 0) throw new Error(tracked.stderr);
const binary = /\.(?:png|jpe?g|gif|ico|woff2?|ttf|eot|mp3|wav|ogg|zip|gz|pdf)$/i;
const patterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ['GitHub fine-grained token', /\bgithub_pat_[A-Za-z0-9_]{40,}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['npm token', /\bnpm_[A-Za-z0-9]{36}\b/]
];
const allow = new Set(['scripts/security/scan-secrets.cjs']);
const findings = [];
for (const filename of tracked.stdout.split('\0').filter(Boolean)) {
  if (binary.test(filename) || allow.has(filename)) continue;
  const content = fs.readFileSync(path.join(root, filename), 'utf8');
  for (const [name, pattern] of patterns) {
    if (pattern.test(content)) findings.push({file: filename, pattern: name});
  }
}
if (findings.length > 0) {
  console.error(JSON.stringify({findings, result: 'secret-like content found'}, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({scanned: tracked.stdout.split('\0').filter(Boolean).length, result: 'no secret-like content'}, null, 2));
