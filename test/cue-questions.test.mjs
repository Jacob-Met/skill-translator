import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectCueQuestions} from '../src/cue-questions.mjs';
import {CUE_FORMAT,inspectCueStudy} from '../src/cue-sufficiency.mjs';
import {createSequence,appendMoment,upsertStep} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
test('independent depth-two decision-tree enumeration agrees across512 tables',()=>{for(let bits=0;bits<4096;bits+=8){const values=Array.from({length:4},(_,i)=>Array.from({length:3},(_,j)=>String((bits>>(i*3+j))&1))),labels=['A','B','A','B'],s=study(values,labels);const same=ids=>new Set(ids.map(i=>labels[i])).size<=1;const split=(ids,c)=>['0','1'].map(v=>ids.filter(i=>values[i][c]===v)).filter(a=>a.length);const separates=(ids,c)=>split(ids,c).every(same);const ids=[0,1,2,3];let expected=null;if([0,1,2].some(c=>separates(ids,c)))expected=1;else if([0,1,2].some(c=>split(ids,c).every(branch=>same(branch)||[0,1,2].some(d=>d!==c&&separates(branch,d)))))expected=2;else if(!ids.some(a=>ids.some(b=>labels[a]!==labels[b]&&values[a].every((v,j)=>v===values[b][j]))))expected=3;assert.equal(inspectCueQuestions(s).worstCaseQuestions,expected);}});
test('adaptive branches need two questions where every fixed set needs three',()=>{const s=study([['0','0','0'],['0','1','0'],['1','0','0'],['1','0','1']],['A','B','C','D']),before=JSON.stringify(s),r=inspectCueQuestions(s);assert.deepEqual(inspectCueStudy(s).minimalCueSets,[['c0','c1','c2']]);assert.equal(r.worstCaseQuestions,2);assert.deepEqual(r.bestFirstCueIds,['c0']);assert.deepEqual(inspectCueQuestions(s,[{cueId:'c0',value:'0'}]).bestFirstCueIds,['c1']);assert.deepEqual(inspectCueQuestions(s,[{cueId:'c0',value:'1'}]).bestFirstCueIds,['c2']);assert.equal(JSON.stringify(s),before);});
test('unknown categories remain compatible across known and novel branches',()=>{const s=study([[null,'0'],['A','1']],['left','right']),r=inspectCueQuestions(s);assert.equal(r.worstCaseQuestions,1);const q=r.questions.find(q=>q.cueId==='c0');assert.deepEqual(q.outcomes.map(b=>b.exampleIndexes),[[0,1],[0]]);const novel=inspectCueQuestions(s,[{cueId:'c0',value:'novel'}]);assert.deepEqual(novel.compatibleExampleIndexes,[0]);assert.equal(novel.worstCaseQuestions,0);});
test('outside evidence and unknown labels are unavailable rather than predictions',()=>{const s=study([['0'],['1']],['A','B']);assert.equal(inspectCueQuestions(s,[{cueId:'c0',value:'other'}]).status,'outside-retained-evidence');s.rows[0].decision=null;assert.equal(inspectCueQuestions(s).status,'unknown-decision');});
test('conflicting rows cannot be distinguished and malformed readings refuse',()=>{const s=study([['0'],['0']],['A','B']);assert.equal(inspectCueQuestions(s).worstCaseQuestions,null);for(const readings of [[{cueId:'bad',value:'0'}],[{cueId:'c0',value:''}],[{cueId:'c0',value:'0'},{cueId:'c0',value:'1'}]])assert.throws(()=>inspectCueQuestions(s,readings));});
function study(values,labels){
 const examples=values.map((_,i)=>{
 const clip={name:'authored.webm',mimeType:'video/webm',sizeBytes:1000,sha256:String(i+1).repeat(64),durationSeconds:10};
 let source=createSequence(clip,{title:'Authored example'});
 for(const n of [1,2]){const image={name:'frame.png',mimeType:'image/png',sha256:String(n).repeat(64),widthPx:100,heightPx:80,pixelCoordinates:'browser-oriented'};source=appendMoment(source,{id:'m'+n,label:'Moment',visibleState:'Authored',image,origin:frameOrigin(clip,n,{mediaTime:n,width:100,height:80},image)});}
 source=upsertStep(source,{id:'s',beforeMomentId:'m1',afterMomentId:'m2',title:'Step',intent:'Authored',visibleChange:'Authored',sensoryCue:'',recoveryCue:''});
 return {source,stepId:'s'};
 });
 return {format:CUE_FORMAT,comparison:{format:'skill-translator.decision-comparison/v1',relationship:'unresolved',explanation:'',examples},cues:values[0].map((_,i)=>({id:'c'+i,label:'Cue',basis:'Authored'})),rows:values.map((v,i)=>({values:v,decision:labels[i],basis:'Authored'}))};
}


import {inspectCueEffort,importCueQuestionPlan,CUE_QUESTION_PLAN} from '../src/cue-questions.mjs';
const planFor=(s,costs,available=costs.map(()=>true))=>({format:CUE_QUESTION_PLAN,cues:s.cues.map((c,i)=>({cueId:c.id,available:available[i],effort:costs[i],basis:'Explicit authored effort control'}))});
test('declared effort selects two cheap questions instead of one expensive direct cue',()=>{
 const s=study([['A','0','0'],['B','0','1'],['C','1','0'],['D','1','1']],['A','B','C','D']);
 const plan=planFor(s,[9,2,3]),before=JSON.stringify({s,plan});
 assert.equal(inspectCueQuestions(s).worstCaseQuestions,1);
 const r=inspectCueEffort(s,[],plan);assert.equal(r.worstCaseEffort,5);assert.deepEqual(r.bestFirstCueIds,['c1','c2']);
 assert.equal(r.questions.find(q=>q.cueId==='c0').effort,9);
 assert.equal(JSON.stringify({s,plan}),before);
 const next=inspectCueEffort(s,[{cueId:'c1',value:'0'}],plan);assert.equal(next.worstCaseEffort,3);assert.deepEqual(next.bestFirstCueIds,['c2']);
});
test('unavailable necessary cues are unresolved; existing readings remain retained',()=>{
 const s=study([['0','0'],['0','1']],['A','B']),p=planFor(s,[1,3],[true,false]);
 const r=inspectCueEffort(s,[],p);assert.equal(r.worstCaseEffort,null);assert.deepEqual(r.bestFirstCueIds,[]);assert.deepEqual(r.unavailableCueIds,['c1']);assert.deepEqual(r.questions.map(q=>q.cueId),['c0']);
 const known=inspectCueEffort(s,[{cueId:'c1',value:'1'}],p);assert.equal(known.worstCaseEffort,0);assert.deepEqual(known.compatibleExampleIndexes,[1]);
 p.cues[0].available=false;assert.equal(inspectCueEffort(s,[],p).worstCaseEffort,null);
});
test('unknown and novel readings cannot manufacture finite effort support',()=>{
 const s=study([[null,'0'],['x','1']],['A','B']),p=planFor(s,[1,4]);
 assert.equal(inspectCueEffort(s,[],p).worstCaseEffort,4);
 assert.equal(inspectCueEffort(s,[],p).questions[0].effort,5);
 p.cues[1].available=false;assert.equal(inspectCueEffort(s,[],p).worstCaseEffort,null);
 const outside=study([['0'],['1']],['A','B']);assert.equal(inspectCueEffort(outside,[{cueId:'c0',value:'new'}],planFor(outside,[2])).status,'outside-retained-evidence');
 outside.rows[0].decision=null;assert.equal(inspectCueEffort(outside,[],planFor(outside,[2])).worstCaseEffort,null);
});
test('plans require complete unique cues, integer costs, explicit availability and attributed basis',()=>{
 const s=study([['0','0'],['1','1']],['A','B']),p=planFor(s,[1,1000]);
 for(const mutate of [p=>p.format='unknown',p=>p.cues.pop(),p=>p.cues[1].cueId='c0',p=>p.cues[0].cueId='other',p=>p.cues[0].available='false',p=>p.cues[0].basis=' ',...[-1,0,1.5,1001,NaN,Infinity,'1',null].map(x=>p=>p.cues[0].effort=x)]){const bad=structuredClone(p);mutate(bad);assert.throws(()=>inspectCueEffort(s,[],bad));}
 assert.deepEqual(importCueQuestionPlan(s,{...p,cues:[...p.cues].reverse()}),p);
 assert.equal(inspectCueEffort(s,[],p).worstCaseEffort,1);
});
test('independent exhaustive policy enumeration agrees over 1536 effort and availability tables',()=>{
 function policies(rows,columns,costs,values,labels){
  if(new Set(rows.map(i=>labels[i])).size===1)return [0];
  const totals=[];
  for(const c of columns){const groups=[...new Set(rows.map(i=>values[i][c]))].map(v=>rows.filter(i=>values[i][c]===v));const children=groups.map(g=>policies(g,columns.filter(x=>x!==c),costs,values,labels));if(children.some(x=>!x.length))continue;
   let combinations=[[]];for(const options of children)combinations=combinations.flatMap(prior=>options.map(x=>[...prior,x]));
   for(const combination of combinations)totals.push(costs[c]+Math.max(...combination));
  }return [...new Set(totals)];
 }
 for(let bits=0;bits<64;bits++){const values=Array.from({length:4},(_,i)=>Array.from({length:3},(_,j)=>String(((bits*37)>>(i*3+j))&1))),labels=['A','B','A','B'],s=study(values,labels);
  for(let mask=0;mask<8;mask++)for(const costs of [[1,1,1],[1,2,7],[5,3,1]]){const available=costs.map((_,i)=>!!(mask&(1<<i))),all=policies([0,1,2,3],[0,1,2].filter(i=>available[i]),costs,values,labels),expected=all.length?Math.min(...all):null;assert.equal(inspectCueEffort(s,[],planFor(s,costs,available)).worstCaseEffort,expected);}
 }
});
