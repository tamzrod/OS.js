#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');

const [outputRoot, toolDir] = process.argv.slice(2);
if (!toolDir) throw new Error('usage: run-g4-evidence-ci.js <output-root> <sbom-tool-dir>');
const root = process.cwd();
const npmCli = fs.realpathSync(spawnSync('which', ['npm'], {encoding: 'utf8'}).stdout.trim());
const env = {...process.env, CI: 'true', PATH: `${path.dirname(process.execPath)}:${process.env.PATH}`};
const git = args => spawnSync('git', args, {cwd: root, encoding: 'utf8'}).stdout.trim();
const commit = git(['rev-parse', 'HEAD']);
if (git(['status', '--porcelain=v1', '--untracked-files=all'])) throw new Error('clean checkout required');
fs.mkdirSync(outputRoot, {recursive: true});
const hash = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
const lockHash = hash(path.join(root, 'package-lock.json'));
const evidenceId = `${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}_${commit.slice(0, 12)}_${lockHash.slice(0, 12)}`;
const artifacts = [], commands = [];
function retain(id, kind, scope, suffix, type, content) {
  const filename = `${evidenceId}_${suffix}`, target = path.join(outputRoot, filename);
  fs.writeFileSync(target, content);
  artifacts.push({id, kind, scope, filename, mediaType: type, bytes: fs.statSync(target).size,
    sha256: hash(target), retention: 'ci', location: `ci-artifact:${filename}`});
  return id;
}
function run(id, executable, args, kind, scope, accept = code => code === 0, cwd = root, envOverride = {}) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(executable, args, {cwd, env: {...env, ...envOverride}, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
  if (result.error) throw result.error;
  const exitCode = result.status ?? 255;
  const artifactId = retain(id, kind, scope, `${id}.txt`, 'text/plain', `[stdout]\n${result.stdout}\n[stderr]\n${result.stderr}`);
  const classification = accept(exitCode) ? 'pass' : 'unexpected-failure';
  commands.push({id, argv: [executable, ...args], startedAt, finishedAt: new Date().toISOString(), exitCode, classification, artifactIds: [artifactId]});
  if (classification !== 'pass') throw new Error(`${id} exited ${exitCode}`);
  return result;
}
const node = (id, args, kind = 'security-test', scope = 'release', envOverride = {}) =>
  run(id, process.execPath, args, kind, scope, code => code === 0, root, envOverride);
const npm = (id, args, kind, scope, accept) => run(id, process.execPath, [npmCli, ...args], kind, scope, accept);

node('toolchain', ['scripts/security/verify-g4-toolchain.cjs']);
for (const name of ['common', 'client', 'dialogs', 'settings-application']) {
  npm(`build_${name}`, ['run', '--prefix', `vendor/osjs-${name}`, 'build'], 'build-log', name);
}
npm('package_discover', ['run', 'package:discover'], 'build-log', 'browser');
npm('build_root', ['run', 'build'], 'build-log', 'browser');
node('library_contract', ['scripts/security/verify-g4-library-builds.cjs']);
node('root_contract', ['scripts/security/verify-g4-root-build.cjs']);
node('browser_policy', ['scripts/security/verify-g4-browser-policy.cjs']);
node('g3_integration', ['scripts/security/verify-g3-integration.cjs']);
node('hostile_boundaries', ['--test', 'scripts/security/g3-safe-object.green.test.cjs']);
node('shipping_boundary', ['--test', 'scripts/security/g5-shipping-boundary.test.cjs']);
node('hostile_input', ['--test', 'scripts/security/g5-hostile-input.test.cjs']);
node('dos_boundaries', ['--test', 'scripts/security/g5-dos-boundaries.test.cjs']);
run('client_tests', path.join(toolDir, 'node_modules/jest/bin/jest.js'), ['--runInBand', '--coverage=false'],
  'compatibility-test', 'client', code => code === 0, path.join(root, 'vendor/osjs-client'));

const full = npm('audit_full', ['audit', '--json'], 'npm-audit', 'full', code => code === 0 || code === 1);
const production = npm('audit_production', ['audit', '--omit=dev', '--json'], 'npm-audit', 'production', code => code === 0 || code === 1);
const auditDir = path.join(outputRoot, 'audit');
fs.mkdirSync(auditDir, {recursive: true});
const fullFile = path.join(auditDir, 'full.json'), productionFile = path.join(auditDir, 'production.json');
fs.writeFileSync(fullFile, full.stdout); fs.writeFileSync(productionFile, production.stdout);

const sbomDir = path.join(outputRoot, 'sbom');
const capture = spawnSync(process.execPath, [path.join(root, 'scripts/security/capture-sbom-baseline.js'), root, toolDir,
  sbomDir, path.dirname(path.dirname(process.execPath)), evidenceId.split('_')[0], commit, 'clean'],
{cwd: root, env: {...env, EVIDENCE_GOAL_ID: 'G4'}, encoding: 'utf8', stdio: 'inherit', maxBuffer: 64 * 1024 * 1024});
if (capture.status !== 0) throw new Error(`SBOM capture exited ${capture.status}`);
const sboms = fs.readdirSync(sbomDir).filter(name => name.endsWith('.cdx.json')).sort();
const fullSbom = path.join(sbomDir, sboms.find(name => name.includes('sbom_full')));
const productionSbom = path.join(sbomDir, sboms.find(name => name.includes('sbom_production')));
node('security_reconciliation', ['scripts/security/verify-g4-security-reconciliation.cjs', fullFile, productionFile, fullSbom, productionSbom]);
node('residual_chains', ['scripts/security/verify-g5-residual-chains.cjs', fullFile, productionFile, productionSbom, path.join(root, 'dist')]);
node('browser_artifact', ['--test', 'scripts/security/g6-browser-artifact.test.cjs'], 'security-test', 'browser', {G6_SBOM: productionSbom});
node('static_host', ['--test', 'scripts/security/g6-static-host.test.cjs'], 'security-test', 'browser');

retain('source_identity', 'source-context', 'source', 'source-identity.json', 'application/json',
  `${JSON.stringify({commit, lockHash, packageHash: hash(path.join(root, 'package.json'))}, null, 2)}\n`);
const manifest = {schemaVersion: 1, evidenceId, roadmapId: 'RM-SEC-001', goalId: 'G4', generatedAt: new Date().toISOString(),
  source: {commit, dirty: false, statusSha256: null, lockfilePath: 'package-lock.json', lockfileSha256: lockHash},
  environment: {os: process.platform, arch: process.arch, nodeVersion: process.version,
    npmVersion: spawnSync(process.execPath, [npmCli, '--version'], {encoding: 'utf8', env}).stdout.trim(),
    registry: spawnSync(process.execPath, [npmCli, 'config', 'get', 'registry'], {encoding: 'utf8', env}).stdout.trim()}, commands, artifacts};
const manifestFile = path.join(outputRoot, `${evidenceId}_manifest.json`);
fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
const manifests = [manifestFile, ...fs.readdirSync(sbomDir).filter(name => name.endsWith('_manifest.json')).map(name => path.join(sbomDir, name))];
node('manifest_validation', ['scripts/security/validate-evidence-manifest.js', ...manifests]);
if (git(['status', '--porcelain=v1', '--untracked-files=all'])) throw new Error('evidence run dirtied checkout');
console.log(JSON.stringify({commit, evidenceId, manifests}, null, 2));
