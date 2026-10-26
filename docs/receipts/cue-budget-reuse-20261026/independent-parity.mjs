// Independent reviewer-authored qualification; execute through the lead's
// authorized runtime against complete pinned original/candidate source trees.
// Usage: node cue-independent-parity.mjs ORIGINAL_ROOT CANDIDATE_ROOT
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const [originalRoot,candidateRoot]=process.argv.slice(2);
if(!originalRoot||!candidateRoot)throw Error('Supply original and candidate source roots');
const readModule=(root,path)=>import(pathToFileURL(resolve(root,path)).href);
const [originalBudget,candidateBudget,originalQuestions,candidateQuestions,fixture]=await Promise.all([
  readModule(originalRoot,'src/cue-budget.mjs'),readModule(candidateRoot,'src/cue-budget.mjs'),
  readModule(originalRoot,'src/cue-questions.mjs'),readModule(candidateRoot,'src/cue-questions.mjs'),
  readModule(originalRoot,'test/cue-budget-fixture.mjs')
]);
const profile=costs=>({format:'skill-translator.cue-question-plan/v1',cues:costs.map((cost,i)=>({cueId:'c'+i,available:cost!==null,effort:cost??1,basis:'Independent authored conditions'}))});
let comparisons=0,refusals=0;
const capture=action=>{try{return {result:action()};}catch(error){return {error:{name:error.name,message:error.message}};}};
function parity(name,original,candidate,expectRefusal=false){
  const left=capture(original),right=capture(candidate);
  assert.equal(JSON.stringify(right),JSON.stringify(left),name+' complete result/refusal differs');
  if(expectRefusal){assert.ok(left.error,name+' should refuse in the pinned original');refusals++;}
  comparisons++;
}
const cases=[
  {name:'same-support-different-asked-set',values:[['constant','a'],['constant','b'],['constant','c']],labels:['A','B','C'],costs:[2,3],readings:[[],[{cueId:'c0',value:'constant'}],[{cueId:'c0',value:' constant '}]]},
  {name:'same-labels-different-future-support',values:[['0','0'],['0','1'],['1','0'],['1','0']],labels:['A','B','A','B'],costs:[2,3],readings:[[],[{cueId:'c0',value:'0'}],[{cueId:'c0',value:'1'}]]},
  {name:'all-tied-first-cues',values:[['0','0','a'],['0','1','b'],['1','0','c'],['1','1','d']],labels:['A','B','C','D'],costs:[2,3,5],readings:[[],[{cueId:'c1',value:'1'}]]},
  {name:'excluded-versus-retained-unknown-decision',values:[['keep','a'],['keep','b'],['drop','a']],labels:['A','B',null],costs:[2,3],readings:[[],[{cueId:'c0',value:'keep'}],[{cueId:'c0',value:'drop'}]]},
  {name:'synthetic-other-collision-and-overlap',values:[['Unrecorded analysis category','a'],['Unrecorded analysis category_','b'],[null,'c']],labels:['A','B','C'],costs:[3,2],readings:[[],[{cueId:'c0',value:'Unrecorded analysis category'}],[{cueId:'c0',value:'outside-original-categories'}]]},
  {name:'historical-unavailable-reading',values:[['0','0'],['0','1'],['1','0'],['1','1']],labels:['A','B','C','D'],costs:[null,1000],readings:[[],[{cueId:'c0',value:'1'}],[{cueId:'c0',value:'novel'}]]}
];
for(const item of cases){
  const study=fixture.study(item.values,item.labels),plan=profile(item.costs);
  // Reversed plan declaration order must normalize identically.
  plan.cues.reverse();
  const originalInput=JSON.stringify({study,plan});
  for(const readings of item.readings){
    const name=item.name+':'+JSON.stringify(readings);
    parity(name+':complete-unit',()=>originalQuestions.inspectCueQuestions(study,readings),()=>candidateQuestions.inspectCueQuestions(study,readings));
    parity(name+':complete-effort',()=>originalQuestions.inspectCueEffort(study,readings,plan),()=>candidateQuestions.inspectCueEffort(study,readings,plan));
    for(const budget of [...new Set([0,1,study.cues.length])])
      parity(name+':unit:'+budget,()=>originalBudget.inspectCueBudget(study,readings,budget),()=>candidateBudget.inspectCueBudget(study,readings,budget));
    const total=item.costs.reduce((sum,cost)=>sum+(cost??0),0);
    for(const budget of [...new Set([0,2,5,total,8000])])
      parity(name+':effort:'+budget,()=>originalBudget.inspectCueEffortBudget(study,readings,budget,plan),()=>candidateBudget.inspectCueEffortBudget(study,readings,budget,plan));
  }
  assert.equal(JSON.stringify({study,plan}),originalInput,item.name+' input mutated');
}

// Sequential requests deliberately reuse and then change the same object.
const evolving=fixture.study([['0','0'],['0','1'],['1','0']],['A','B','C']);
const evolvingPlan=profile([2,3]);
for(const change of [()=>{},()=>{evolving.rows[2].decision='A';},()=>{evolvingPlan.cues[0].effort=5;},()=>{evolvingPlan.cues[1].available=false;}]){
  change();
  parity('separate-call-source-plan-isolation',()=>originalBudget.inspectCueEffortBudget(evolving,[],6,evolvingPlan),()=>candidateBudget.inspectCueEffortBudget(evolving,[],6,evolvingPlan));
}

const source=fixture.study([['a','0'],['b','1']],['A','B']);
const conditions=profile([2,3]);
const invalidReadings=[null,{},[{cueId:'missing',value:'x'}],[{cueId:'c0',value:'a'},{cueId:'c0',value:'a'}],[{cueId:'c0',value:''}],[{cueId:'c0',value:' '.repeat(3)}],[{cueId:'c0',value:'x'.repeat(161)}],[{cueId:'c0',value:1}],new Array(3).fill({cueId:'c0',value:'a'})];
for(const readings of invalidReadings){
  const name='invalid-readings:'+JSON.stringify(readings);
  parity(name+':questions',()=>originalQuestions.inspectCueQuestions(source,readings),()=>candidateQuestions.inspectCueQuestions(source,readings),true);
  parity(name+':effort',()=>originalQuestions.inspectCueEffort(source,readings,conditions),()=>candidateQuestions.inspectCueEffort(source,readings,conditions),true);
  parity(name+':budget',()=>originalBudget.inspectCueBudget(source,readings,1),()=>candidateBudget.inspectCueBudget(source,readings,1),true);
  parity(name+':effort-budget',()=>originalBudget.inspectCueEffortBudget(source,readings,5,conditions),()=>candidateBudget.inspectCueEffortBudget(source,readings,5,conditions),true);
}
const badPlan=structuredClone(conditions);badPlan.cues[0].effort=0;
for(const [name,study,readings,plan] of [
  ['bad-study-and-readings',{},null,conditions],
  ['bad-plan-and-readings',source,null,badPlan],
  ['missing-plan-and-readings',source,null,undefined]
]){
  parity(name+':complete',()=>originalQuestions.inspectCueEffort(study,readings,plan),()=>candidateQuestions.inspectCueEffort(study,readings,plan),true);
  parity(name+':partial',()=>originalBudget.inspectCueEffortBudget(study,readings,5,plan),()=>candidateBudget.inspectCueEffortBudget(study,readings,5,plan),true);
}
for(const budget of [-1,0.5,NaN,'1',8001])
  parity('bad-budget-priority:'+String(budget),()=>originalBudget.inspectCueEffortBudget({},null,budget,badPlan),()=>candidateBudget.inspectCueEffortBudget({},null,budget,badPlan),true);

console.log(JSON.stringify({status:'passed',comparisons,expectedRefusals:refusals,edgeFamilies:cases.map(item=>item.name),scope:'Exact public report JSON including statesExamined, all ties, thresholds, order and error name/message; authored software controls only.'},null,2));
