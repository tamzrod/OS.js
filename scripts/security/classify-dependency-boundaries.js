#!/usr/bin/env node
'use strict';
const crypto=require('crypto'),fs=require('fs'),path=require('path');
const [lockfilePath,outputPath]=process.argv.slice(2);if(!outputPath){console.error('Usage: classify-dependency-boundaries.js <lockfile> <output>');process.exit(2)}
const bytes=fs.readFileSync(lockfilePath),lock=JSON.parse(bytes),packages=lock.packages,root=packages[''];
if(lock.lockfileVersion!==3||!root)throw new Error('Expected npm v3 lockfile');
const seeds={
  'browser-runtime':Object.keys(root.dependencies||{}).filter(n=>!['@osjs/cli','@osjs/server'].includes(n)),
  'server-runtime':['@osjs/server'],'cli-runtime-tooling':['@osjs/cli'],
  'development-build-tooling':Object.keys(root.devDependencies||{})
};
function resolve(parent,name){let current=parent;while(current){const candidate=`${current}/node_modules/${name}`;if(packages[candidate])return candidate;const marker=current.lastIndexOf('/node_modules/');current=marker===-1?'':current.slice(0,marker)}const candidate=`node_modules/${name}`;return packages[candidate]?candidate:null}
const reached=new Map(Object.keys(packages).filter(Boolean).map(p=>[p,new Set()])),unresolvedEdges=[];
for(const [boundary,names] of Object.entries(seeds)){const queue=[];for(const name of names){const seed=resolve('',name);seed?queue.push(seed):unresolvedEdges.push({from:'<root>',name,boundary})}const visited=new Set();while(queue.length){const packagePath=queue.shift();if(visited.has(packagePath))continue;visited.add(packagePath);reached.get(packagePath).add(boundary);const entry=packages[packagePath],names2=new Set([...Object.keys(entry.dependencies||{}),...Object.keys(entry.optionalDependencies||{}),...Object.keys(entry.peerDependencies||{})]);for(const name of [...names2].sort()){const target=resolve(packagePath,name);if(target)queue.push(target);else if(!entry.peerDependenciesMeta?.[name]?.optional)unresolvedEdges.push({from:packagePath,name,boundary})}}}
function nameOf(packagePath,entry){return entry.name||packagePath.replace(/^node_modules\//,'').split('/node_modules/').pop()}
const entries=Object.entries(packages).filter(([p])=>p).map(([packagePath,entry])=>{const boundaries=[...reached.get(packagePath)].sort();const classification=entry.optional===true?'optional':boundaries.length===0?'unknown':boundaries.length===1?boundaries[0]:'mixed';return{path:packagePath,name:nameOf(packagePath,entry),version:entry.version||null,classification,boundaries,dev:entry.dev===true,optional:entry.optional===true}}).sort((a,b)=>a.path.localeCompare(b.path));
const counts={};for(const entry of entries)counts[entry.classification]=(counts[entry.classification]||0)+1;
const output={formatVersion:1,source:path.basename(lockfilePath),lockfileSha256:crypto.createHash('sha256').update(bytes).digest('hex'),algorithm:{description:'Reachability from reviewed root dependency seeds using npm node_modules path resolution.',seedGroups:seeds,rules:['Optional entries classify as optional while retaining reachability.','One reached boundary uses that boundary.','Multiple reached boundaries classify mixed.','No reached boundary classifies unknown.']},packageCount:entries.length,counts,unresolvedEdges,packages:entries};
fs.writeFileSync(outputPath,`${JSON.stringify(output,null,2)}\n`,{flag:'wx'});console.log(JSON.stringify({packageCount:entries.length,counts,unresolvedEdges:unresolvedEdges.length},null,2));
