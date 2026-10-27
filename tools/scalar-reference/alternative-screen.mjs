// Same-coefficient screening diagnostic for unchanged spike/decaying formulas.
export const RHOS=[0,.1,.2,.3,.4,.5,.6,.7,.8,.9,.95,.975,.99];
export function auditAlternativeScreens(samples){
 const n=samples.length,origin=samples[0].value,scale=Math.max(...samples.map(s=>Math.abs(s.value-origin)))||1;
 const y=samples.map(s=>(s.value-origin)/scale),gaps=samples.slice(1).map((s,i)=>s.timeSeconds-samples[i].timeSeconds);
 const sorted=[...gaps].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];
 const families=Object.fromEntries(['spike','decaying'].map(name=>[name,{screened:{score:Infinity},exhaustive:{score:Infinity},perRho:[]}]));
 for(const rho of RHOS){
  const phi=[0,...gaps.map(g=>rho===0?0:Math.pow(rho,g/median))],sd=phi.map(p=>Math.sqrt(1-p*p));
  const transform=v=>v.map((x,i)=>(x-(i?phi[i]*v[i-1]:0))/sd[i]),z=transform(y),basis=transform(y.map(()=>1));
  const logdet=sd.reduce((s,v)=>s+Math.log(v*v),0),score=sse=>n*Math.log(Math.max(sse/n,1e-24))+logdet+5*Math.log(n);
  const a=basis.reduce((s,v)=>s+v*v,0),d=basis.reduce((s,v,i)=>s+v*z[i],0),zz=z.reduce((s,v)=>s+v*v,0);
  for(const name of ['spike','decaying']){
   const family=families[name],report={rho,attempted:0,determinantRejected:0,finite:0,nonfinite:0,verified:0,skipped:0,guardCount:0,skippedBetter:0,bestSkipped:null};
   for(let j=0;j<n;j++){
    report.attempted++;
    let b,c,e,det,left,right;
    if(name==='spike'){
     left=1/sd[j];right=j<n-1?-phi[j+1]/sd[j+1]:0;b=left*left+right*right;
     c=left*basis[j]+(j<n-1?right*basis[j+1]:0);e=left*z[j]+(j<n-1?right*z[j+1]:0);det=a*b-c*c;
    }else{c=basis[j];e=z[j];det=a-c*c;}
    if(det<=0){report.determinantRejected++;continue;}
    const mu=name==='spike'?(d*b-e*c)/det:(d-e*c)/det,amp=(e*a-d*c)/det;
    const rough=Math.max(0,zz-mu*d-amp*e),roughScore=score(rough),incumbent=family.screened.score;
    const threshold=64*Number.EPSILON*(Math.abs(zz)+Math.abs(mu*d)+Math.abs(amp*e));
    const guard=zz>0&&rough<=threshold,wouldVerify=roughScore<incumbent||guard;
    const direct=z.reduce((sum,v,i)=>{
     if(name==='spike'){const impulse=i===j?left:i===j+1?right:0;return sum+(v-mu*basis[i]-amp*impulse)**2;}
     return sum+(v-mu*basis[i]-(i===j?amp:0))**2;
    },0);
    const directScore=score(direct),candidate={score:directScore,rho,index:j,mu,amp,directSSE:direct,roughSSE:rough,roughScore};
    if(guard)report.guardCount++;
    if(Number.isFinite(directScore)){report.finite++;if(directScore<family.exhaustive.score)family.exhaustive={...candidate};}
    else report.nonfinite++;
    if(wouldVerify){report.verified++;if(directScore<family.screened.score)family.screened={...candidate};}
    else{
     report.skipped++;
     if(Number.isFinite(directScore)&&directScore<incumbent)report.skippedBetter++;
     if(Number.isFinite(directScore)&&(!report.bestSkipped||directScore<report.bestSkipped.score))
      report.bestSkipped={...candidate,incumbentAtSkip:incumbent,improvementAtSkip:incumbent-directScore,
       cancellationThreshold:threshold,guard,wouldVerify,roughFloorActive:rough/n<=1e-24,directFloorActive:direct/n<=1e-24,
       zz,a,c,d,e,det,...(name==='spike'?{b,left,right}:{})};
    }
   }
   family.perRho.push(report);
  }
 }
 for(const f of Object.values(families)){
  f.missedGlobalWinner=f.exhaustive.score<f.screened.score;
  f.scoreGap=Number.isFinite(f.screened.score)&&Number.isFinite(f.exhaustive.score)?f.screened.score-f.exhaustive.score:null;
 }
 return {n,origin,scale,medianGap:median,...families};
}
