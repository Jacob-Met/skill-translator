import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import * as candidate from '../src/task-readiness.mjs';
import {readinessSequenceFixture} from '../test/task-readiness-fixture.mjs';
import {createPrerequisiteRehearsal} from '../src/prerequisite-rehearsal.mjs';
if(!process.argv[2])throw Error('Supply the absolute path to the original task-readiness module in a separate baseline checkout.');
const baseline=await import(pathToFileURL(resolve(process.argv[2])).href);
const source=readinessSequenceFixture();
source.steps=Array.from({length:24},(_,i)=>({...source.steps[0],id:`s${i}`,title:`Step ${i}`}));
const edges=[];for(let i=0;i<24;i++)for(let j=i+1;j<24;j++)edges.push({before:`s${i}`,after:`s${j}`,reason:'Authored dependency'});
const study=baseline.createReadiness(source,createPrerequisiteRehearsal(source,edges),source.steps.map(s=>({stepId:s.id,checks:[{id:'done',prompt:'Declared result',basis:'Authored stress control'}]})));
const observe=(i,value='pass')=>({type:'observe',stepId:`s${i}`,checkId:'done',value,note:'Authored observation',evidenceClass:'authored-example'});
const choose=i=>({type:'choose',stepId:`s${i}`,prediction:'ready',reason:'Authored choice'});
const cases={choices:[...source.steps.map((_,i)=>observe(i)),...Array.from({length:476},()=>choose(23))],revisions:Array.from({length:500},(_,i)=>i%2?choose(i%24):observe(i%24,i%3?'pass':'unknown'))};
for(const [name,events] of Object.entries(cases)){
 measure(name,source,{...study,events});
}
const ordinarySource=readinessSequenceFixture();
const ordinaryStudy=baseline.createReadiness(ordinarySource,createPrerequisiteRehearsal(ordinarySource,[{before:'prepare',after:'align',reason:'Original support'}]),ordinarySource.steps.map(s=>({stepId:s.id,checks:[{id:'done',prompt:'Declared result',basis:'Authored ordinary control'}]})));
measure('ordinary-empty',ordinarySource,ordinaryStudy);
measure('ordinary-12-events',ordinarySource,{...ordinaryStudy,events:Array.from({length:12},(_,i)=>i%3?{...choose(0),stepId:'align'}:{...observe(0),stepId:'prepare'})});
function measure(name,source,input){
 assert.deepEqual(candidate.readinessFindings(source,input),baseline.readinessFindings(source,input));
 assert.deepEqual(candidate.importReadiness(source,input),baseline.importReadiness(source,input));
 const times={baseline:[],candidate:[]},apis={baseline,candidate};
 for(let i=0;i<8;i++)for(const api of Object.values(apis))api.readinessFindings(source,input);
 for(let i=0;i<40;i++)for(const key of i%2?['baseline','candidate']:['candidate','baseline']){
  const start=performance.now();apis[key].readinessFindings(source,input);times[key].push(performance.now()-start);
 }
 const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
 const beforeMs=median(times.baseline),afterMs=median(times.candidate);
 console.log(JSON.stringify({name,node:process.version,steps:source.steps.length,edges:input.prerequisites.dependencies.length,events:input.events.length,samples:40,beforeMs,afterMs,speedup:beforeMs/afterMs}));
}
