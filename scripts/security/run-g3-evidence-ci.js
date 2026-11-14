#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');

const [outputRoot, toolDir] = process.argv.slice(2);
if (!toolDir) {
  console.error('Usage: run-g3-evidence-ci.js <output-root> <sbom-tool-dir>');
  process.exit(2);
}

const sourceDir = process.cwd();
const runtimeDir = path.dirname(path.dirname(process.execPath));
const runtimeBin = path.dirname(process.execPath);
const npmPath = spawnSync('which', ['npm'], {encoding: 'utf8'}).stdout.trim();
const npmCli = fs.realpathSync(npmPath);
const git = args => spawnSync('git', args, {cwd: sourceDir, encoding: 'utf8'}).stdout.trim();
const commit = git(['rev-parse', 'HEAD']);
if (git(['status', '--porcelain=v1', '--untracked-files=all'])) throw new Error('evidence requires a clean checkout');

const sha256 = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const lockHash = sha256(path.join(sourceDir, 'package-lock.json'));
const evidenceId = `${timestamp}_${commit.slice(0, 12)}_${lockHash.slice(0, 12)}`;
const env = {...process.env, PATH: `${runtimeBin}:${process.env.PATH}`, CI: 'true'};
const artifacts = [];
const commands = [];
fs.mkdirSync(outputRoot, {recursive: true});

function retain(id, kind, scope, suffix, mediaType, content) {
  const filename = `${evidenceId}_${suffix}`;
  const target = path.join(outputRoot, filename);
  fs.writeFileSync(target, content);
  artifacts.push({id, kind, scope, filename, mediaType, bytes: fs.statSync(target).size,
    sha256: sha256(target), retention: 'ci', location: `ci-artifact:${filename}`});
  return id;
}

function execute(id, executable, args, kind, scope, suffix, accept = code => code === 0, options = {}) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(executable, args, {cwd: options.cwd || sourceDir, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
  const finishedAt = new Date().toISOString();
  if (result.error) throw result.error;
  const exitCode = result.status === null ? 255 : result.status;
  const artifactId = retain(id, kind, scope, suffix, 'text/plain', `[stdout]\n${result.stdout}\n[stderr]\n${result.stderr}`);
  const classification = accept(exitCode, result) ? 'pass' : 'unexpected-failure';
  commands.push({id, argv: [executable, ...args], startedAt, finishedAt, exitCode, classification, artifactIds: [artifactId]});
  if (classification !== 'pass') throw new Error(`${id} failed acceptance with exit ${exitCode}`);
  return result;
}

const npm = (id, args, kind, scope, suffix, accept, cwd) =>
  execute(id, process.execPath, [npmCli, ...args], kind, scope, suffix, accept, {cwd});

for (const name of ['common', 'client', 'server', 'dialogs', 'settings-application']) {
  npm(`${name}_install`, ['ci', '--ignore-scripts'], 'install-log', name, `${name}-install.txt`, undefined,
    path.join(sourceDir, `vendor/osjs-${name}`));
}

execute('integration_verifier', process.execPath, ['scripts/security/verify-g3-integration.cjs'], 'security-test', 'release', 'integration-verifier.txt');
execute('hostile_boundary_tests', process.execPath, ['--test', 'scripts/security/g3-safe-object.green.test.cjs'], 'security-test', 'release', 'hostile-boundary-tests.txt');

const jest = path.join(sourceDir, 'vendor/osjs-client/node_modules/jest/bin/jest.js');
execute('common_security_tests', process.execPath, [jest, '--config', 'vendor/osjs-common/package.json', '--runInBand', '--coverage=false', 'vendor/osjs-common/__tests__/safe-object.js'], 'security-test', 'common', 'common-security-tests.txt');
npm('client_tests', ['run', 'jest', '--', '--runInBand', '--coverage=false'], 'compatibility-test', 'client', 'client-tests.txt', undefined, path.join(sourceDir, 'vendor/osjs-client'));
execute('server_tests', process.execPath, [jest, '--config', 'vendor/osjs-server/package.json', '--runInBand', '--coverage=false'], 'compatibility-test', 'server', 'server-tests.txt');
npm('dialogs_lint', ['test'], 'compatibility-test', 'dialogs', 'dialogs-lint.txt', undefined, path.join(sourceDir, 'vendor/osjs-dialogs'));
npm('settings_lint', ['run', 'eslint'], 'compatibility-test', 'settings-application', 'settings-lint.txt', undefined, path.join(sourceDir, 'vendor/osjs-settings-application'));

function audit(id, args, scope) {
  const result = npm(id, args, 'npm-audit', scope, `${id}.json`, code => code === 0 || code === 1);
  const parsed = JSON.parse(result.stdout);
  if (Object.keys(parsed.vulnerabilities || {}).some(name => name.toLowerCase() === 'deepmerge')) {
    throw new Error(`${id}: deepmerge advisory remains`);
  }
}
audit('audit_full', ['audit', '--json'], 'full');
audit('audit_production', ['audit', '--omit=dev', '--json'], 'production');

const rootLock = fs.readFileSync(path.join(sourceDir, 'package-lock.json'), 'utf8');
const scanTargets = [
  'package-lock.json',
  'vendor/osjs-client/src', 'vendor/osjs-client/dist',
  'vendor/osjs-common/src', 'vendor/osjs-common/dist',
  'vendor/osjs-dialogs/src', 'vendor/osjs-dialogs/dist',
  'vendor/osjs-server/src',
  'vendor/osjs-settings-application/index.js', 'vendor/osjs-settings-application/dist'
];
const walk = relative => {
  const absolute = path.join(sourceDir, relative);
  return fs.statSync(absolute).isDirectory()
    ? fs.readdirSync(absolute, {withFileTypes: true}).flatMap(entry => walk(path.join(relative, entry.name)))
    : [relative];
};
const scanned = scanTargets.flatMap(walk);
const matches = [];
for (const relative of scanned) {
  const content = fs.readFileSync(path.join(sourceDir, relative), 'utf8');
  if (/deepmerge/i.test(content)) matches.push(relative);
}
const scan = {rootLockSha256: lockHash, files: scanned.length, matches: [...new Set(matches)].sort()};
if (matches.length || /deepmerge/i.test(rootLock)) throw new Error(`shipped deepmerge matches: ${matches.join(', ')}`);
retain('deepmerge_absence', 'dependency-inventory', 'release', 'deepmerge-absence.json', 'application/json', `${JSON.stringify(scan, null, 2)}\n`);

const context = {commit, lockHash, packageHash: sha256(path.join(sourceDir, 'package.json'))};
retain('source_identity', 'source-context', 'source', 'source-identity.json', 'application/json', `${JSON.stringify(context, null, 2)}\n`);
const now = new Date().toISOString();
commands.push({id: 'source_identity', argv: ['internal', 'source-identity'], startedAt: now, finishedAt: now, exitCode: 0, classification: 'pass', artifactIds: ['source_identity']});

const manifest = {schemaVersion: 1, evidenceId, roadmapId: 'RM-SEC-001', goalId: 'G3', generatedAt: new Date().toISOString(),
  source: {commit, dirty: false, statusSha256: null, lockfilePath: 'package-lock.json', lockfileSha256: lockHash},
  environment: {os: process.platform, arch: process.arch, nodeVersion: process.version,
    npmVersion: spawnSync(process.execPath, [npmCli, '--version'], {encoding: 'utf8', env}).stdout.trim(),
    registry: spawnSync(process.execPath, [npmCli, 'config', 'get', 'registry'], {encoding: 'utf8', env}).stdout.trim()},
  commands, artifacts};
const manifestFile = path.join(outputRoot, `${evidenceId}_manifest.json`);
fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);

const sbomDir = path.join(outputRoot, 'sbom');
const sbom = spawnSync(process.execPath, [path.join(sourceDir, 'scripts/security/capture-sbom-baseline.js'), sourceDir, toolDir, sbomDir, runtimeDir, timestamp, commit, 'clean'],
  {cwd: sourceDir, env: {...env, EVIDENCE_GOAL_ID: 'G3'}, encoding: 'utf8', stdio: 'inherit', maxBuffer: 64 * 1024 * 1024});
if (sbom.status !== 0) throw new Error(`SBOM capture exited ${sbom.status}`);
for (const name of fs.readdirSync(sbomDir).filter(name => name.endsWith('.cdx.json'))) {
  if (/deepmerge/i.test(fs.readFileSync(path.join(sbomDir, name), 'utf8'))) throw new Error(`${name}: deepmerge remains in release SBOM`);
}
const manifests = [manifestFile, ...fs.readdirSync(sbomDir).filter(name => name.endsWith('_manifest.json')).map(name => path.join(sbomDir, name))];
const validation = spawnSync(process.execPath, [path.join(sourceDir, 'scripts/security/validate-evidence-manifest.js'), ...manifests], {cwd: sourceDir, env, encoding: 'utf8', stdio: 'inherit'});
if (validation.status !== 0) throw new Error('manifest validation failed');
if (git(['status', '--porcelain=v1', '--untracked-files=all'])) throw new Error('evidence generation dirtied checkout');
console.log(JSON.stringify({timestamp, commit, manifests, scan}, null, 2));
