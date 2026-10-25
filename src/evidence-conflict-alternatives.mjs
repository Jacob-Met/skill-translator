/** Exact rank selection of a complete smallest-group family, without enumeration. */
import {analyzeEvidence} from './evidence.mjs';
import {explainEvidenceConflicts} from './evidence-conflicts.mjs';
export function selectEvidenceConflictAlternative(demo,landmarkId,observations,rank){
 if(typeof rank!=='string'||! /^(0|[1-9][0-9]{0,19})$/.test(rank))throw Error('Select a whole-number group index, starting at zero.');
 let remainingRank=BigInt(rank);
 const report=explainEvidenceConflicts(demo,landmarkId,observations);
 if(report.status!=='contradictory')throw Error('No contradictory observation group exists for the retained family.');
 if(remainingRank>=BigInt(report.groupCount))throw Error('The selected group index is outside this complete family.');
 const evidence=analyzeEvidence(demo,landmarkId,observations),target=(1<<evidence.candidates.length)-1;
 const rows=evidence.observations.map(observation=>({observation,mask:evidence.candidates.reduce((m,c,i)=>m|(c.contradictions.includes(observation.id)?1<<i:0),0)})).sort((a,b)=>a.observation.id<b.observation.id?-1:a.observation.id>b.observation.id?1:0);
 const memo=new Map();
 function count(i,left,covered){
  if(left===0)return covered===target?1n:0n;
  if(rows.length-i<left)return 0n;
  const key=`${i}/${left}/${covered}`;
  if(memo.has(key))return memo.get(key);
  const value=count(i+1,left-1,covered|rows[i].mask)+count(i+1,left,covered);memo.set(key,value);return value;
 }
 const total=count(0,report.minimumSize,0);
 if(total!==BigInt(report.groupCount))throw Error('The complete family count could not be reconciled.');
 const witness=[];let covered=0,left=report.minimumSize;
 for(let i=0;left&&i<rows.length;i++){
  const included=count(i+1,left-1,covered|rows[i].mask);
  if(remainingRank<included){witness.push(rows[i].observation);covered|=rows[i].mask;left--;}else remainingRank-=included;
 }
 if(left||covered!==target)throw Error('A complete contradiction witness could not be selected.');
 const ids=new Set(witness.map(o=>o.id));
 const ruleWitnesses=evidence.candidates.map(c=>({rule:c.rule,observations:c.residuals.filter(r=>ids.has(r.observationId)&&!r.compatible).sort((a,b)=>a.observationId<b.observationId?-1:a.observationId>b.observationId?1:0)}));
 return {...report,groupIndex:rank,witness,ruleWitnesses};
}
