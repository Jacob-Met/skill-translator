import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {study} from './cue-budget-fixture.mjs';
import {inspectInstrumentChangeStudy} from '../src/instrument-change-study.mjs';
test('actual CLI pairs source-bound observations without any threshold fields and refuses malformed samples',()=>{
 const dir=mkdtempSync(join(tmpdir(),'skill-change-cli-'));try{const source=study([['0'],['1']],['A','B']).comparison.examples[0].source,raw={format:'skill-translator.instrument-observations/v1',evidenceClass:'authored-example',instrument:{name:'Authored scalar',quantity:'supplied scalar',unit:'units',calibrationBasis:'Authored software control'},samples:Array.from({length:47},(_,i)=>({timeSeconds:100+i*.13,value:i<23?3:7})),clock:{anchors:[{instrumentSeconds:100,clipSeconds:1},{instrumentSeconds:108,clipSeconds:9}],verification:{instrumentSeconds:104,clipSeconds:5},toleranceSeconds:.01,basis:'Authored clock'},maximumGapSeconds:.2};
  const sourceFile=join(dir,'source.json'),rawFile=join(dir,'observations.json');writeFileSync(sourceFile,JSON.stringify(source));writeFileSync(rawFile,JSON.stringify(raw));const command=()=>spawnSync(process.execPath,[resolve('tools/pair-instrument-change.mjs'),sourceFile,rawFile],{encoding:'utf8'}),result=command();assert.ifError(result.error);assert.equal(result.status,0,result.stderr);const paired=JSON.parse(result.stdout);assert.deepEqual(paired.source,source);assert.deepEqual(paired.samples,raw.samples);assert.equal('settings' in paired,false);assert.equal('threshold' in paired,false);assert.equal(inspectInstrumentChangeStudy(source,paired).inquiries[0].status,'preferred');
  raw.source={...source,title:'Conflicting source supplied before pairing'};writeFileSync(rawFile,JSON.stringify(raw));const conflict=command();assert.ifError(conflict.error);assert.notEqual(conflict.status,0);assert.equal(conflict.stdout,'');assert.match(conflict.stderr,/source changed/);delete raw.source;
  raw.samples[3].timeSeconds=raw.samples[2].timeSeconds;writeFileSync(rawFile,JSON.stringify(raw));const bad=command();assert.ifError(bad.error);assert.notEqual(bad.status,0);assert.equal(bad.stdout,'');assert.match(bad.stderr,/strictly increase/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
