'use strict';

const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');

const expectedNode = 'v26.13.0';
const expectedNpm = '11.20.0';
const actualNode = process.version;
const actualNpm = execFileSync('npm', ['--version'], {
  encoding: 'utf8',
  shell: process.platform === 'win32'
}).trim();

assert.equal(actualNode, expectedNode, 'Unexpected Node.js version');
assert.equal(actualNpm, expectedNpm, 'Unexpected npm version');
process.stdout.write(`Verified Node ${actualNode}, npm ${actualNpm}\n`);
