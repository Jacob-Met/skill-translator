// Finite OU covariance family, with the same covariance model on null and step.
function fitOU(samples){
 const n=samples.length,origin=samples[0].value,scale=Math.max(...samples.map(s=>Math.abs(s.value-origin)))||1,y=samples.map(s=>(s.value-origin)/scale);
 const gaps=samples.slice(1).map((s,i)=>s.timeSeconds-samples[i].timeSeconds),sorted=[...gaps].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];
 let constant={score:Infinity},step={score:Infinity};
 for(const rho of [0,.1,.2,.3,.4,.5,.6,.7,.8,.9,.95,.975,.99]){
  const phi=[0,...gaps.map(g=>rho===0?0:Math.pow(rho,g/median))],sd=phi.map(p=>Math.sqrt(1-p*p));
  const z=y.map((v,i)=>(v-(i?phi[i]*y[i-1]:0))/sd[i]),basis=phi.map((p,i)=>i?(1-p)/sd[i]:1);
  const prefixA=[0],prefixB=[0];let totalZ=0,logdet=0;
  for(let i=0;i<n;i++){prefixA.push(prefixA[i]+basis[i]**2);prefixB.push(prefixB[i]+basis[i]*z[i]);totalZ+=z[i]**2;logdet+=Math.log(sd[i]**2);}
  const score=(sse,p)=>n*Math.log(Math.max(sse/n,1e-24))+logdet+p*Math.log(n),mean=prefixB[n]/prefixA[n],nullSSE=z.reduce((s,v,i)=>s+(v-mean*basis[i])**2,0),nullScore=score(nullSSE,2);
  if(nullScore<constant.score)constant={score:nullScore,rho,mean:origin+mean*scale};
  for(let k=3;k<=n-3;k++){
   const inv=1/sd[k]**2,a=prefixA[k]+phi[k]**2*inv,b=prefixA[n]-prefixA[k+1]+inv,c=-phi[k]*inv;
   const d=prefixB[k]-phi[k]*z[k]/sd[k],e=prefixB[n]-prefixB[k+1]+z[k]/sd[k],det=a*b-c*c;
   const left=(d*b-e*c)/det,right=(e*a-d*c)/det,sse=Math.max(0,totalZ-left*d-right*e),candidateScore=score(sse,5);
   if(candidateScore<step.score||(totalZ>0&&sse<=64*Number.EPSILON*(Math.abs(totalZ)+Math.abs(left*d)+Math.abs(right*e)))){const verified=z.reduce((sum,v,i)=>{const current=i<k?left:right,previous=i-1<k?left:right,expected=(current-(i?phi[i]*previous:0))/sd[i];return sum+(v-expected)**2;},0);if(score(verified,5)<step.score)step={score:score(verified,5),rho,split:k,left:origin+left*scale,right:origin+right*scale};}
  }
 }
 return {constant,step,proposed:step.score<constant.score};
}

function regress(columns,y){const n=columns.length,a=columns.map((x,i)=>[...columns.map(z=>x.reduce((s,v,j)=>s+v*z[j],0)),x.reduce((s,v,j)=>s+v*y[j],0)]);
 for(let i=0;i<n;i++){let pivot=i;for(let k=i+1;k<n;k++)if(Math.abs(a[k][i])>Math.abs(a[pivot][i]))pivot=k;if(Math.abs(a[pivot][i])<1e-12)return Infinity;[a[i],a[pivot]]=[a[pivot],a[i]];const d=a[i][i];for(let j=i;j<=n;j++)a[i][j]/=d;for(let k=0;k<n;k++)if(k!==i){const f=a[k][i];for(let j=i;j<=n;j++)a[k][j]-=f*a[i][j];}}
 return y.reduce((s,v,i)=>s+(v-columns.reduce((p,c,j)=>p+c[i]*a[j][n],0))**2,0);}
export function fitInstrumentChangeModels(samples){const result=fitOU(samples),n=samples.length,origin=samples[0].value,scale=Math.max(...samples.map(s=>Math.abs(s.value-origin)))||1,y=samples.map(s=>(s.value-origin)/scale),gaps=samples.slice(1).map((s,i)=>s.timeSeconds-samples[i].timeSeconds),sorted=[...gaps].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)],t=samples.map(s=>(s.timeSeconds-samples[0].timeSeconds)/(samples.at(-1).timeSeconds-samples[0].timeSeconds));
 const frequencies=Array.from({length:31},(_,i)=>.5+i*.25).filter(f=>f<=n/6),periods=frequencies.map(f=>({frequency:f,sine:t.map(t=>Math.sin(2*Math.PI*f*t)),cosine:t.map(t=>Math.cos(2*Math.PI*f*t))}));
 const alternatives={constant:result.constant,linear:{score:Infinity},spike:{score:Infinity},periodic:{score:Infinity},decaying:{score:Infinity}};
 for(const rho of [0,.1,.2,.3,.4,.5,.6,.7,.8,.9,.95,.975,.99]){
  const phi=[0,...gaps.map(g=>rho===0?0:Math.pow(rho,g/median))],sd=phi.map(p=>Math.sqrt(1-p*p)),transform=v=>v.map((x,i)=>(x-(i?phi[i]*v[i-1]:0))/sd[i]),z=transform(y),basis=transform(y.map(()=>1)),logdet=sd.reduce((s,v)=>s+Math.log(v*v),0),score=(sse,p)=>n*Math.log(Math.max(sse/n,1e-24))+logdet+p*Math.log(n);
  const linearScore=score(regress([basis,transform(t)],z),3);if(linearScore<alternatives.linear.score)alternatives.linear={score:linearScore,rho};
  const a=basis.reduce((s,v)=>s+v*v,0),d=basis.reduce((s,v,i)=>s+v*z[i],0),zz=z.reduce((s,v)=>s+v*v,0);
  for(let j=0;j<n;j++){const left=1/sd[j],right=j<n-1?-phi[j+1]/sd[j+1]:0,b=left*left+right*right,c=left*basis[j]+(j<n-1?right*basis[j+1]:0),e=left*z[j]+(j<n-1?right*z[j+1]:0),det=a*b-c*c;if(det<=0)continue;const mu=(d*b-e*c)/det,amplitude=(e*a-d*c)/det,sse=Math.max(0,zz-mu*d-amplitude*e),s=score(sse,5);if(s<alternatives.spike.score||(zz>0&&sse<=64*Number.EPSILON*(Math.abs(zz)+Math.abs(mu*d)+Math.abs(amplitude*e)))){const verified=z.reduce((sum,value,i)=>{const impulse=i===j?left:i===j+1?right:0;return sum+(value-mu*basis[i]-amplitude*impulse)**2;},0),verifiedScore=score(verified,5);if(verifiedScore<alternatives.spike.score)alternatives.spike={score:verifiedScore,rho,index:j};}}
  for(let j=0;j<n;j++){const c=basis[j],e=z[j],det=a-c*c;if(det<=0)continue;const mu=(d-e*c)/det,amplitude=(e*a-d*c)/det,sse=Math.max(0,zz-mu*d-amplitude*e),s=score(sse,5);if(s<alternatives.decaying.score||(zz>0&&sse<=64*Number.EPSILON*(Math.abs(zz)+Math.abs(mu*d)+Math.abs(amplitude*e)))){const verified=z.reduce((sum,value,i)=>sum+(value-mu*basis[i]-(i===j?amplitude:0))**2,0),v=score(verified,5);if(v<alternatives.decaying.score)alternatives.decaying={score:v,rho,index:j};}}
  for(const period of periods){const s=score(regress([basis,transform(period.sine),transform(period.cosine)],z),4)+2*Math.log(periods.length);if(s<alternatives.periodic.score)alternatives.periodic={score:s,rho,frequency:period.frequency};}
 }
 const bestAlternative=Math.min(...Object.values(alternatives).map(a=>a.score)),improvement=bestAlternative-result.step.score;
 return {...result,alternatives,improvement,proposed:improvement>0};
}
