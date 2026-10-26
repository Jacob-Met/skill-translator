import {writeFile,mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {inspectSharedMotionGroups} from '../src/shared-motion-groups.mjs';
import {motionStudy,turn} from '../test/helpers/shared-motion-fixture.mjs';
const out=process.argv[2]||'/tmp/shared-motion-oracle.json';
let state=572387;const random=()=>((state=(1664525*state+1013904223)>>>0)/2**32);
const cases=[];
for(let index=0;index<24;index++){
 const base=Array.from({length:6},(_,i)=>[25+(i<3?0:140)+random()*55,30+random()*40]);
 const groups=[base.slice(0,3),base.slice(3)],frames=[base];
 for(let j=1;j<4;j++){let f=groups.flatMap((points,i)=>turn(points,(random()-.5)*130,(random()-.5)*22,(random()-.5)*22));
  if(index%4===1)f=f.map(p=>[p[0]+(random()-.5)*.08,p[1]+(random()-.5)*.08]);
  if(index%4===2)f[2]=[f[2][0]+j*4,f[2][1]-j*2];
  if(index%4===3)f=f.map(([x,y])=>[260-x,y]);
  frames.push(f);
 }
 const threshold=index%4===1?.08:.0001;cases.push({name:'frozen-authored-'+index,frames,threshold});
}
const frozen=JSON.stringify(cases);
let elapsed=0;
for(const c of cases){const start=performance.now();c.result=inspectSharedMotionGroups(motionStudy(c.frames,c.threshold));elapsed+=performance.now()-start;}
await writeFile(out,JSON.stringify({generatorSeed:572387,frozenInputSha256:(await import('node:crypto')).createHash('sha256').update(frozen).digest('hex'),cases},null,2)+'\n');
console.log(JSON.stringify({file:out,cases:cases.length,elapsedMs:elapsed,manualGroupLabels:0,limitation:'Authored source geometry; not measured physical demonstrations.'}));
