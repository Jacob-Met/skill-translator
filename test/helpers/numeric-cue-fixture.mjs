import {createSequence,appendMoment,upsertStep} from '../../src/demonstration-sequence.mjs';
import {frameOrigin} from '../../src/frame-origin.mjs';
import {CUE_FORMAT,importCueStudy,inspectCueStudy} from '../../src/cue-sufficiency.mjs';
const clip={name:'authored.webm',mimeType:'video/webm',sizeBytes:1000,sha256:'a'.repeat(64),durationSeconds:10};
function source(){let s=createSequence(clip,{title:'Authored explanation'});for(const n of [1,2,3]){const image={name:`frame-${n}.png`,mimeType:'image/png',sha256:String(n).repeat(64),widthPx:100,heightPx:80,pixelCoordinates:'browser-oriented'};s=appendMoment(s,{id:`moment-${n}`,label:`Moment ${n}`,visibleState:'Authored state',image,origin:frameOrigin(clip,n,{mediaTime:n,width:100,height:80},image)});}for(const n of [1,2])s=upsertStep(s,{id:`step-${n}`,beforeMomentId:`moment-${n}`,afterMomentId:`moment-${n+1}`,title:`Step ${n}`,intent:'Align the edge',visibleChange:'A visible authored change',sensoryCue:'',recoveryCue:'Pause if the edge drifts'});return s;}

function study(values,decisions){return {format:CUE_FORMAT,comparison:{format:'skill-translator.decision-comparison/v1',relationship:'unresolved',explanation:'',examples:values.map((_,i)=>{const s=source(),hash=String(i+1).repeat(64);s.clip.sha256=hash;for(const m of s.moments)m.origin.clip.sha256=hash;return {source:s,stepId:'step-1'};})},cues:values[0].map((_,i)=>({id:'cue'+i,label:'Cue '+i,basis:'Explicit authored control'})),rows:values.map((v,i)=>({decision:decisions[i],basis:'Authored decision',values:v}))};}

export {source,study};

