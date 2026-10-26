import test from 'node:test';
import assert from 'node:assert/strict';
import {NUMERIC_CUE_FORMAT,importNumericCueStudy,inspectNumericCueStudy} from '../src/numeric-cue-thresholds.mjs';
import {createSequence,appendMoment,upsertStep} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
import {CUE_FORMAT} from '../src/cue-sufficiency.mjs';
const clip={name:'authored.webm',mimeType:'video/webm',sizeBytes:1000,sha256:'a'.repeat(64),durationSeconds:10};
function source(){let s=createSequence(clip,{title:'Authored explanation'});for(const n of [1,2,3]){const image={name:`frame-${n}.png`,mimeType:'image/png',sha256:String(n).repeat(64),widthPx:100,heightPx:80,pixelCoordinates:'browser-oriented'};s=appendMoment(s,{id:`moment-${n}`,label:`Moment ${n}`,visibleState:'Authored state',image,origin:frameOrigin(clip,n,{mediaTime:n,width:100,height:80},image)});}for(const n of [1,2])s=upsertStep(s,{id:`step-${n}`,beforeMomentId:`moment-${n}`,afterMomentId:`moment-${n+1}`,title:`Step ${n}`,intent:'Align the edge',visibleChange:'A visible authored change',sensoryCue:'',recoveryCue:'Pause if the edge drifts'});return s;}

function study(values,decisions){return {format:CUE_FORMAT,comparison:{format:'skill-translator.decision-comparison/v1',relationship:'unresolved',explanation:'',examples:values.map((_,i)=>{const s=source(),hash=String(i+1).repeat(64);s.clip.sha256=hash;for(const m of s.moments)m.origin.clip.sha256=hash;return {source:s,stepId:'step-1'};})},cues:values[0].map((_,i)=>({id:'cue'+i,label:'Cue '+i,basis:'Explicit authored control'})),rows:values.map((v,i)=>({decision:decisions[i],basis:'Authored decision',values:v}))};}

function numeric(values=[1,2,5,6],labels=['hold','hold','change','change']){
 const categorical=study(values.map(x=>[String(x)]),labels);
 return {format:NUMERIC_CUE_FORMAT,comparison:categorical.comparison,quantity:'Authored scalar clearance',unit:'mm',basis:'Authored control; ranges are declared closed intervals',rows:values.map((x,i)=>({decision:labels[i],basis:'Authored contrasting account',reading:{range:Array.isArray(x)?x:[x,x],momentId:'moment-1',basis:'Authored numeric reading'}})),target:null};
}
function withTarget(s,range){
 const target=structuredClone(s.comparison.examples[0]);target.source.clip.sha256='f'.repeat(64);for(const m of target.source.moments)m.origin.clip.sha256='f'.repeat(64);
 return {...s,target:{...target,reading:{range,momentId:'moment-1',basis:'Separate authored target'}}};
}
test('compatible family keeps its exact side convention and all boundary witnesses',()=>{
 const raw=numeric(),before=JSON.stringify(raw),r=inspectNumericCueStudy(raw),f=r.findings.families[0];
 assert.equal(r.findings.status,'compatible');assert.deepEqual(f,{lowLabel:'hold',highLabel:'change',threshold:{lower:2,upper:5,lowerOpen:true,upperOpen:false},lowerWitnesses:[1],upperWitnesses:[2]});
 assert.equal(JSON.stringify(raw),before);assert.deepEqual(importNumericCueStudy({...raw,findings:'forged'}),raw);
 assert.equal(inspectNumericCueStudy(numeric([1,2,5,6],['change','change','hold','hold'])).findings.families[0].lowLabel,'change');
 assert.equal(inspectNumericCueStudy(numeric([1,2,5,6],['hold','change','hold','change'])).findings.status,'no-compatible-threshold');
});
test('target agreement quantifies over every closed source/target range and every threshold',()=>{
 const s=numeric([[.9,1.1],[1.9,2.1],[4.9,5.1],[5.9,6.1]]);
 assert.deepEqual(inspectNumericCueStudy(s).findings.families[0].threshold,{lower:2.1,upper:4.9,lowerOpen:true,upperOpen:false});
 for(const [range,label] of [[[2.1,2.1],'hold'],[[4.9,4.9],'change'],[[2.100000001,2.100000001],null],[[4.899999999,4.899999999],null],[[2.1,4.9],null],[[1.4,1.6],'hold'],[[5.2,5.4],'change']]){
  const r=inspectNumericCueStudy(withTarget(s,range));assert.equal(r.target.label,label);assert.equal(r.target.extrapolates,false);
 }
 assert.equal(inspectNumericCueStudy(withTarget(s,[-1,0])).target.extrapolates,true);
 assert.equal(inspectNumericCueStudy(numeric([[1,3],[2,4]],['hold','change'])).findings.status,'no-compatible-threshold');
 assert.equal(inspectNumericCueStudy(numeric([2,2],['hold','change'])).findings.status,'no-compatible-threshold');
});
test('missing inputs and extra labels remain explicit rather than silently validated',()=>{
 const s=numeric();s.rows[0].reading=null;let r=inspectNumericCueStudy(s);assert.equal(r.findings.status,'compatible-known-subset');assert.deepEqual(r.findings.missing,[0]);assert.equal(r.omissions[0].comparison.status,'missing-reading');
 s.rows[2].decision=null;s.rows[3].decision=null;assert.equal(inspectNumericCueStudy(s).findings.status,'insufficient-contrast');
 assert.equal(inspectNumericCueStudy(numeric([1,2,3],['a','b','c'])).findings.status,'more-than-two-labels');
});
test('whole original clips are withheld together, including changed step names',()=>{
 const s=numeric();const shared=s.comparison.examples[0].source.clip.sha256;
 s.comparison.examples[1].source.clip.sha256=shared;for(const m of s.comparison.examples[1].source.moments)m.origin.clip.sha256=shared;
 s.comparison.examples[1].stepId='step-2';s.rows[1].reading.momentId='moment-2';
 const r=inspectNumericCueStudy(s);assert.deepEqual(r.omissions[0].omittedIndexes,[0,1]);assert.deepEqual(r.omissions[1].omittedIndexes,[0,1]);assert.equal(r.omissions[0].findings.status,'insufficient-contrast');assert.equal(r.omissions[0].agreement,'unassessed');
});
test('malformed, foreign, duplicate target evidence and forged derived reports refuse or recompute',()=>{
 for(const change of [s=>s.rows.pop(),s=>s.rows[0].reading.range=[2,1],s=>s.rows[0].reading.range=[NaN,1],s=>s.rows[0].reading.momentId='moment-3',s=>s.rows[0].basis='',s=>s.target={...s.comparison.examples[0],reading:s.rows[0].reading}]){
  const s=numeric();change(s);assert.throws(()=>importNumericCueStudy(s));
 }
 const s=withTarget(numeric(),[3,4]);s.target.label='hold';s.findings={families:[{threshold:3}]};assert.equal(inspectNumericCueStudy(s).target.label,null);
});
test('independent finite threshold-cell oracle agrees across all binary labels and interval inputs',()=>{
 const ranges=[[0,0],[0,1],[1,1],[1,2],[2,2]];
 for(const a of ranges)for(const b of ranges)for(const c of ranges)for(let mask=0;mask<8;mask++){
  const rr=[a,b,c],labels=rr.map((_,i)=>(mask>>i)&1?'a':'b'),s=numeric(rr,labels),r=inspectNumericCueStudy(s);
  if(new Set(labels).size!==2)continue;
  const possible=[];
  // For integer endpoints, half-integer cells plus endpoints represent every possible label partition.
  for(const low of ['a','b'])for(const t of [-1,-.5,0,.5,1,1.5,2,2.5,3]){
   const high=low==='a'?'b':'a';
   if(rr.every(([lo,hi],i)=>labels[i]===low?hi<t:lo>=t))possible.push({low,t});
  }
  assert.equal(r.findings.families.length>0,possible.length>0);
  for(const p of possible)assert.ok(r.findings.families.some(f=>f.lowLabel===p.low&&p.t>f.threshold.lower&&p.t<=f.threshold.upper));
  for(const f of r.findings.families)assert.ok(possible.some(p=>p.low===f.lowLabel));
 }
});

