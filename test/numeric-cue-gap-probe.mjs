import assert from 'node:assert/strict';
import {createSequence,appendMoment,upsertStep} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
import {CUE_FORMAT,importCueStudy,inspectCueStudy} from '../src/cue-sufficiency.mjs';
const clip={name:'authored.webm',mimeType:'video/webm',sizeBytes:1000,sha256:'a'.repeat(64),durationSeconds:10};
function source(){let s=createSequence(clip,{title:'Authored explanation'});for(const n of [1,2,3]){const image={name:`frame-${n}.png`,mimeType:'image/png',sha256:String(n).repeat(64),widthPx:100,heightPx:80,pixelCoordinates:'browser-oriented'};s=appendMoment(s,{id:`moment-${n}`,label:`Moment ${n}`,visibleState:'Authored state',image,origin:frameOrigin(clip,n,{mediaTime:n,width:100,height:80},image)});}for(const n of [1,2])s=upsertStep(s,{id:`step-${n}`,beforeMomentId:`moment-${n}`,afterMomentId:`moment-${n+1}`,title:`Step ${n}`,intent:'Align the edge',visibleChange:'A visible authored change',sensoryCue:'',recoveryCue:'Pause if the edge drifts'});return s;}

function study(values,decisions){return {format:CUE_FORMAT,comparison:{format:'skill-translator.decision-comparison/v1',relationship:'unresolved',explanation:'',examples:values.map((_,i)=>{const s=source(),hash=String(i+1).repeat(64);s.clip.sha256=hash;for(const m of s.moments)m.origin.clip.sha256=hash;return {source:s,stepId:'step-1'};})},cues:values[0].map((_,i)=>({id:'cue'+i,label:'Cue '+i,basis:'Explicit authored control'})),rows:values.map((v,i)=>({decision:decisions[i],basis:'Authored decision',values:v}))};}

function thresholds(rows) {
 const labels=[...new Set(rows.map(r=>r.decision))];
 if(labels.length!==2)return [];
 return labels.flatMap(low=>{
  const high=labels.find(x=>x!==low);
  const lower=Math.max(...rows.filter(r=>r.decision===low).map(r=>r.hi));
  const upper=Math.min(...rows.filter(r=>r.decision===high).map(r=>r.lo));
  return lower<upper?[{low,high,lower,upper,lowerOpen:true}]:[];
 });
}
for(const labels of [['hold','hold','change','change'],['hold','change','hold','change']]){
 const values=[1,2,5,6],raw=study(values.map(x=>[String(x)]),labels);
 const baseline=inspectCueStudy(raw),family=thresholds(values.map((x,i)=>({lo:x,hi:x,decision:labels[i]})));
 console.log(JSON.stringify({labels,baseline:baseline.status,family}));
}
const family=thresholds([{lo:.9,hi:1.1,decision:'hold'},{lo:1.9,hi:2.1,decision:'hold'},{lo:4.9,hi:5.1,decision:'change'},{lo:5.9,hi:6.1,decision:'change'}])[0];
assert.deepEqual(family,{low:'hold',high:'change',lower:2.1,upper:4.9,lowerOpen:true});
for(const [lo,hi] of [[1.4,1.6],[3.3,3.5],[5.2,5.4]])console.log(JSON.stringify({target:[lo,hi],compatibleLabel:hi<=family.lower?family.low:lo>=family.upper?family.high:null}));
assert.deepEqual(thresholds([{lo:1,hi:3,decision:'hold'},{lo:2,hi:4,decision:'change'}]),[]);
console.log('Bounded numerical probe passed; authored readings, not pixel extraction or physical actions.');

