/** Smallest contradictory groups in the maintained, finite five-rule family. */
import {analyzeEvidence,RULES} from './evidence.mjs';

// Each observation is either included once or omitted. Keep the cheapest
// coverage of each rule mask and count all equally cheap index subsets.
function covers(rows,skip=-1){
 let states=Array(1<<RULES.length).fill(null);states[0]={size:0,count:1n,witness:[]};
 for(let i=0;i<rows.length;i++){
  if(i===skip)continue;
  const next=states.slice();
  for(let mask=0;mask<states.length;mask++){
   const old=states[mask];if(!old)continue;
   const target=mask|rows[i].mask,size=old.size+1,prior=next[target];
   if(!prior||size<prior.size)next[target]={size,count:old.count,witness:[...old.witness,rows[i].observation.id]};
   else if(size===prior.size)next[target]={...prior,count:prior.count+old.count};
  }
  states=next;
 }
 return states.at(-1);
}
export function explainEvidenceConflicts(demo,landmarkId,observations){
 const evidence=analyzeEvidence(demo,landmarkId,observations);
 // Canonical IDs make the displayed witness invariant to input row order.
 const rows=evidence.observations.map(observation=>({observation,mask:evidence.candidates.reduce((mask,c,i)=>mask|(c.contradictions.includes(observation.id)?1<<i:0),0)})).sort((a,b)=>a.observation.id<b.observation.id?-1:a.observation.id>b.observation.id?1:0);
 const best=covers(rows);
 const base={landmarkId,evidenceStatus:evidence.status,compatibleRules:evidence.compatibleRules,
  minimumSize:null,groupCount:'0',witness:[],ruleWitnesses:[],participation:[],
  limitations:['Only the five retained geometric interpretations are tested, using their unchanged residual and declared uncertainty checks.',
   'Smallest means minimum number of observations, not every inclusion-minimal group. Counts are combinations of records, not probabilities or independent evidence.',
   'A contradictory group does not identify a faulty observation, justify removing it, establish physical necessity or rule out a relationship outside this family.']};
 if(!best)return {...base,status:evidence.status==='no-evidence'?'no-evidence':'compatible-family'};
 const witness=best.witness.map(id=>rows.find(r=>r.observation.id===id).observation);
 const ruleWitnesses=evidence.candidates.map(candidate=>({rule:candidate.rule,observations:candidate.residuals.filter(r=>best.witness.includes(r.observationId)&&!r.compatible).sort((a,b)=>a.observationId<b.observationId?-1:a.observationId>b.observationId?1:0)}));
 const participation=rows.map((row,i)=>{
  const without=covers(rows,i),omitting=without?.size===best.size?without.count:0n,count=best.count-omitting;
  return {observationId:row.observation.id,groupCount:String(count),inEverySmallestGroup:count===best.count,inSomeSmallestGroup:count>0n};
 });
 return {...base,status:'contradictory',minimumSize:best.size,groupCount:String(best.count),witness,ruleWitnesses,participation};
}
