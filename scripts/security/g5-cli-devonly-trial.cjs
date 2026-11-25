'use strict';

// Runs only in an isolated checkout/CI worktree. Never writes the source repo.
// This prepares an actual npm-generated lockfile candidate instead of guessing
// which transitive nodes can be removed.
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync, spawnSync} = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const output = path.resolve(process.env.G5_EVIDENCE_DIR || path.join(root, 'g5-trial-evidence'));
const workspace = path.join(output, 'candidate-worktree');
const report = {schema: 'g5-cli-devonly-trial/v1', sourceHead: '', steps: {}, before: {}, after: {}};
const run = (name, command, args, cwd, allowedFailure = false) => {
  const result = spawnSync(command, args, {
    cwd, encoding: 'utf8', timeout: 20 * 60 * 1000,
    env: {...process.env, CI: 'true', npm_config_audit: 'false'}
  });
  const details = {
    exitCode: result.status,
    signal: result.signal,
    error: result.error && result.error.message
  };
  report.steps[name] = details;
  fs.writeFileSync(path.join(output, name + '.log'),
    (result.stdout || '') + '\n--- stderr ---\n' + (result.stderr || ''));
  if (result.status !== 0 && !allowedFailure) {
    throw new Error(name + ' failed; see retained log');
  }
  return result;
};
const packagePresent = (lock, name) =>
  Boolean(lock.packages && lock.packages['node_modules/' + name]);
const lockOverview = lock => ({
  entries: Object.keys(lock.packages || {}).length,
  cliInstalled: packagePresent(lock, '@osjs/cli'),
  cliDevOnly: Boolean(lock.packages && lock.packages['node_modules/@osjs/cli'] &&
    lock.packages['node_modules/@osjs/cli'].dev === true),
  cliProductionRoot: Boolean(lock.packages && lock.packages[''] &&
    lock.packages[''].dependencies &&
    lock.packages[''].dependencies['@osjs/cli']),
  cliDevelopmentRoot: Boolean(lock.packages && lock.packages[''] &&
    lock.packages[''].devDependencies &&
    lock.packages[''].devDependencies['@osjs/cli'])
});

try {
  fs.mkdirSync(output, {recursive: true});
  const sourceHead = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
  report.sourceHead = sourceHead;
  if (fs.existsSync(workspace)) throw new Error('Refusing to reuse existing candidate worktree');
  fs.mkdirSync(workspace);
  // Exclude CI output and tracked/untracked working-directory state.
  const archive = execFileSync('git', ['archive', 'HEAD'], {cwd: root, maxBuffer: 256 * 1024 * 1024});
  const extract = spawnSync('tar', ['-x', '-C', workspace], {input: archive});
  if (extract.status !== 0) throw Error('Cannot populate isolated candidate: ' + extract.stderr);

  const manifestPath = path.join(workspace, 'package.json');
  const lockPath = path.join(workspace, 'package-lock.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath));
  const initialLock = JSON.parse(fs.readFileSync(lockPath));
  report.before = lockOverview(initialLock);
  if (!manifest.dependencies ||
      !Object.prototype.hasOwnProperty.call(manifest.dependencies, '@osjs/cli') ||
      Object.prototype.hasOwnProperty.call(manifest.devDependencies, '@osjs/cli')) {
    throw Error('Expected production-only CLI root is missing or already migrated');
  }
  manifest.devDependencies['@osjs/cli'] = manifest.dependencies['@osjs/cli'];
  delete manifest.dependencies['@osjs/cli'];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  run('regenerate-lock', 'npm', ['install', '--package-lock-only', '--ignore-scripts',
    '--no-audit', '--no-fund'], workspace);
  const generatedLock = JSON.parse(fs.readFileSync(lockPath));
  report.after = lockOverview(generatedLock);
  if (report.after.cliProductionRoot || !report.after.cliDevelopmentRoot ||
      !report.after.cliInstalled || !report.after.cliDevOnly) {
    throw Error('CLI remains in the production dependency graph');
  }

  run('clean-install', 'npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], workspace);
  run('cli-discover', 'npm', ['run', 'build:manifest'], workspace, true);
  // npm ls can fail for pre-existing, unrelated peer inconsistencies
  // (currently hyperapp ELSPROBLEMS). Keep its diagnostic evidence without
  // equating the exit code to CLI graph reachability; the generated lock
  // contract below verifies CLI devOnly status directly.
  run('production-tree', 'npm', ['ls', '--omit=dev', '--all', '--json'], workspace, true);
  run('root-test', 'npm', ['test'], workspace, true);
  run('browser-build', 'npm', ['run', 'build'], workspace, true);
  // npm audit nonzero is expected until G5 has addressed the full graph.
  const audit = run('production-audit', 'npm',
    ['audit', '--omit=dev', '--json'], workspace, true);
  try {
    const result = JSON.parse(audit.stdout || '{}');
    report.audit = result.metadata && result.metadata.vulnerabilities || null;
  } catch (_) {
    report.audit = {parseError: true};
  }
  fs.copyFileSync(manifestPath, path.join(output, 'candidate-package.json'));
  fs.copyFileSync(lockPath, path.join(output, 'candidate-package-lock.json'));
  // A failed test/build/audit is retained as evidence, not disguised as success.
  if (report.steps['root-test'].exitCode !== 0 ||
      report.steps['browser-build'].exitCode !== 0 ||
      report.steps['cli-discover'].exitCode !== 0) {
    throw Error('CLI development-only candidate compatibility check failed; inspect logs');
  }
  report.candidateReadyForReview = true;
} catch (error) {
  report.error = error.message;
  process.exitCode = 1;
} finally {
  fs.mkdirSync(output, {recursive: true});
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(report, null, 2) + '\n');
}
