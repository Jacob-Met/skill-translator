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
