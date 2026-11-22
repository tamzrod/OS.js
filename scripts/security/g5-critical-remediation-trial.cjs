'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const out = path.resolve(process.env.G5_EVIDENCE_DIR || path.join(root, 'g5-critical-remediation-evidence'));
const candidate = path.join(out, 'isolated-checkout');
const report = {
  schema: 'g5-critical-remediation/v1',
  sourceCommit: '',
  steps: {},
  before: {},
  after: {},
  acceptable: false
};

const run = (name, cmd, args, cwd, allowedFailure = false) => {
  const r = cp.spawnSync(cmd, args, {
    cwd, encoding: 'utf8', maxBuffer: 25 * 1024 * 1024,
    timeout: 15 * 60 * 1000, env: {...process.env, CI: 'true'}
  });
  report.steps[name] = {exitCode: r.status, error: r.error && r.error.message};
  fs.writeFileSync(path.join(out, name + '.stdout.txt'), r.stdout || '');
  fs.writeFileSync(path.join(out, name + '.stderr.txt'), r.stderr || '');
  if (r.status !== 0 && !allowedFailure) throw Error(name + ' failed; inspect retained logs');
  return r;
};

const inspect = lock => ({
  rootMinimist: lock.packages && lock.packages['node_modules/minimist'] &&
    lock.packages['node_modules/minimist'].version,
  rootProxyAddr: lock.packages && lock.packages['node_modules/proxy-addr'] &&
    lock.packages['node_modules/proxy-addr'].version,
  entries: Object.keys(lock.packages || {}).length
});

try {
  fs.mkdirSync(out, {recursive: true});
  if (fs.existsSync(candidate)) throw Error('Refusing existing candidate checkout');
  fs.mkdirSync(candidate);
  report.sourceCommit = cp.execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
  const exportResult = cp.spawnSync('bash', ['-c', 'git archive HEAD | tar -xf - -C "$1"', '_', candidate], {
    cwd: root, encoding: 'utf8'
  });
  if (exportResult.status !== 0) throw Error('Could not create pristine candidate: ' + exportResult.stderr);

  const beforePackage = fs.readFileSync(path.join(candidate, 'package.json'));
  const beforeLock = JSON.parse(fs.readFileSync(path.join(candidate, 'package-lock.json')));
  report.before = inspect(beforeLock);

  // Both patched releases remain compatible with the existing package ranges.
  // Let npm regenerate the lockfile; do not manually edit transitive integrity hashes.
  run('lock-update', 'npm', ['update', 'minimist', 'proxy-addr', '--package-lock-only',
    '--ignore-scripts', '--no-audit', '--no-fund'], candidate);

  const afterPackage = fs.readFileSync(path.join(candidate, 'package.json'));
  if (!beforePackage.equals(afterPackage)) throw Error('Unexpected manifest edit');
  const updatedLock = JSON.parse(fs.readFileSync(path.join(candidate, 'package-lock.json')));
  report.after = inspect(updatedLock);

  if (!report.after.rootMinimist || !report.after.rootProxyAddr ||
      report.after.rootMinimist === report.before.rootMinimist ||
      report.after.rootProxyAddr === report.before.rootProxyAddr) {
    throw Error('Both targeted transitive packages must update');
  }

  run('clean-install', 'npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], candidate);
  run('root-test', 'npm', ['test'], candidate);
  run('package-discovery', 'npm', ['run', 'package:discover'], candidate);
  run('browser-build', 'npm', ['run', 'build'], candidate);

  const r = run('production-audit', 'npm', ['audit', '--omit=dev', '--json'], candidate, true);
  const parsed = JSON.parse(r.stdout);
  if (!parsed.metadata || !parsed.metadata.vulnerabilities || !parsed.vulnerabilities) {
    throw Error('Production audit report missing required metadata');
  }
  report.audit = parsed.metadata.vulnerabilities;
  report.criticalPackages = Object.entries(parsed.vulnerabilities)
    .filter(([, value]) => value.severity === 'critical').map(([name]) => name);
  if (report.audit.critical !== 0 || report.criticalPackages.length !== 0) {
    throw Error('Critical production advisories still present');
  }

  fs.copyFileSync(path.join(candidate, 'package-lock.json'), path.join(out, 'candidate-package-lock.json'));
  report.acceptable = true;
} catch (e) {
  report.error = e.message;
  process.exitCode = 1;
} finally {
  fs.mkdirSync(out, {recursive: true});
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(report, null, 2));
  console.log('G5 CRITICAL REMEDIATION TRIAL SUMMARY');
  console.log(JSON.stringify(report, null, 2));
}
