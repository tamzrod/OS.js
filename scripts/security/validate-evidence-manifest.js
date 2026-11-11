#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const ID = /^[a-z0-9][a-z0-9_-]*$/;
const EVIDENCE_ID = /^[0-9]{8}T[0-9]{6}Z_[0-9a-f]{12}_[0-9a-f]{12}$/;
const FILENAME = /^[0-9]{8}T[0-9]{6}Z_[0-9a-f]{12}_[0-9a-f]{12}_[a-z0-9._-]+$/;
const CLASSIFICATIONS = new Set(['pass', 'findings', 'expected-failure', 'unexpected-failure']);
const RETENTION = new Set(['repository', 'ci']);
const KINDS = new Set([
  'install-log',
  'npm-audit',
  'sbom',
  'dependency-inventory',
  'dependency-classification',
  'package-discovery-log',
  'build-log',
  'source-context'
]);

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));

function assert(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

function unique(values) {
  return new Set(values).size === values.length;
}

function validate(manifest, filename) {
  const errors = [];
  assert(isObject(manifest), 'manifest must be an object', errors);
  if (!isObject(manifest)) return errors;

  assert(manifest.schemaVersion === 1, 'schemaVersion must equal 1', errors);
  assert(EVIDENCE_ID.test(manifest.evidenceId || ''), 'evidenceId has an invalid format', errors);
  assert(manifest.roadmapId === 'RM-SEC-001', 'roadmapId must equal RM-SEC-001', errors);
  assert(['G1', 'G2'].includes(manifest.goalId), 'goalId must equal G1 or G2', errors);
  assert(isDate(manifest.generatedAt), 'generatedAt must be an ISO date-time', errors);

  const source = manifest.source;
  assert(isObject(source), 'source must be an object', errors);
  if (isObject(source)) {
    assert(COMMIT.test(source.commit || ''), 'source.commit must be a full lowercase Git SHA', errors);
    assert(typeof source.dirty === 'boolean', 'source.dirty must be boolean', errors);
    assert(source.lockfilePath === 'package-lock.json', 'source.lockfilePath must equal package-lock.json', errors);
    assert(SHA256.test(source.lockfileSha256 || ''), 'source.lockfileSha256 must be lowercase SHA-256', errors);
    if (source.dirty) {
      assert(SHA256.test(source.statusSha256 || ''), 'dirty evidence requires source.statusSha256', errors);
    } else {
      assert(source.statusSha256 === null, 'clean evidence must set source.statusSha256 to null', errors);
    }
    if (EVIDENCE_ID.test(manifest.evidenceId || '') && COMMIT.test(source.commit || '') && SHA256.test(source.lockfileSha256 || '')) {
      const parts = manifest.evidenceId.split('_');
      assert(parts[1] === source.commit.slice(0, 12), 'evidenceId commit prefix does not match source.commit', errors);
      assert(parts[2] === source.lockfileSha256.slice(0, 12), 'evidenceId lock prefix does not match source.lockfileSha256', errors);
    }
  }

  const environment = manifest.environment;
  assert(isObject(environment), 'environment must be an object', errors);
  if (isObject(environment)) {
    assert(typeof environment.os === 'string' && environment.os.length > 0, 'environment.os is required', errors);
    assert(typeof environment.arch === 'string' && environment.arch.length > 0, 'environment.arch is required', errors);
    assert(environment.nodeVersion === 'v26.13.0', 'environment.nodeVersion must equal v26.13.0', errors);
    assert(environment.npmVersion === '11.20.0', 'environment.npmVersion must equal 11.20.0', errors);
    try {
      new URL(environment.registry);
    } catch {
      errors.push('environment.registry must be an absolute URL');
    }
  }

  assert(Array.isArray(manifest.artifacts) && manifest.artifacts.length > 0, 'artifacts must be a non-empty array', errors);
  const artifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
  const artifactIds = artifacts.map(artifact => artifact && artifact.id);
  assert(unique(artifactIds), 'artifact IDs must be unique', errors);

  for (const [index, artifact] of artifacts.entries()) {
    const prefix = `artifacts[${index}]`;
    assert(isObject(artifact), `${prefix} must be an object`, errors);
    if (!isObject(artifact)) continue;
    assert(ID.test(artifact.id || ''), `${prefix}.id is invalid`, errors);
    assert(KINDS.has(artifact.kind), `${prefix}.kind is invalid`, errors);
    assert(ID.test(artifact.scope || ''), `${prefix}.scope is invalid`, errors);
    assert(FILENAME.test(artifact.filename || ''), `${prefix}.filename is invalid`, errors);
    assert(typeof artifact.mediaType === 'string' && artifact.mediaType.length > 0, `${prefix}.mediaType is required`, errors);
    assert(Number.isInteger(artifact.bytes) && artifact.bytes >= 0, `${prefix}.bytes must be a non-negative integer`, errors);
    assert(SHA256.test(artifact.sha256 || ''), `${prefix}.sha256 must be lowercase SHA-256`, errors);
    assert(RETENTION.has(artifact.retention), `${prefix}.retention is invalid`, errors);
    if (EVIDENCE_ID.test(manifest.evidenceId || '') && typeof artifact.filename === 'string') {
      assert(artifact.filename.startsWith(`${manifest.evidenceId}_`), `${prefix}.filename must start with evidenceId`, errors);
    }
  }

  assert(Array.isArray(manifest.commands) && manifest.commands.length > 0, 'commands must be a non-empty array', errors);
  const commands = Array.isArray(manifest.commands) ? manifest.commands : [];
  const commandIds = commands.map(command => command && command.id);
  assert(unique(commandIds), 'command IDs must be unique', errors);

  for (const [index, command] of commands.entries()) {
    const prefix = `commands[${index}]`;
    assert(isObject(command), `${prefix} must be an object`, errors);
    if (!isObject(command)) continue;
    assert(ID.test(command.id || ''), `${prefix}.id is invalid`, errors);
    assert(Array.isArray(command.argv) && command.argv.length > 0 && command.argv.every(value => typeof value === 'string'), `${prefix}.argv must be a non-empty string array`, errors);
    assert(isDate(command.startedAt), `${prefix}.startedAt must be an ISO date-time`, errors);
    assert(isDate(command.finishedAt), `${prefix}.finishedAt must be an ISO date-time`, errors);
    if (isDate(command.startedAt) && isDate(command.finishedAt)) {
      assert(Date.parse(command.finishedAt) >= Date.parse(command.startedAt), `${prefix}.finishedAt precedes startedAt`, errors);
    }
    assert(Number.isInteger(command.exitCode) && command.exitCode >= 0 && command.exitCode <= 255, `${prefix}.exitCode is invalid`, errors);
    assert(CLASSIFICATIONS.has(command.classification), `${prefix}.classification is invalid`, errors);
    assert(Array.isArray(command.artifactIds) && command.artifactIds.length > 0 && unique(command.artifactIds), `${prefix}.artifactIds must be a non-empty unique array`, errors);
    for (const artifactId of command.artifactIds || []) {
      assert(artifactIds.includes(artifactId), `${prefix} references missing artifact ${artifactId}`, errors);
    }
  }

  if (errors.length) {
    return errors.map(error => `${filename}: ${error}`);
  }
  return [];
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: validate-evidence-manifest.js <manifest.json> [...]');
  process.exit(2);
}

let failed = false;
for (const filename of files) {
  try {
    const manifest = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const errors = validate(manifest, filename);
    if (errors.length) {
      failed = true;
      errors.forEach(error => console.error(error));
    } else {
      console.log(`${path.normalize(filename)}: valid`);
    }
  } catch (error) {
    failed = true;
    console.error(`${filename}: ${error.message}`);
  }
}

process.exit(failed ? 1 : 0);
