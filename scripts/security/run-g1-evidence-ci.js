#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const [outputRoot,toolDir]=process.argv.slice(2);if(!toolDir){console.error('Usage: run-g1-evidence-ci.js <output-root> <sbom-tool-dir>');process.exit(2)}
const sourceDir=process.cwd(),runtimeDir=path.dirname(path.dirname(process.execPath)),runtimeBin=path.join(runtimeDir,'bin'),commit=spawnSync('git',['rev-parse','HEAD'],{cwd:sourceDir,encoding:'utf8'}).stdout.trim(),status=spawnSync('git',['status','--porcelain=v1','--untracked-files=all'],{cwd:sourceDir,encoding:'utf8'}).stdout;
if(status!=='')throw new Error(`evidence requires a clean checkout:\n${status}`);const timestamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');fs.mkdirSync(outputRoot,{recursive:true});
function run(script,args){const r=spawnSync(process.execPath,[path.join(sourceDir,'scripts/security',script),...args],{cwd:sourceDir,encoding:'utf8',stdio:'inherit',env:{...process.env,CI:'true'},maxBuffer:64*1024*1024});if(r.error)throw r.error;if(r.status!==0)throw new Error(`${script} exited ${r.status}`)}
run('capture-audit-baseline.js',[sourceDir,path.join(outputRoot,'audit'),runtimeBin,timestamp,commit,'clean']);
run('capture-sbom-baseline.js',[sourceDir,toolDir,path.join(outputRoot,'sbom'),runtimeDir,timestamp,commit,'clean']);
run('capture-classification-build-baseline.js',[sourceDir,path.join(outputRoot,'classification-build'),runtimeDir,timestamp,commit,'clean']);
const manifests=[];for(const dir of ['audit','sbom','classification-build'])for(const name of fs.readdirSync(path.join(outputRoot,dir)))if(name.endsWith('_manifest.json'))manifests.push(path.join(outputRoot,dir,name));
run('validate-evidence-manifest.js',manifests);const finalStatus=spawnSync('git',['status','--porcelain=v1','--untracked-files=all'],{cwd:sourceDir,encoding:'utf8'}).stdout;if(finalStatus!=='')throw new Error(`evidence generation dirtied checkout:\n${finalStatus}`);console.log(JSON.stringify({timestamp,commit,manifests},null,2));
