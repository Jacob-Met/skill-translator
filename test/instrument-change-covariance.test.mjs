import assert from 'node:assert/strict';
import test from 'node:test';
import {fitInstrumentChangeModels as fitOU} from '../src/instrument-change-models.mjs';
test('near-perfect spike score and covariance use direct residuals instead of cancelled sufficient statistics',()=>{
 const samples=Array.from({length:17},(_,i)=>({timeSeconds:i/8,value:i===8?1:i===14?1e-9:0})),actual=fitOU(samples),mean=1e-9/16,sse=15*mean*mean+(1e-9-mean)**2,expected=17*Math.log(sse/17)+5*Math.log(17);
 assert.equal(actual.alternatives.spike.rho,0);assert.equal(actual.alternatives.spike.index,8);assert.ok(Math.abs(actual.alternatives.spike.score-expected)<1e-9);
});
function inverse(matrix){const n=matrix.length,a=matrix.map((r,i)=>[...r,...Array.from({length:n},(_,j)=>+(i===j))]);let logdet=0;
 for(let i=0;i<n;i++){const pivot=a[i][i];assert.ok(pivot>0);logdet+=Math.log(pivot);for(let j=0;j<2*n;j++)a[i][j]/=pivot;for(let k=0;k<n;k++)if(k!==i){const f=a[k][i];for(let j=0;j<2*n;j++)a[k][j]-=f*a[i][j];}}return {value:a.map(r=>r.slice(n)),logdet};}
function oracle(samples){const n=samples.length,origin=samples[0].value,scale=Math.max(...samples.map(s=>Math.abs(s.value-origin)))||1,y=samples.map(s=>(s.value-origin)/scale),gaps=samples.slice(1).map((s,i)=>s.timeSeconds-samples[i].timeSeconds).sort((a,b)=>a-b),median=gaps[Math.floor(gaps.length/2)];let constant={score:Infinity},step={score:Infinity};
 for(const rho of [0,.1,.2,.3,.4,.5,.6,.7,.8,.9,.95,.975,.99]){const covariance=samples.map((a,i)=>samples.map((b,j)=>i===j?1:rho===0?0:Math.pow(rho,Math.abs(a.timeSeconds-b.timeSeconds)/median))),{value:inv,logdet}=inverse(covariance),z=inv.map(row=>row.reduce((s,v,j)=>s+v*y[j],0)),sum=a=>a.reduce((s,v)=>s+v,0),score=(means,p)=>{const r=y.map((v,i)=>v-means[i]);let sse=0;for(let i=0;i<n;i++)for(let j=0;j<n;j++)sse+=r[i]*inv[i][j]*r[j];return n*Math.log(Math.max(sse/n,1e-24))+logdet+p*Math.log(n);},mu=sum(z)/sum(inv.flat()),nullScore=score(y.map(()=>mu),2);if(nullScore<constant.score)constant={score:nullScore,rho};
  for(let k=3;k<=n-3;k++){let a=0,b=0,c=0;for(let i=0;i<n;i++)for(let j=0;j<n;j++){if(i<k&&j<k)a+=inv[i][j];else if(i>=k&&j>=k)b+=inv[i][j];else if(i<k)c+=inv[i][j];}const d=sum(z.slice(0,k)),e=sum(z.slice(k)),det=a*b-c*c,left=(d*b-e*c)/det,right=(e*a-d*c)/det,s=score(y.map((_,i)=>i<k?left:right),5);if(s<step.score)step={score:s,rho,split:k};}
 }return {constant,step};}
test('independent dense covariance inverse agrees with the optimized irregular-time likelihood',()=>{
let state=17893;const random=()=>((state=(1664525*state+1013904223)>>>0)+.5)/4294967296;
for(let test=0;test<100;test++){let time=0;const samples=Array.from({length:9+test%9},(_,i)=>({timeSeconds:time+=.05+random()*.7,value:80+random()+Math.sin(i*.61)+(i>7?test%3:0)})),expected=oracle(samples),actual=fitOU(samples);assert.equal(actual.constant.rho,expected.constant.rho);assert.equal(actual.step.rho,expected.step.rho);assert.equal(actual.step.split,expected.step.split);assert.ok(Math.abs(actual.constant.score-expected.constant.score)<1e-7);assert.ok(Math.abs(actual.step.score-expected.step.score)<1e-7);}
});
