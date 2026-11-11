#!/usr/bin/env node

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');

const [sourceDir, toolDir, outputDir, runtimeDir, timestamp, commit, sourceState] = process.argv.slice(2);
if (!sourceState) {
  console.error('Usage: capture-sbom-baseline.js <source> <tool-dir> <output> <runtime> <timestamp> <commit> <clean|status-sha256>');
  process.exit(2);
}

const EXPECTED_VERSION = '7.0.0';
const GOAL_ID = process.env.EVIDENCE_GOAL_ID || 'G1';
const EXPECTED_COMPONENTS = {
  G1: {full: 1392, production: 344},
  G2: {full: 1391, production: 1360}
};
const EXPECTED_INTEGRITY = 'sha512-5KVebwZ21EDt5N6eW0b7QPiQ7eRJwjdsfUUoJsCIdk5Y110N5viVa9PX0Wsp4yZI+y75XhVNut8EalY8amhc7g==';
const sha256Buffer = value => crypto.createHash('sha256').update(value).digest('hex');
const sha256File = filename => sha256Buffer(fs.readFileSync(filename));
const iso = () => new Date().toISOString();
const runtimeBin = path.dirname(process.execPath);
const node = process.execPath;
const npmLookup = spawnSync('which', ['npm'], {encoding: 'utf8'});
const npmCommand = npmLookup.status === 0 ? npmLookup.stdout.trim() : 'npm';
const npmCli = npmCommand === 'npm' ? process.env.npm_execpath : fs.realpathSync(npmCommand);
if (!npmCli) {
  throw new Error(`unable to resolve npm for runtime ${runtimeDir}`);
}
const runner = path.join(toolDir, 'node_modules/.bin/cyclonedx-npm');
const toolLock = JSON.parse(fs.readFileSync(path.join(toolDir, 'package-lock.json')));
const toolPackage = toolLock.packages['node_modules/@cyclonedx/cyclonedx-npm'];
if (toolPackage?.version !== EXPECTED_VERSION || toolPackage?.integrity !== EXPECTED_INTEGRITY) {
  throw new Error('CycloneDX runner pin or integrity does not match the approved T1.5a value');
}

const lockHash = sha256File(path.join(sourceDir, 'package-lock.json'));
const manifestHash = sha256File(path.join(sourceDir, 'package.json'));
const evidenceId = `${timestamp}_${commit.slice(0, 12)}_${lockHash.slice(0, 12)}`;
const env = {
  ...process.env,
  PATH: `${runtimeBin}:${process.env.PATH}`,
  npm_execpath: npmCli,
  CI: 'true'
};
const sourceDirty = sourceState !== 'clean';
const statusSha256 = sourceDirty ? sourceState : null;
fs.mkdirSync(outputDir, {recursive: true});

function validateDiagnostic(stderr, id) {
  if (!stderr.includes('npm error code ELSPROBLEMS') ||
      !stderr.includes('npm error invalid: hyperapp@1.2.10')) {
    throw new Error(`${id}: expected Hyperapp ELSPROBLEMS diagnostic was not preserved`);
  }
  const codes = [...stderr.matchAll(/npm error code ([A-Z0-9_]+)/g)].map(match => match[1]);
  if (codes.length === 0 || codes.some(code => code !== 'ELSPROBLEMS')) {
    throw new Error(`${id}: unknown npm error code in diagnostic`);
  }
  const invalid = stderr.split('\n').filter(line => line.includes('npm error invalid:'));
  if (invalid.length === 0 || invalid.some(line => !/npm error invalid: hyperapp@1\.2\.10\b/.test(line))) {
    throw new Error(`${id}: unknown invalid-package diagnostic`);
  }
}

function recursiveComponents(document) {
  const components = [];
  const walk = entries => {
    for (const component of entries || []) {
      components.push(component);
      walk(component.components);
    }
  };
  walk(document.components);
  walk(document.metadata?.component?.components);
  return components;
}

function structuralStats(document, id) {
  if (document.bomFormat !== 'CycloneDX' || document.specVersion !== '1.6') {
    throw new Error(`${id}: expected CycloneDX 1.6 JSON`);
  }
  const root = document.metadata?.component;
  if (root?.group !== '@osjs' || root?.name !== 'osjs' || root?.version !== '3.1.12' || root?.type !== 'application') {
    throw new Error(`${id}: unexpected root component identity`);
  }
  const components = recursiveComponents(document);
  const refs = new Set(components.map(component => component['bom-ref']));
  refs.add(root['bom-ref']);
  let unresolvedRefs = 0;
  for (const dependency of document.dependencies || []) {
    if (!refs.has(dependency.ref)) unresolvedRefs++;
    for (const child of dependency.dependsOn || []) if (!refs.has(child)) unresolvedRefs++;
  }
  if (unresolvedRefs !== 0) throw new Error(`${id}: unresolved dependency references`);
  const identities = new Set(components.map(component => `${component.name}@${component.version}`));
  if (!identities.has('hyperapp@1.2.10') || !identities.has('hyperapp-nestable@1.1.0')) {
    throw new Error(`${id}: known peer-conflict components are missing`);
  }
  if (GOAL_ID === 'G2' && [...identities].some(identity => identity.startsWith('js-cookie@'))) {
    throw new Error(`${id}: forbidden js-cookie component is present`);
  }
  return {components: components.length, dependencies: (document.dependencies || []).length, unresolvedRefs};
}

function execute(scope, omitDev, suffix) {
  const args = [
    '--ignore-npm-errors', '--package-lock-only', '--output-reproducible', '--no-validate',
    '--spec-version', '1.6', '--output-format', 'JSON', '--output-file', '-',
    ...(omitDev ? ['--omit=dev'] : []),
    path.join(sourceDir, 'package.json')
  ];
  const startedAt = iso();
  const result = spawnSync(runner, args, {cwd: sourceDir, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
  const finishedAt = iso();
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${scope}: runner exited ${result.status}: ${result.stderr}`);
  validateDiagnostic(result.stderr, scope);
  const document = JSON.parse(result.stdout);
  const stats = structuralStats(document, scope);
  const normalized = `${JSON.stringify(document, null, 2)}\n`;
  return {args, startedAt, finishedAt, stderr: result.stderr, normalized, stats, suffix};
}

function artifact(id, kind, scope, filename, mediaType, content) {
  const target = path.join(outputDir, filename);
  fs.writeFileSync(target, content);
  return {id, kind, scope, filename, mediaType, bytes: fs.statSync(target).size, sha256: sha256File(target), retention: 'ci', location: `ci-artifact:${filename}`};
}

async function main() {
  const full = execute('full', false, 'sbom_full.cdx.json');
  const production = execute('production', true, 'sbom_production.cdx.json');
  const fullRepeat = execute('full_repeat', false, 'unused');
  const productionRepeat = execute('production_repeat', true, 'unused');
  if (full.normalized !== fullRepeat.normalized || production.normalized !== productionRepeat.normalized) {
    throw new Error('SBOM output is not byte-reproducible');
  }
  const expectedComponents = EXPECTED_COMPONENTS[GOAL_ID];
  if (!expectedComponents || full.stats.components !== expectedComponents.full ||
      production.stats.components !== expectedComponents.production) {
    throw new Error(`${GOAL_ID}: SBOM component totals differ from approved baseline: ` +
      `full=${full.stats.components}, production=${production.stats.components}`);
  }

  const validationModule = path.join(toolDir, 'node_modules/@cyclonedx/cyclonedx-library/dist.node/validation/index.node.js');
  const specModule = path.join(toolDir, 'node_modules/@cyclonedx/cyclonedx-library/dist.node/spec/index.js');
  const {JsonValidator} = require(validationModule);
  const {Version} = require(specModule);
  const validator = new JsonValidator(Version.v1dot6);
  for (const [id, content] of [['full', full.normalized], ['production', production.normalized]]) {
    const error = await validator.validate(content);
    if (error !== null) throw new Error(`${id}: CycloneDX schema validation failed: ${JSON.stringify(error)}`);
  }

  const artifacts = [];
  const commands = [];
  for (const item of [full, production]) {
    const sbomId = `sbom_${item === full ? 'full' : 'production'}`;
    const scope = item === full ? 'full' : 'production';
    const sbomFilename = `${evidenceId}_${item.suffix}`;
    const diagnosticFilename = `${evidenceId}_sbom-diagnostic_${scope}.txt`;
    artifacts.push(artifact(sbomId, 'sbom', scope, sbomFilename, 'application/vnd.cyclonedx+json', item.normalized));
    artifacts.push(artifact(`${sbomId}_diagnostic`, 'source-context', `sbom-${scope}`, diagnosticFilename, 'text/plain', item.stderr));
    commands.push({
      id: sbomId,
      argv: ['cyclonedx-npm', ...item.args],
      startedAt: item.startedAt,
      finishedAt: item.finishedAt,
      exitCode: 0,
      classification: 'pass',
      artifactIds: [sbomId, `${sbomId}_diagnostic`]
    });
  }

  const manifest = {
    schemaVersion: 1, evidenceId, roadmapId: 'RM-SEC-001', goalId: GOAL_ID, generatedAt: iso(),
    source: {commit, dirty: sourceDirty, statusSha256, lockfilePath: 'package-lock.json', lockfileSha256: lockHash},
    environment: {
      os: process.platform, arch: process.arch,
      nodeVersion: spawnSync(node, ['--version'], {encoding: 'utf8'}).stdout.trim(),
      npmVersion: spawnSync(node, [npmCli, '--version'], {encoding: 'utf8', env}).stdout.trim(),
      registry: spawnSync(node, [npmCli, 'config', 'get', 'registry'], {encoding: 'utf8', env}).stdout.trim()
    },
    commands, artifacts
  };
  const manifestFile = path.join(outputDir, `${evidenceId}_manifest.json`);
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  if (sha256File(path.join(sourceDir, 'package.json')) !== manifestHash || sha256File(path.join(sourceDir, 'package-lock.json')) !== lockHash) {
    throw new Error('project manifest or lockfile changed during evidence generation');
  }
  console.log(JSON.stringify({manifestFile, full: full.stats, production: production.stats, artifacts}, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
