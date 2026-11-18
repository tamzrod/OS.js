#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const forbiddenFlag = ['--openssl', 'legacy-provider'].join('-');
const operationalRoots = ['package.json', 'webpack.config.js', 'scripts', '.github'];
const collect = (target, output, skipDependencies = false) => {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) {
      if (entry === '.git' || (skipDependencies && entry === 'node_modules')) continue;
      collect(path.join(target, entry), output, skipDependencies);
    }
  } else {
    output.push(target);
  }
};
const files = [];
operationalRoots.forEach(target => collect(path.join(root, target), files, true));

const exactOccurrences = [];
const environmentOverrides = [];
for (const filename of files) {
  const content = fs.readFileSync(filename, 'utf8');
  const relative = path.relative(root, filename);
  if (content.includes(forbiddenFlag)) exactOccurrences.push(relative);
  if (/NODE_OPTIONS\s*[:=]\s*[^\n]*legacy/i.test(content)) environmentOverrides.push(relative);
}
if (exactOccurrences.length) throw new Error(`legacy provider flag in operational files: ${exactOccurrences.join(', ')}`);
if (environmentOverrides.length) throw new Error(`legacy provider environment override: ${environmentOverrides.join(', ')}`);

const repositoryText = [];
const repositoryFiles = [];
collect(root, repositoryFiles, true);
for (const filename of repositoryFiles) {
  try {
    if (fs.readFileSync(filename, 'utf8').includes(forbiddenFlag)) repositoryText.push(path.relative(root, filename));
  } catch {}
}
if (repositoryText.length) throw new Error(`legacy provider flag text remains: ${repositoryText.join(', ')}`);

const contract = JSON.parse(fs.readFileSync(path.join(root, 'docs/evidence/security-build/t4.4-root-webpack5-contract.json'), 'utf8'));
if (contract.html.missingReferences.length) throw new Error('retained HTML has missing references');
if (contract.summary.sourceMaps !== 4) throw new Error('explicit four-map source-map policy changed');
for (const required of ['favicon.png', 'osjs.css', 'osjs.js', 'vendors~osjs.css', 'vendors~osjs.js']) {
  if (!contract.html.references.includes(required)) throw new Error(`HTML reference missing: ${required}`);
}

console.log('G4 browser/build policy verification passed: static references and four-map policy retained; no legacy provider flag or operational override exists.');
