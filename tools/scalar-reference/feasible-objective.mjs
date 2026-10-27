import assert from 'node:assert/strict';
export const RHOS=[0,.1,.2,.3,.4,.5,.6,.7,.8,.9,.95,.975,.99];
export const SCORE_TOLERANCE=1e-7;
export const finiteJSON=value=>JSON.stringify(value,(_k,v)=>
  typeof v==='number'&&!Number.isFinite(v)?String(v):v,2);

// Exact rational residuals over the stored doubles. No regression, rank
// threshold or production fitting helper participates in this reference.
function gcd(a,b){a=a<0n?-a:a;b=b<0n?-b:b;while(b!==0n)[a,b]=[b,a%b];return a;}
function rat(n,d=1n){assert.notEqual(d,0n);if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return {n:n/g,d:d/g};}
const add=(a,b)=>rat(a.n*b.d+b.n*a.d,a.d*b.d);
const sub=(a,b)=>rat(a.n*b.d-b.n*a.d,a.d*b.d);
const mul=(a,b)=>rat(a.n*b.n,a.d*b.d);
const div=(a,b)=>rat(a.n*b.d,a.d*b.n);
const ZERO=rat(0n),ONE=rat(1n),view=new DataView(new ArrayBuffer(8));
function exact(value){
  assert.ok(Number.isFinite(value));
  if(value===0)return ZERO;
  view.setFloat64(0,value,false);
  const bits=view.getBigUint64(0,false),negative=(bits>>63n)!==0n;
  const exp=Number((bits>>52n)&0x7ffn),fraction=bits&((1n<<52n)-1n);
  let significand=exp===0?fraction:(1n<<52n)|fraction;
  const power=exp===0?-1074:exp-1023-52;
  if(negative)significand=-significand;
  return power>=0?rat(significand<<BigInt(power)):rat(significand,1n<<BigInt(-power));
}
function number(value){
  const n=Number(value.n),d=Number(value.d);
  // Deliberate fixture envelope, not a general arbitrary-range converter.
  assert.ok(Number.isFinite(n)&&Number.isFinite(d));
  const result=n/d;assert.ok(Number.isFinite(result));return result;
}
export function normalize(samples){
  const first=samples[0].timeSeconds,span=samples.at(-1).timeSeconds-first;
  assert.ok(span>0);
  const origin=samples[0].value,scale=Math.max(...samples.map(s=>Math.abs(s.value-origin)))||1;
  const t=samples.map(s=>(s.timeSeconds-first)/span),y=samples.map(s=>(s.value-origin)/scale);
  // Covariance uses ORIGINAL timestamp differences, not differences of t.
  const gaps=samples.slice(1).map((s,i)=>s.timeSeconds-samples[i].timeSeconds);
  assert.ok(gaps.every(g=>g>0));
  const sorted=[...gaps].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];
  return {t,y,origin,scale,gaps,median};
}
function residuals(y,columns,coefficients){
  assert.equal(columns.length,coefficients.length);
  assert.ok(columns.every(c=>c.length===y.length));
  return y.map((v,i)=>{
    let predicted=ZERO;
    for(let j=0;j<columns.length;j++)predicted=add(predicted,mul(exact(columns[j][i]),coefficients[j]));
    return number(sub(exact(v),predicted));
  });
}
export function candidateScore(data,r,rho,p,extraPenalty=0){
  let sse=0,logdet=0;
  for(let i=0;i<r.length;i++){
    const phi=i===0||rho===0?0:Math.pow(rho,data.gaps[i-1]/data.median);
    const variance=1-phi*phi;assert.ok(variance>0);
    const sd=Math.sqrt(variance),w=(r[i]-(i?phi*r[i-1]:0))/sd;
    sse+=w*w;logdet+=Math.log(sd*sd);
  }
  const n=r.length,meanSquare=sse/n,residualTerm=n*Math.log(Math.max(meanSquare,1e-24));
  const penalty=p*Math.log(n)+extraPenalty,score=residualTerm+logdet+penalty;
  assert.ok(Number.isFinite(score));
  return {score,rho,sse,floorActive:meanSquare<=1e-24,residualTerm,logdet,penalty};
}
function bound(data,r,p,extra=0){
  const candidates=RHOS.map(rho=>candidateScore(data,r,rho,p,extra));
  return {residuals:r,best:candidates.reduce((a,b)=>b.score<a.score?b:a),candidates};
}
function rows(times,values){return times.map((timeSeconds,i)=>({timeSeconds,value:values[i]}));}
function periodicBound(samples,signalScale=1){
  const d=normalize(samples),freqs=Array.from({length:31},(_,i)=>.5+i*.25).filter(f=>f<=samples.length/6);
  assert.ok(freqs.includes(1));
  const c=d.t.map(t=>Math.cos(2*Math.PI*1*t)),ones=c.map(()=>1),s=exact(d.scale);
  const r=residuals(d.y,[ones,c],[div(sub(ZERO,exact(d.origin)),s),div(exact(signalScale),s)]);
  return bound(d,r,4,2*Math.log(freqs.length));
}
export function makeWitnessCases(){
  const cases=[],k=[0,1,3,4,7,11,16,22,29],times=k.map(v=>8192+8*v);
  for(const family of ['constant','linear','spike']){
    const values=family==='constant'?k.map(()=>7):family==='linear'?[...k]:k.map((_v,i)=>i===3?1:0);
    const samples=rows(times,values),d=normalize(samples);
    const column=family==='constant'?k.map(()=>1):family==='linear'?d.t:k.map((_v,i)=>i===3?1:0);
    const r=residuals(d.y,[column],[family==='constant'?ZERO:ONE]);
    assert.ok(r.every(v=>v===0));
    cases.push({id:'exact-'+family,family,samples,maximumGapSeconds:64,
      witness:bound(d,r,{constant:2,linear:3,spike:5}[family])});
  }
  const st=[0,1,2,2.0001,3,4,5,6,7],ss=rows(st,st.map((_v,i)=>i<3?0:1)),sd=normalize(ss);
  const sr=residuals(sd.y,[st.map((_v,i)=>i<3?0:1)],[ONE]);
  assert.ok(sr.every(v=>v===0));
  cases.push({id:'retained-exact-step',family:'step',samples:ss,maximumGapSeconds:2,witness:bound(sd,sr,5)});
  const e=1e-8,ct=[0,e,2*e,1-2*e,1-e,1],cs=rows(ct,ct.map(t=>Math.cos(2*Math.PI*t)));
  const cw=periodicBound(cs);
  assert.ok(cw.best.score<cw.candidates.find(x=>x.rho===0).score-SCORE_TOLERANCE);
  cases.push({id:'endpoint-cosine',family:'periodic',samples:cs,maximumGapSeconds:1,witness:cw});
  const ticks=[0,1,2,3,49999998,49999999,50000000,50000001,99999997,99999998,99999999,100000000];
  const cosine=ticks.map(t=>Math.cos(2*Math.PI*(t/100000000)));
  const controls=[
    ['three-cluster-base',rows(ticks.map(t=>t*2**-18),cosine),1],
    ['three-cluster-shift',rows(ticks.map(t=>8192+t*2**-18),cosine),1],
    ['three-cluster-units',rows(ticks.map(t=>8192+t*2**-15),cosine.map(v=>8*v)),8]
  ];
  const base=normalize(controls[0][1]);
  for(const [id,samples,signalScale] of controls){
    const d=normalize(samples);
    assert.deepEqual(d.t,base.t,id+': normalized time');
    assert.deepEqual(d.y,base.y,id+': normalized values');
    assert.deepEqual(d.gaps.map(g=>g/d.median),base.gaps.map(g=>g/base.median),id+': covariance');
    cases.push({id,family:'periodic',samples,maximumGapSeconds:2048,witness:periodicBound(samples,signalScale)});
  }
  return cases;
}
export function compareWitness(item,result){
  const actual=item.family==='step'?result.step:result.alternatives[item.family];
  return {id:item.id,family:item.family,actual,bound:item.witness.best,
    violation:!Number.isFinite(actual.score)||actual.score>item.witness.best.score+SCORE_TOLERANCE,
    excessScore:Number.isFinite(actual.score)?actual.score-item.witness.best.score:null};
}

/** Explicit normalized means; split is the first right index. No fitting. */
export function normalizedStepWitness(samples,{split,left,right,rho}){
  assert.ok(Number.isInteger(split)&&split>=3&&split<=samples.length-3);
  assert.ok(Number.isFinite(left)&&Number.isFinite(right));
  assert.ok(RHOS.includes(rho));
  const data=normalize(samples),l=exact(left),r=exact(right);
  const residual=data.y.map((value,i)=>number(sub(exact(value),i<split?l:r)));
  const scored=candidateScore(data,residual,rho,5);
  return {residuals:residual,best:scored,candidates:[scored]};
}
