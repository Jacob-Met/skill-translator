// Independent reference for the frozen #343 step-screen arithmetic.
// The exhaustive path uses the SAME coefficients as the published baseline.
// It changes only whether every candidate receives direct residual scoring.
export const RHOS = [0,.1,.2,.3,.4,.5,.6,.7,.8,.9,.95,.975,.99];
export const BASELINE_MODEL_BLOB = '7ac7c9030b692bea794ee50a2b4b726ce44ef2d3';

export function auditStepScreen(samples) {
  const n=samples.length,origin=samples[0].value;
  const scale=Math.max(...samples.map(s=>Math.abs(s.value-origin)))||1;
  const y=samples.map(s=>(s.value-origin)/scale);
  const gaps=samples.slice(1).map((s,i)=>s.timeSeconds-samples[i].timeSeconds);
  const sorted=[...gaps].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];
  let constant={score:Infinity},screened={score:Infinity},exhaustive={score:Infinity};
  const perRho=[];
  for(const rho of RHOS) {
    const phi=[0,...gaps.map(g=>rho===0?0:Math.pow(rho,g/median))];
    const sd=phi.map(p=>Math.sqrt(1-p*p));
    const z=y.map((v,i)=>(v-(i?phi[i]*y[i-1]:0))/sd[i]);
    const basis=phi.map((p,i)=>i?(1-p)/sd[i]:1);
    const prefixA=[0],prefixB=[0]; let totalZ=0,logdet=0;
    for(let i=0;i<n;i++) {
      prefixA.push(prefixA[i]+basis[i]**2);
      prefixB.push(prefixB[i]+basis[i]*z[i]);
      totalZ+=z[i]**2; logdet+=Math.log(sd[i]**2);
    }
    const score=(sse,p)=>n*Math.log(Math.max(sse/n,1e-24))+logdet+p*Math.log(n);
    const mean=prefixB[n]/prefixA[n];
    const nullSSE=z.reduce((s,v,i)=>s+(v-mean*basis[i])**2,0);
    const nullScore=score(nullSSE,2);
    if(nullScore<constant.score) constant={score:nullScore,rho,mean:origin+mean*scale};
    const report={rho,candidates:0,verified:0,skipped:0,finite:0,nonfinite:0,
      skippedBetterAtTheTime:0,bestDirect:null,bestSkipped:null};
    for(let k=3;k<=n-3;k++) {
      const inv=1/sd[k]**2,a=prefixA[k]+phi[k]**2*inv;
      const b=prefixA[n]-prefixA[k+1]+inv,c=-phi[k]*inv;
      const d=prefixB[k]-phi[k]*z[k]/sd[k];
      const e=prefixB[n]-prefixB[k+1]+z[k]/sd[k],det=a*b-c*c;
      const left=(d*b-e*c)/det,right=(e*a-d*c)/det;
      const sse=Math.max(0,totalZ-left*d-right*e),roughScore=score(sse,5);
      const incumbent=screened.score;
      const threshold=64*Number.EPSILON*(Math.abs(totalZ)+Math.abs(left*d)+Math.abs(right*e));
      const guard=totalZ>0&&sse<=threshold;
      const wouldVerify=roughScore<incumbent||guard;
      const directSSE=z.reduce((sum,v,i)=>{
        const current=i<k?left:right,previous=i-1<k?left:right;
        const expected=(current-(i?phi[i]*previous:0))/sd[i];
        return sum+(v-expected)**2;
      },0);
      const verifiedScore=score(directSSE,5);
      const candidate={score:verifiedScore,rho,split:k,left:origin+left*scale,
        right:origin+right*scale,normalizedLeft:left,normalizedRight:right,
        directSSE,roughSSE:sse,roughScore};
      report.candidates++;
      if(Number.isFinite(verifiedScore)) {
        report.finite++;
        if(!report.bestDirect||verifiedScore<report.bestDirect.score) report.bestDirect={...candidate};
        if(verifiedScore<exhaustive.score) exhaustive={...candidate};
      } else report.nonfinite++;
      if(wouldVerify) {
        report.verified++;
        // Deliberately preserve the original strict comparison, without a
        // newly introduced finite-value filter on this simulated path.
        if(verifiedScore<screened.score) screened={...candidate};
      } else {
        report.skipped++;
        if(Number.isFinite(verifiedScore)&&verifiedScore<incumbent) report.skippedBetterAtTheTime++;
        if(Number.isFinite(verifiedScore)&&(!report.bestSkipped||verifiedScore<report.bestSkipped.score)) {
          report.bestSkipped={...candidate,incumbentAtSkip:incumbent,
            improvementAtSkip:incumbent-verifiedScore,roughMinusDirectSSE:sse-directSSE,
            cancellationThreshold:threshold,totalZ,det,a,b,c,d,e,guard,wouldVerify};
        }
      }
    }
    perRho.push(report);
  }
  const finite=Number.isFinite(screened.score)&&Number.isFinite(exhaustive.score);
  return {n,origin,scale,medianGap:median,constant,screened,exhaustive,
    screenedProposed:screened.score<constant.score,
    exhaustiveProposed:exhaustive.score<constant.score,
    missedGlobalWinner:exhaustive.score<screened.score,
    scoreGap:finite?screened.score-exhaustive.score:null,perRho};
}

export function makeRng(seed) {
  let state=seed>>>0;
  return ()=>{
    state=(state+0x6D2B79F5)>>>0;
    let t=state;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}

// Version 1: 224 small cases. A 1000-second long gap remains inside the
// ordinary public adjacency limit; public admission is verified by the runner.
export function* generateStepScreenCases(seed=0x50A17EED,repetitions=2) {
  const random=makeRng(seed);
  const lengths=[6,7,12,24,33,64,65];
  const clocks=['regular','alternating','tiny-gap','large-gap'];
  const signals=['near-level','noisy-step','drift','near-tie'];
  let index=0;
  for(let repetition=0;repetition<repetitions;repetition++)
    for(const n of lengths) for(const clock of clocks) for(const signal of signals) {
      const split=3+Math.floor(random()*(n-5)),times=[0];
      for(let i=1;i<n;i++) {
        const gap=clock==='regular'?1:clock==='alternating'?(i%2?1e-4:1):
          clock==='tiny-gap'?(i===split?1e-8:.5+random()):(i===split?1000:.5+random());
        times.push(times[i-1]+gap);
      }
      const noise=Array.from({length:n},()=>2*random()-1);
      const offset=repetition%2?2**20:0,amplitude=repetition%2?2**-10:1;
      const epsilon=10**(-3-Math.floor(random()*10));
      const samples=times.map((timeSeconds,i)=>{
        let value;
        if(signal==='near-level') {
          value=epsilon*noise[i]+(i>=split?epsilon*.5:0);
          if(i===n-1)value+=1;
        } else if(signal==='noisy-step') value=(i>=split?1:0)+epsilon*noise[i];
        else if(signal==='drift') value=i/(n-1)+epsilon*noise[i]+(i>=split?epsilon:0);
        else {
          value=(i<split?0:1)+epsilon*noise[i];
          if(i===split)value=.5+epsilon*noise[i];
        }
        return {timeSeconds,value:offset+amplitude*value};
      });
      yield {id:'step-screen-'+(seed>>>0)+'-'+index++,seed:seed>>>0,repetition,n,
        clock,signal,plantedSplit:split,epsilon,maximumGapSeconds:3600,samples};
    }
}
