import {fitInstrumentChangeModels as incumbent} from './incumbent-d5f8523.mjs';
import {fitInstrumentChangeModels as withDecay} from './decay-cd400e5.mjs';
import {writeFile} from 'node:fs/promises';
const seed=Number(process.env.COURSE_SEED||5732901),count=Number(process.env.COURSE_COUNT||100);let state=seed;
const uniform=()=>((state=(1664525*state+1013904223)>>>0)+.5)/4294967296,normal=()=>Math.sqrt(-2*Math.log(uniform()))*Math.cos(2*Math.PI*uniform());
const result={seed,count,description:'Authored Student-t3 innovations with nominal variance0.09; no physical validation.',groups:[],courses:[]};
for(const rho of [0,.83])for(const kind of ['flat','step']){
 const summary={rho,kind,total:count,incumbent:{preferred:0,weak:0,exact:0},withDecay:{preferred:0,weak:0,exact:0}};
 for(let trial=0;trial<count;trial++){let noise=0,time=0;const samples=Array.from({length:61},(_,i)=>{const delta=.1+uniform()*.2;time+=delta;const phi=Math.pow(rho,delta/.2),chi=normal()**2+normal()**2+normal()**2,innovation=.3*normal()/Math.sqrt(chi);noise=phi*noise+Math.sqrt(1-phi*phi)*innovation;return {timeSeconds:time,value:noise+(kind==='step'&&i>=31?.9:0)};});const course={rho,kind,trial,samples,results:{}};
  for(const [name,fit] of [['incumbent',incumbent],['withDecay',withDecay]]){const value=fit(samples),strong=value.improvement>Math.log(samples.length),weak=value.improvement>0&&!strong;summary[name].preferred+=strong;summary[name].weak+=weak;summary[name].exact+=kind==='step'&&strong&&value.step.split===31;course.results[name]={improvement:value.improvement,status:strong?'preferred':weak?'weakly-separated':'alternative-preferred',split:value.step.split};}
  result.courses.push(course);
 }
 result.groups.push(summary);
}
await writeFile(new URL('./heavy-tail-'+seed+'.json',import.meta.url),JSON.stringify(result));console.log(JSON.stringify({seed,groups:result.groups},null,2));
