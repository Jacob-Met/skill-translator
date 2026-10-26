import {proposeInstrumentChanges} from '../src/instrument-change-proposals.mjs';
let state=92851763;const uniform=()=>((state=(1664525*state+1013904223)>>>0)+.5)/4294967296,normal=()=>Math.sqrt(-2*Math.log(uniform()))*Math.cos(2*Math.PI*uniform());
const report={seed:state,evidence:'Authored held-back synthetic courses only; no physical measurement or calibrated probability claim.',cases:[]};
for(const rho of [0,.4,.83,.95])for(const kind of ['flat','step','ramp','spike','sine','curve']){
 const counts={rho,kind,total:100,preferred:0,weaklySeparated:0,alternativePreferred:0,preferredExactBoundary:0};
 for(let trial=0;trial<100;trial++){
  const n=43+trial%43,split=Math.floor(n*.53);let time=0,noise=.3*normal();const times=Array.from({length:n},()=>time+=.1+uniform()*.2),duration=times.at(-1)-times[0];
  const samples=times.map((t,i)=>{const phi=i?Math.pow(rho,(t-times[i-1])/.2):rho;noise=phi*noise+Math.sqrt(1-phi*phi)*.3*normal();const position=(t-times[0])/duration,signal=kind==='step'&&i>=split?.9:kind==='ramp'?2*position:kind==='spike'&&i===n-5?4:kind==='sine'?Math.sin(2*Math.PI*(.73+(trial%20)*.417)*position):kind==='curve'?2*position*position:0;return {timeSeconds:t,value:-41+noise+signal};});
  const q=proposeInstrumentChanges(samples,{maximumGapSeconds:.31}).inquiries[0];if(q.status==='preferred')counts.preferred++;else if(q.status==='weakly-separated')counts.weaklySeparated++;else if(q.status==='alternative-preferred')counts.alternativePreferred++;else throw Error('Unexpected unavailable course: '+q.status);if(kind==='step'&&q.status==='preferred'&&q.boundary.afterIndex===split)counts.preferredExactBoundary++;
 }
 report.cases.push(counts);
}
console.log(JSON.stringify(report,null,2));
