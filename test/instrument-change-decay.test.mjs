import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {fitInstrumentChangeModels} from '../src/instrument-change-models.mjs';
import {proposeInstrumentChanges} from '../src/instrument-change-proposals.mjs';
function inverse(matrix){const n=matrix.length,a=matrix.map((r,i)=>[...r,...Array.from({length:n},(_,j)=>+(i===j))]);let logdet=0;for(let i=0;i<n;i++){const pivot=a[i][i];assert.ok(pivot>0);logdet+=Math.log(pivot);for(let j=0;j<2*n;j++)a[i][j]/=pivot;for(let k=0;k<n;k++)if(k!==i){const f=a[k][i];for(let j=0;j<2*n;j++)a[k][j]-=f*a[i][j];}}return {value:a.map(r=>r.slice(n)),logdet};}
function oracle(samples){const n=samples.length,origin=samples[0].value,scale=Math.max(...samples.map(s=>Math.abs(s.value-origin)))||1,y=samples.map(s=>(s.value-origin)/scale),gaps=samples.slice(1).map((s,i)=>s.timeSeconds-samples[i].timeSeconds).sort((a,b)=>a-b),median=gaps[Math.floor(gaps.length/2)];let best={score:Infinity};
 for(const rho of [0,.1,.2,.3,.4,.5,.6,.7,.8,.9,.95,.975,.99]){const covariance=samples.map((a,i)=>samples.map((b,j)=>i===j?1:rho===0?0:Math.pow(rho,Math.abs(a.timeSeconds-b.timeSeconds)/median))),{value:inv,logdet}=inverse(covariance),dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*inv[i].reduce((s,v,j)=>s+v*b[j],0),0),ones=y.map(()=>1),a=dot(ones,ones),d=dot(ones,y);
  for(let index=0;index<n;index++){const shape=samples.map((s,i)=>i<index?0:i===index?1:rho===0?0:Math.pow(rho,(s.timeSeconds-samples[index].timeSeconds)/median)),b=dot(shape,shape),c=dot(ones,shape),e=dot(shape,y),det=a*b-c*c,mean=(d*b-e*c)/det,amplitude=(e*a-d*c)/det,residual=y.map((v,i)=>v-mean-amplitude*shape[i]),sse=dot(residual,residual),score=n*Math.log(Math.max(sse/n,1e-24))+logdet+5*Math.log(n);if(score<best.score)best={score,rho,index};}
 }return best;}
test('decaying excursion agrees with independent dense GLS including a near-perfect residual',()=>{
let state=628194;const uniform=()=>((state=(1664525*state+1013904223)>>>0)+.5)/4294967296;let maxError=0;
for(let trial=0;trial<50;trial++){let time=0;const samples=Array.from({length:9+trial%9},(_,i)=>({timeSeconds:time+=.07+uniform()*.6,value:-7+uniform()+Math.sin(i*.7)+(i>5?Math.pow(.8,i-6):0)})),expected=oracle(samples),actual=fitInstrumentChangeModels(samples).alternatives.decaying;assert.equal(actual.rho,expected.rho);assert.equal(actual.index,expected.index);const error=Math.abs(actual.score-expected.score);maxError=Math.max(maxError,error);assert.ok(error<1e-7);}
const near=Array.from({length:17},(_,i)=>({timeSeconds:i/8,value:i<7?0:Math.pow(.7,i-7)+(i===14?1e-9:0)})),expected=oracle(near),actual=fitInstrumentChangeModels(near).alternatives.decaying;assert.equal(actual.rho,expected.rho);assert.equal(actual.index,expected.index);assert.ok(Math.abs(actual.score-expected.score)<1e-4);});

test('slow decay can keep a constructed step weakly separated without consulting its construction label',()=>{
 const raw=JSON.parse(readFileSync(new URL('./fixtures/instrument-slow-decay-ambiguity.json',import.meta.url),'utf8'));const q=proposeInstrumentChanges(raw.samples,{maximumGapSeconds:.32}).inquiries[0];assert.equal(q.status,'weakly-separated');assert.ok(q.fit.improvement>0&&q.fit.improvement<=q.oneCoefficientCost);assert.ok(Number.isFinite(q.fit.alternatives.decaying.score));
});
test('an exact decaying excursion is an alternative to a lasting step, including signed binary unit and time transforms',()=>{
 const samples=Array.from({length:21},(_,i)=>({timeSeconds:i/8,value:3+(i<6?0:2*Math.pow(.5,i-6))})),q=proposeInstrumentChanges(samples,{maximumGapSeconds:.2}).inquiries[0],transformed=samples.map(s=>({timeSeconds:16+s.timeSeconds*4,value:128-8*s.value})),r=proposeInstrumentChanges(transformed,{maximumGapSeconds:.8}).inquiries[0];assert.equal(q.status,'alternative-preferred');assert.equal(r.status,q.status);assert.equal(q.fit.alternatives.decaying.rho,.5);assert.equal(q.fit.alternatives.decaying.index,6);assert.equal(r.fit.alternatives.decaying.rho,.5);assert.equal(r.fit.alternatives.decaying.index,6);assert.ok(Math.abs(r.fit.alternatives.decaying.score-q.fit.alternatives.decaying.score)<1e-8);
});
