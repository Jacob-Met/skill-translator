import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {startJointChallengeSequence,freezeNextJointChallengeRound,recordJointChallengeSequenceResult,activeJointChallengeSequenceRequest,analyzeJointChallengeSequence,importJointChallengeSequence,serializeJointChallengeSequence} from '/tmp/de5a-skill-sequence-20261028/source/src/joint-challenge-sequence.mjs';
import {freezeJointChallengePlan,exportJointChallengeStudy,analyzeJointChallenge} from '/tmp/de5a-skill-sequence-20261028/source/src/joint-challenge.mjs';
import {analyzeJointChallengeConflicts} from '/tmp/de5a-skill-sequence-20261028/source/src/joint-challenge-conflicts.mjs';
import {sequenceInitial,nextRound,sequenceOutcome} from '/tmp/de5a-skill-sequence-20261028/source/test/support/joint-challenge-sequence-fixtures.mjs';
import {makeJointStudy,makeChallenge,futureTrial,outcomeAt,authoredJointSource} from '/tmp/de5a-skill-sequence-20261028/source/test/support/joint-challenge-conflict-fixtures.mjs';

const rows=[], sources={};
function reconstructed(source){
 const s=importJointChallengeSequence(source);
 const trials=[...s.initial.plan.trials,...s.rounds.map(r=>r.trial)];
 const results=[...s.initial.results,...s.rounds.flatMap(r=>r.results)];
 const plan=freezeJointChallengePlan(s.initial.plan.investigation,{id:s.rounds.at(-1)?.id??s.initial.plan.id,label:s.rounds.at(-1)?.label??s.initial.plan.label,prospectiveDeclaration:true,trials});
 return {s,plan,results};
}
function cartesian(parts){return parts.reduce((sets,part)=>sets.flatMap(a=>part.map(b=>[...a,b])),[[]]);}
function inspect(name,source){
 const original=serializeJointChallengeSequence(source),{s,plan,results}=reconstructed(source);
 const diagnostic=analyzeJointChallengeConflicts(plan,results),seq=analyzeJointChallengeSequence(s),full=analyzeJointChallenge(plan,results);
 assert.equal(full.combinationCount,seq.current.combinationCount);
 const family=full.readings.flatMap(reading=>cartesian(reading.marks.map(mark=>mark.candidates)).map(rules=>({reading:reading.id,rules})));
 const oracle=[];
 for(let mask=1;mask<(1<<plan.trials.length);mask++){
  const selected=new Set(plan.trials.filter((_,i)=>mask&(1<<i)).map(t=>t.id));
  const viable=family.filter(explanation=>explanation.rules.every(rule=>rule.residuals.every(r=>!selected.has(r.trialId)||r.compatible!==false)));
  const actual=diagnostic.subsets[mask-1];assert.equal(actual.mask,mask);assert.equal(actual.combinationCount,viable.length);
  assert.deepEqual([...new Set(viable.map(v=>v.reading))],actual.viableReadingIds);
  oracle.push({mask,count:viable.length});
 }
 assert.equal(diagnostic.baselineCombinationCount,family.length);
 assert.equal(serializeJointChallengeSequence(source),original);
 const result={name,workpieces:plan.trials.length,baseline:family.length,current:full.combinationCount,subsetsChecked:oracle.length,minimalGroups:diagnostic.minimalGroups.map(g=>g.trialIds),rounds:seq.rounds.map(r=>({id:r.id,before:r.before.combinationCount,after:r.after.combinationCount})),missing:full.missingCount,imprecise:full.impreciseCount,oracle};
 rows.push(result);sources[name]=s;return {result,diagnostic,seq};
}
function record(s,mark,x,y,options){return recordJointChallengeSequenceResult(s,activeJointChallengeSequenceRequest(s),sequenceOutcome(s,mark,x,y,options));}
function add(s,id,width,{right=false,wide=false}={}){s=freezeNextJointChallengeRound(s,nextRound(id,width,width*.8));s=record(s,'guide',right?width-80:wide?30:20,width*.3);return record(s,'index',wide?90:60,width*.5);}

let base=startJointChallengeSequence(sequenceInitial());
let r=inspect('consistent-initial',base);assert.equal(r.result.current,1);assert.deepEqual(r.result.minimalGroups,[]);
let conflict=add(base,'later',300,{right:true});r=inspect('cross-round-pair',conflict);assert.equal(r.result.current,0);assert.deepEqual(r.result.minimalGroups,[['first-workpiece','later-workpiece']]);assert.equal(r.seq.rounds[0].before.combinationCount,1);
let corrected=record(conflict,'guide',20,90);r=inspect('current-round-correction',corrected);assert.equal(r.result.current,1);assert.deepEqual(r.result.minimalGroups,[]);assert.deepEqual(r.seq.rounds[0].predictions,analyzeJointChallengeSequence(conflict).rounds[0].predictions);
let six=base;for(let n=2;n<=6;n++)six=add(six,'round-'+n,(n+1)*100,{right:n===6});r=inspect('six-workpieces-five-alternative-conflicts',six);assert.equal(r.result.subsetsChecked,63);assert.equal(r.result.minimalGroups.length,5);assert(r.result.minimalGroups.every(g=>g.length===2&&g.includes('round-6-workpiece')));
let imprecise=startJointChallengeSequence(sequenceInitial({outcomes:false}));imprecise=freezeNextJointChallengeRound(imprecise,nextRound('imprecise',300,240));imprecise=record(imprecise,'guide',220,90,{radius:1});imprecise=freezeNextJointChallengeRound(imprecise,nextRound('missing',400,320));r=inspect('sealed-missing-and-imprecise',imprecise);assert.equal(r.result.current,r.result.baseline);assert.equal(r.result.imprecise,1);assert.deepEqual(r.result.minimalGroups,[]);
let alternatives=startJointChallengeSequence(sequenceInitial({alternatives:true}));alternatives=add(alternatives,'different-reading',300,{wide:true});r=inspect('one-global-source-reading',alternatives);assert.equal(r.result.current,0);assert(r.result.baseline>25);assert.deepEqual(r.result.minimalGroups,[['first-workpiece','different-reading-workpiece']]);
const initialPlan=makeChallenge(makeJointStudy(authoredJointSource,false),[futureTrial('initial-a'),futureTrial('initial-b',300,240)]),initialResults=[outcomeAt(initialPlan,'guide',20,60,'initial-a'),outcomeAt(initialPlan,'guide',20,90,'initial-b')];
let multi=startJointChallengeSequence(exportJointChallengeStudy(initialPlan,initialResults));multi=add(multi,'later-after-two',400,{right:true});r=inspect('multiple-initial-workpieces-stay-separate',multi);assert.deepEqual(r.result.minimalGroups,[['initial-a','later-after-two-workpiece'],['initial-b','later-after-two-workpiece']]);
let forged=JSON.parse(JSON.stringify(conflict));forged.rounds[0].prefix.initial.results[0].observation.xMm+=1;assert.throws(()=>reconstructed(forged),/complete original prior-source prefix/);
const dir=new URL('.',import.meta.url);writeFileSync(new URL('sources.json',dir),JSON.stringify(sources,null,2)+'\n');const output={scope:'Read-only source-bound probe; no production edits or claim',contractSha256:createHash('sha256').update(readFileSync(new URL('CONTRACT.md',dir))).digest('hex'),cases:rows,tamperedPrefixRefused:true,allOriginalSourcesUnchanged:true};writeFileSync(new URL('results.json',dir),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({cases:rows.length,subsetCountsVerified:rows.reduce((n,r)=>n+r.subsetsChecked,0),controls:rows.map(({oracle,...r})=>r)},null,2));
