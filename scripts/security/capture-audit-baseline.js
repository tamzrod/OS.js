#!/usr/bin/env node

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');

const [sourceDir, outputDir, runtimeBin, timestamp, commit, sourceState] = process.argv.slice(2);
if (!sourceState) {
  console.error('Usage: capture.js <source> <output> <runtime-bin> <timestamp> <commit> <clean|status-sha256>');
  process.exit(2);
}

const sha256 = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
const iso = () => new Date().toISOString();
const lockHash = sha256(path.join(sourceDir, 'package-lock.json'));
const evidenceId = `${timestamp}_${commit.slice(0, 12)}_${lockHash.slice(0, 12)}`;
const npm = path.join(runtimeBin, 'npm');
const node = path.join(runtimeBin, 'node');
const env = {...process.env, PATH: `${runtimeBin}:${process.env.PATH}`, CI: 'true'};
const sourceDirty = sourceState !== 'clean';
const statusSha256 = sourceDirty ? sourceState : null;

fs.mkdirSync(outputDir, {recursive: true});
const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'osjs-t1-4-'));
const reducedDir = path.join(workRoot, 'scripts-disabled');
const enabledDir = path.join(workRoot, 'scripts-enabled');
for (const dir of [reducedDir, enabledDir]) {
  fs.mkdirSync(dir);
  fs.copyFileSync(path.join(sourceDir, 'package.json'), path.join(dir, 'package.json'));
  fs.copyFileSync(path.join(sourceDir, 'package-lock.json'), path.join(dir, 'package-lock.json'));
}

const artifacts = [];
const commands = [];

function artifact(id, kind, scope, suffix, mediaType, content) {
  const filename = `${evidenceId}_${suffix}`;
  const target = path.join(outputDir, filename);
  fs.writeFileSync(target, content);
  artifacts.push({
    id, kind, scope, filename, mediaType,
    bytes: fs.statSync(target).size,
    sha256: sha256(target),
    retention: 'ci',
    location: `ci-artifact:${filename}`
  });
  return id;
}

function run(id, cwd, args, artifactSpec, classify) {
  const startedAt = iso();
  const result = spawnSync(npm, args, {cwd, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
  const finishedAt = iso();
  if (result.error) throw result.error;
  const exitCode = result.status === null ? 255 : result.status;
  const content = artifactSpec.json
    ? result.stdout
    : `[stdout]\n${result.stdout}\n[stderr]\n${result.stderr}`;
  const artifactId = artifact(artifactSpec.id, artifactSpec.kind, artifactSpec.scope, artifactSpec.suffix, artifactSpec.mediaType, content);
  commands.push({id, argv: ['npm', ...args], startedAt, finishedAt, exitCode, classification: classify(exitCode, content), artifactIds: [artifactId]});
  return {exitCode, stdout: result.stdout, stderr: result.stderr};
}

const installClass = code => code === 0 ? 'pass' : 'unexpected-failure';
const auditClass = (code, content) => {
  try {
    const parsed = JSON.parse(content);
    if (!parsed.metadata || !parsed.metadata.vulnerabilities) return 'unexpected-failure';
    return code === 0 ? 'pass' : code === 1 ? 'findings' : 'unexpected-failure';
  } catch {
    return 'unexpected-failure';
  }
};

run('install_scripts_disabled', reducedDir, ['ci', '--ignore-scripts'], {
  id: 'install_scripts_disabled', kind: 'install-log', scope: 'scripts-disabled',
  suffix: 'install-log_scripts-disabled.txt', mediaType: 'text/plain'
}, installClass);
run('install_scripts_enabled', enabledDir, ['ci'], {
  id: 'install_scripts_enabled', kind: 'install-log', scope: 'scripts-enabled',
  suffix: 'install-log_scripts-enabled.txt', mediaType: 'text/plain'
}, installClass);
run('audit_full', reducedDir, ['audit', '--json'], {
  id: 'audit_full', kind: 'npm-audit', scope: 'full',
  suffix: 'npm-audit_full.json', mediaType: 'application/json', json: true
}, auditClass);
run('audit_production', reducedDir, ['audit', '--omit=dev', '--json'], {
  id: 'audit_production', kind: 'npm-audit', scope: 'production',
  suffix: 'npm-audit_production.json', mediaType: 'application/json', json: true
}, auditClass);

for (const dir of [reducedDir, enabledDir]) {
  if (sha256(path.join(dir, 'package-lock.json')) !== lockHash) {
    throw new Error(`npm modified package-lock.json in ${dir}`);
  }
}

const manifest = {
  schemaVersion: 1,
  evidenceId,
  roadmapId: 'RM-SEC-001',
  goalId: 'G1',
  generatedAt: iso(),
  source: {commit, dirty: sourceDirty, statusSha256, lockfilePath: 'package-lock.json', lockfileSha256: lockHash},
  environment: {
    os: process.platform,
    arch: process.arch,
    nodeVersion: spawnSync(node, ['--version'], {encoding: 'utf8'}).stdout.trim(),
    npmVersion: spawnSync(npm, ['--version'], {encoding: 'utf8', env}).stdout.trim(),
    registry: spawnSync(npm, ['config', 'get', 'registry'], {encoding: 'utf8', env}).stdout.trim()
  },
  commands,
  artifacts
};

const manifestFile = path.join(outputDir, `${evidenceId}_manifest.json`);
fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({workRoot, manifestFile, manifest}, null, 2));
if (commands.some(command => command.classification === 'unexpected-failure')) process.exit(1);
