import {writeFile} from 'node:fs/promises';
import {motionSequence,turn} from '../test/helpers/shared-motion-fixture.mjs';
import {createSequenceDiscovery} from '../src/sequence-discovery.mjs';
import {inspectSharedMotionSpans} from '../src/shared-motion-spans.mjs';
let state=391572;const random=()=>((state=(1664525*state+1013904223)>>>0)/4294967296);
const cases=[];
for(let c=0;c<24;c++){
 const initial=Array.from({length:6},(_,i)=>[25+(i<3?0:140)+random()*40,35+random()*65]);
 const frames=Array.from({length:5},(_,t)=>[
  ...turn(initial.slice(0,3),t*(8+random()*25),t*2,t*3),
  ...turn(initial.slice(3),-t*(12+random()*15),-t*2,t*2)]);
 for(let t=3;t<5;t++){frames[t][2][0]+=7+c%4;frames[t][2][1]-=3;}
 const threshold=c%4===0?.18:.01;
 if(c%4===0)for(const frame of frames)for(const point of frame){point[0]+=(random()-.5)*.1;point[1]+=(random()-.5)*.1;}
 if(c%6===0)frames[3]=frames[2].map(([x,y])=>[300-x,y]);
 if(c%7===0)frames[4]=frames[4].map((p,i)=>i<3?[80,80]:p);
 const sequence=motionSequence({frames});
 if(c%5===0){delete sequence.moments[2].calibratedTask;frames[2]=null;}
 if(c%5===1){sequence.moments[2].calibratedTask.landmarks.splice(1,1);frames[2][1]=null;}
 const raw=createSequenceDiscovery(sequence,{correspondenceConfirmed:true,commonFixedPlaneConfirmed:true,basis:'Seeded authored span control; no interval labels supplied',evidenceClass:'authored-example',deviationMm:threshold});
 const result=inspectSharedMotionSpans(raw);
 cases.push({name:'held-aside-span-'+c,frames,threshold,result:{spans:result.spans,counts:result.counts,work:result.work}});
}
const packet={generator:'LCG seed391572,24 authored five-moment cases; held aside from native fixture geometry',cases};
await writeFile(process.argv[2],JSON.stringify(packet,null,2)+'\n');
console.log(JSON.stringify({cases:cases.length,spanAlternatives:cases.reduce((n,c)=>n+c.result.spans.length,0),sourceFits:cases.reduce((n,c)=>n+c.result.work.fits,0)}));
