import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as candidate from '../src/task-readiness.mjs';
import {readinessSequenceFixture} from '../test/task-readiness-fixture.mjs';
import {createPrerequisiteRehearsal} from '../src/prerequisite-rehearsal.mjs';
import {createCapture,appendCaptureMark} from '../src/capture.mjs';
import {attachMomentCalibration,momentTask} from '../src/demonstration-sequence.mjs';
import {createPractice} from '../src/practice.mjs';

const baselinePin='78a2b24c37cd8bfc93f00ddc64be00c28012d731';
const baselineBlob='b17fb05416b0ae18fd8e853e7ac4f2301572cd0d';
if(!process.argv[2])throw Error('Supply the original task-readiness module path from the cached-replay baseline '+baselinePin);
const baselinePath=resolve(process.argv[2]),bytes=await readFile(baselinePath);
const actualBlob=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
assert.equal(actualBlob,baselineBlob,'The baseline must contain the merged graph cache, not the earlier uncached replay.');
const baseline=await import(pathToFileURL(baselinePath).href);
const event=i=>i%2?{type:'choose',stepId:'align',prediction:'ready',reason:'Authored judgment'}:{type:'observe',stepId:'prepare',checkId:'done',value:'pass',note:'Authored observation',evidenceClass:'authored-example'};
const definitions=source=>source.steps.map(s=>({stepId:s.id,checks:[{id:'done',prompt:'Result',basis:'Authored'}]}));
const prerequisites=source=>createPrerequisiteRehearsal(source,[{before:'prepare',after:'align',reason:'Authored support'}]);
const source=readinessSequenceFixture(),study=baseline.createReadiness(source,prerequisites(source),definitions(source));
for(const size of [0,12,499])measure(`manual-${size}-to-${size+1}`,source,{...study,events:Array.from({length:size},(_,i)=>event(i))},event(size));
let calibrated=readinessSequenceFixture();const moment=calibrated.moments[1];
let capture=createCapture(moment.image,[{x:0,y:0},{x:319,y:0},{x:319,y:179},{x:0,y:179}],100,100,{origin:moment.origin});
capture=appendCaptureMark(capture,{label:'Reference',sourcePx:{x:159.5,y:89.5},kind:'fraction',toleranceMm:1});
calibrated=attachMomentCalibration(calibrated,moment.id,capture);
const defs=definitions(calibrated);defs[0].checks[0].placement={widthMm:100,heightMm:100};
const practiceStudy=baseline.createReadiness(calibrated,prerequisites(calibrated),defs),session=createPractice(momentTask(calibrated,moment.id),100,100);
practiceStudy.events=Array.from({length:49},(_,i)=>i%2?{...event(i),stepId:'align'}:{type:'practice',stepId:'prepare',checkId:'done',note:'Retained practice',session});
measure('practice-49-to-50',calibrated,practiceStudy,{type:'practice',stepId:'prepare',checkId:'done',note:'New practice',session});

function measure(name,source,input,addition){
 assert.deepEqual(candidate.recordReadiness(source,input,addition),baseline.recordReadiness(source,input,addition));
 const times={baseline:[],candidate:[]},apis={baseline,candidate};
 for(let i=0;i<8;i++)for(const api of Object.values(apis))api.recordReadiness(source,input,addition);
 for(let i=0;i<40;i++)for(const key of i%2?['baseline','candidate']:['candidate','baseline']){
  const start=performance.now();apis[key].recordReadiness(source,input,addition);times[key].push(performance.now()-start);
 }
 const median=values=>values.sort((a,b)=>a-b)[20];
 const beforeMs=median(times.baseline),afterMs=median(times.candidate);
 console.log(JSON.stringify({name,node:process.version,baselinePin,baselineBlob,events:input.events.length,samples:40,beforeMs,afterMs,speedup:beforeMs/afterMs}));
}
