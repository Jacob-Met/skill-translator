import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {fitInstrumentChangeModels as actualFit} from '../src/instrument-change-models.mjs';
import {proposeInstrumentChanges as propose} from '../src/instrument-change-proposals.mjs';
const rhos=[0,.1,.2,.3,.4,.5,.6,.7,.8,.9,.95,.975,.99];
function solve(a,b){a=a.map((r,i)=>[...r,b[i]]);const n=a.length;for(let i=0;i<n;i++){let k=i;for(let j=i+1;j<n;j++)if(Math.abs(a[j][i])>Math.abs(a[k][i]))k=j;[a[k],a[i]]=[a[i],a[k]];if(Math.abs(a[i][i])<1e-14)throw Error('rank');const d=a[i][i];for(let j=i;j<=n;j++)a[i][j]/=d;for(let k=0;k<n;k++)if(k!==i){const f=a[k][i];for(let j=i;j<=n;j++)a[k][j]-=f*a[i][j];}}return a.map(r=>r[n]);}
function inv(a){const n=a.length;return Array.from({length:n},(_,j)=>solve(a,Array.from({length:n},(_,i)=>+(i===j)))).reduce((m,col,j)=>{col.forEach((x,i)=>m[i][j]=x);return m;},Array.from({length:n},()=>[]));}
function logdet(a){a=a.map(r=>[...r]);let v=0;for(let i=0;i<a.length;i++){const d=a[i][i];v+=Math.log(d);for(let k=i+1;k<a.length;k++){const f=a[k][i]/d;for(let j=i+1;j<a.length;j++)a[k][j]-=f*a[i][j];}}return v;}
function oracle(samples){const n=samples.length,origin=samples[0].value,scale=Math.max(...samples.map(s=>Math.abs(s.value-origin)))||1,y=samples.map(s=>(s.value-origin)/scale),times=samples.map(s=>s.timeSeconds),gaps=times.slice(1).map((t,i)=>t-times[i]).sort((a,b)=>a-b),median=gaps[Math.floor(gaps.length/2)],t=times.map(v=>(v-times[0])/(times.at(-1)-times[0]));
 const best=Object.fromEntries(['constant','linear','spike','periodic','step','decaying'].map(k=>[k,{score:Infinity}]));const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),freq=Array.from({length:31},(_,i)=>.5+i*.25).filter(f=>f<=n/6);
 for(const rho of rhos){const c=times.map((a,i)=>times.map((b,j)=>i===j?1:rho===0?0:rho**(Math.abs(a-b)/median))),weight=inv(c),ld=logdet(c),multiply=v=>weight.map(r=>dot(r,v));
  function offer(kind,columns,cost,meta={}){const weighted=columns.map(multiply),wy=multiply(y),normal=columns.map(col=>weighted.map(w=>dot(col,w))),rhs=columns.map(col=>dot(col,wy));let beta;try{beta=solve(normal,rhs);}catch{return;}const residual=y.map((v,i)=>v-columns.reduce((s,col,j)=>s+col[i]*beta[j],0)),sse=dot(residual,multiply(residual)),score=n*Math.log(Math.max(sse/n,1e-24))+ld+cost;
   if(score<best[kind].score)best[kind]={score,rho,...meta};}
  const ones=y.map(()=>1);offer('constant',[ones],2*Math.log(n));offer('linear',[ones,t],3*Math.log(n));
  for(let j=0;j<n;j++){offer('spike',[ones,y.map((_,i)=>+(i===j))],5*Math.log(n),{index:j});offer('decaying',[ones,times.map((time,i)=>i<j?0:i===j?1:rho===0?0:rho**((time-times[j])/median))],5*Math.log(n),{index:j});}
  for(const frequency of freq)offer('periodic',[ones,t.map(v=>Math.sin(2*Math.PI*frequency*v)),t.map(v=>Math.cos(2*Math.PI*frequency*v))],4*Math.log(n)+2*Math.log(freq.length),{frequency});
  for(let k=3;k<=n-3;k++)offer('step',[y.map((_,i)=>+(i<k)),y.map((_,i)=>+(i>=k))],5*Math.log(n),{split:k});
 }
 return best;
}
let state=793123;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)+.5)/4294967296;
let checked=0,unitChecks=0,maxError=0;const mismatches=[];
for(let test=0;test<35;test++){let time=0;const n=12+test%12,samples=Array.from({length:n},(_,i)=>({timeSeconds:time+=(2+Math.floor(random()*14))/32,value:2**20+(Math.floor(random()*128)-64)/16+Math.sin(i*.67)+(i>n/2?test%3:0)}));
 const a=actualFit(samples),o=oracle(samples);for(const kind of ['constant','linear','spike','periodic','step','decaying']){const got=kind==='step'?a.step:a.alternatives[kind],want=o[kind],error=Math.abs(got.score-want.score);maxError=Math.max(maxError,error);assert.ok(error<1e-6,JSON.stringify({test,kind,got,want,error}));assert.equal(got.rho,want.rho);checked++;}
 const binary=samples.map((s,i)=>({...s,value:Math.round(s.value*16)/16}));const shifted=binary.map(s=>({timeSeconds:1024+s.timeSeconds*8,value:-s.value*256+2**30}));const x=propose(binary,{maximumGapSeconds:1}).inquiries[0],y=propose(shifted,{maximumGapSeconds:8}).inquiries[0];assert.equal(x.status,y.status);assert.equal(x.boundary.beforeIndex,y.boundary.beforeIndex);assert.ok(Math.abs(x.fit.improvement-y.fit.improvement)<1e-7);unitChecks++;
}
for(const epsilon of [1e-5,1e-7,1e-9]){const samples=Array.from({length:17},(_,i)=>({timeSeconds:i/8,value:(i===8?1:0)+(i===14?epsilon:0)}));const a=actualFit(samples),o=oracle(samples),error=Math.abs(a.alternatives.spike.score-o.spike.score);if(error>1e-4)mismatches.push({epsilon,actual:a.alternatives.spike,oracle:o.spike,error});}
let nearMaximumError=0,nearCourses=0;const nearMismatches=[];
for(const rho of [0,.1,.7,.95,.99])for(const index of [0,1,7,15])for(const amplitude of [1,-1]){
 const n=17,times=Array.from({length:n},(_,i)=>i/8+(i>8?.0625:0)),gaps=times.slice(1).map((t,i)=>t-times[i]).sort((a,b)=>a-b),median=gaps[Math.floor(gaps.length/2)];
 const samples=times.map((time,i)=>({timeSeconds:time,value:amplitude*(i<index?0:i===index?1:rho===0?0:rho**((time-times[index])/median))+(i===13?1e-9:0)}));
 const expected=oracle(samples).decaying,got=actualFit(samples).alternatives.decaying,error=Math.abs(expected.score-got.score);nearMaximumError=Math.max(nearMaximumError,error);nearCourses++;
 if(got.rho!==expected.rho||got.index!==expected.index||error>1e-3)nearMismatches.push({rho,index,amplitude,expected,got,error});
}
assert.deepEqual(mismatches,[], 'Near-zero spike scores must agree');assert.deepEqual(nearMismatches,[], 'Near-exact decay fits must agree');
const result={nearCourses,nearMaximumError,nearMismatches,checkedModels:checked,exactBinaryUnitTimeChecks:unitChecks,maximumOrdinaryScoreError:maxError,nearSpikeResidualMismatches:mismatches,source_sha256:crypto.createHash('sha256').update(fs.readFileSync(new URL('../src/instrument-change-models.mjs',import.meta.url))).digest('hex')};if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result,null,2));
