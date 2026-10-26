import {fitInstrumentChangeModels as incumbent} from './incumbent-d5f8523.mjs';
import {fitInstrumentChangeModels as withDecay} from './decay-cd400e5.mjs';
import {writeFile} from 'node:fs/promises';
let state=19837265;const uniform=()=>((state=(1664525*state+1013904223)>>>0)+.5)/4294967296,normal=()=>Math.sqrt(-2*Math.log(uniform()))*Math.cos(2*Math.PI*uniform());
const result={seed:state,description:'Independent authored course with unfamiliar correlations, lengths, signed steps, irregular intervals and noise shapes. Not physical validation.',groups:[],courses:[]};
for(const distribution of ['gaussian','student-t3'])for(const rho of [0,.62,.91])for(const kind of ['flat','step']){
 const summary={distribution,rho,kind,total:80,incumbent:{preferred:0,weak:0,exact:0},withDecay:{preferred:0,weak:0,exact:0}};
 for(let trial=0;trial<80;trial++){const n=48+trial%45,split=Math.floor(n*(.34+(trial%4)*.08)),height=(trial%2?-.7:1.1);let noise=0,time=0;
  const samples=Array.from({length:n},(_,i)=>{const delta=.04+uniform()*.27;time+=delta;const phi=rho===0?0:Math.pow(rho,delta/.175),innovation=distribution==='gaussian'?.3*normal():.3*normal()/Math.sqrt(normal()**2+normal()**2+normal()**2);noise=phi*noise+Math.sqrt(1-phi*phi)*innovation;return {timeSeconds:time,value:19+noise+(kind==='step'&&i>=split?height:0)};});
  const course={distribution,rho,kind,trial,split,height,samples,results:{}};for(const [name,fit] of [['incumbent',incumbent],['withDecay',withDecay]]){const value=fit(samples),strong=value.improvement>Math.log(n),weak=value.improvement>0&&!strong;summary[name].preferred+=strong;summary[name].weak+=weak;summary[name].exact+=kind==='step'&&strong&&value.step.split===split;course.results[name]={improvement:value.improvement,status:strong?'preferred':weak?'weakly-separated':'alternative-preferred',split:value.step.split};}result.courses.push(course);
 }
 result.groups.push(summary);
}
await writeFile(new URL('./decay-heldback-19837265.json',import.meta.url),JSON.stringify(result));console.log(JSON.stringify({seed:result.seed,groups:result.groups},null,2));
