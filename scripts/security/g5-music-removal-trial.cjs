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
const report = {schema: 'g5-music-removal-trial/v1', sourceHead: '', steps: {}, before: {}, after: {}};
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
  musicPlayer: packagePresent(lock, '@osjs/musicplayer-application'),
  musicMetadata: packagePresent(lock, 'music-metadata'),
  rootMusicPlayer: Boolean(lock.packages && lock.packages[''] &&
    lock.packages[''].dependencies &&
    lock.packages[''].dependencies['@osjs/musicplayer-application'])
});

try {
  fs.mkdirSync(output, {recursive: true});
  const sourceHead = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
  report.sourceHead = sourceHead;
  if (fs.existsSync(workspace)) throw new Error('Refusing to reuse existing candidate worktree');
  fs.mkdirSync(workspace);
  // Exclude CI output and tracked/untracked working-directory state.
  const archive = spawnSync('bash', ['-c',
    'git archive HEAD | tar -x -C "$1"', '_', workspace], {cwd: root, encoding: 'utf8'});
  if (archive.status !== 0) throw Error('Cannot populate isolated candidate: ' + archive.stderr);

  const manifestPath = path.join(workspace, 'package.json');
  const lockPath = path.join(workspace, 'package-lock.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath));
  const initialLock = JSON.parse(fs.readFileSync(lockPath));
  report.before = lockOverview(initialLock);
  if (!manifest.dependencies ||
      !Object.prototype.hasOwnProperty.call(manifest.dependencies, '@osjs/musicplayer-application')) {
    throw Error('Expected direct music player dependency is missing: stop rather than guess');
  }
  delete manifest.dependencies['@osjs/musicplayer-application'];
  // The baseline root stylelint task extends the standard preset but its
  // manifest omits that preset. Pin the compatible Stylelint 13-era version,
  // keeping this test-only repair out of production dependencies.
  if (manifest.devDependencies['stylelint-config-standard']) {
    throw Error('Expected missing stylelint-config-standard dev dependency');
  }
  manifest.devDependencies['stylelint-config-standard'] = '20.0.0';
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  run('regenerate-lock', 'npm', ['install', '--package-lock-only', '--ignore-scripts',
    '--no-audit', '--no-fund'], workspace);
  const generatedLock = JSON.parse(fs.readFileSync(lockPath));
  report.after = lockOverview(generatedLock);
  if (report.after.rootMusicPlayer || report.after.musicPlayer ||
      report.after.musicMetadata) {
    throw Error('Music player / metadata dependency remains in candidate lock graph');
  }

  run('clean-install', 'npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], workspace);
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
      report.steps['browser-build'].exitCode !== 0) {
    throw Error('Candidate compatibility check failed; inspect logs');
  }
  report.candidateReadyForReview = true;
} catch (error) {
  report.error = error.message;
  process.exitCode = 1;
} finally {
  fs.mkdirSync(output, {recursive: true});
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(report, null, 2) + '\n');
}
