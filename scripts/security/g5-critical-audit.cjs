'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const output = path.resolve('g5-audit-evidence');
fs.mkdirSync(output, {recursive: true});

function invoke(command, args, name) {
  const p = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: 10 * 60 * 1000,
    maxBuffer: 20 * 1024 * 1024,
    env: {...process.env, npm_config_audit: 'true'}
  });
  fs.writeFileSync(path.join(output, name + '.json'), p.stdout || '');
  fs.writeFileSync(path.join(output, name + '.stderr.txt'), p.stderr || '');
  return p;
}

const audit = invoke('npm', ['audit', '--omit=dev', '--json'], 'production-audit');
if (audit.error) throw audit.error;
let parsed;
try {
  parsed = JSON.parse(audit.stdout);
} catch (_) {
  throw Error('npm audit JSON unavailable; inspect retained stderr');
}
if (!parsed.metadata || !parsed.vulnerabilities) {
  throw Error('npm audit output missing vulnerability metadata');
}

const vulnerabilities = parsed.vulnerabilities;
const critical = Object.entries(vulnerabilities).filter(([, v]) => v.severity === 'critical');
const findings = critical.map(([name, v]) => ({
  package: name,
  severity: v.severity,
  isDirect: v.isDirect,
  range: v.range,
  via: v.via,
  effects: v.effects,
  fixAvailable: v.fixAvailable
}));
const summary = {
  head: process.env.GITHUB_SHA || 'local',
  node: process.version,
  npm: spawnSync('npm', ['--version'], {encoding: 'utf8'}).stdout.trim(),
  vulnerabilities: parsed.metadata.vulnerabilities,
  critical: findings
};

for (const finding of findings) {
  const key = finding.package.replace(/[^a-z0-9_-]/gi, '_');
  const explain = invoke('npm', ['explain', '--json', finding.package], 'explain-' + key);
  console.log('Critical ' + finding.package + ' npm explain exit=' + explain.status);
  console.log(explain.stdout.slice(0, 10000));
}
fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2));
console.log('FRESH PRODUCTION AUDIT SUMMARY');
console.log(JSON.stringify(summary, null, 2).slice(0, 24000));
// Exit successfully when the diagnostic completed: security acceptance is
// determined from the recorded counts, not the npm audit advisory exit code.
