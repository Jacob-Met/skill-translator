import {validateSequence} from './demonstration-sequence.mjs';
import {importPrerequisiteRehearsal} from './prerequisite-rehearsal.mjs';
import {GeometryError} from './geometry.mjs';
export const CONTEXT_ORDER_FORMAT='skill-translator.context-order/v1';
// At 16 steps even 16! fits exactly in an IEEE754 safe integer.
export const MAX_CONTEXT_STEPS=16;
const check=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function text(v,label,max){check(typeof v==='string'&&v.trim().length>0&&v.length<=max,`${label} must contain text within ${max} characters.`);return v.trim();}
export function createContextOrder(sequence,prerequisiteRecord,definitions){
 const prerequisites=importPrerequisiteRehearsal(sequence,prerequisiteRecord),source=prerequisites.source;
 check(source.steps.length<=MAX_CONTEXT_STEPS,`This exact comparison supports at most ${MAX_CONTEXT_STEPS} authored steps; no steps were dropped.`);
 check(Array.isArray(definitions)&&definitions.length===source.steps.length,'Declare exactly one context and basis for every retained step.');
 const ids=new Set(source.steps.map(s=>s.id)),byId=new Map();
 for(const d of definitions){
  check(d&&ids.has(d.stepId)&&!byId.has(d.stepId),'Each retained step needs one distinct context declaration.');
  check(!Object.hasOwn(d,'requires'),'Use the retained prerequisite record; context declarations cannot redefine dependencies.');
  byId.set(d.stepId,{stepId:d.stepId,context:text(d.context,'Context label',80),basis:text(d.basis,'Authored context basis',1200)});
 }
 return {format:CONTEXT_ORDER_FORMAT,source,prerequisites,contexts:source.steps.map(s=>byId.get(s.id))};
}
export function importContextOrder(sequence,input){
 check(input?.format===CONTEXT_ORDER_FORMAT,'Open a context-order study.');
 check(Array.isArray(input.contexts),'Saved context declarations must be explicitly retained.');
 const base=createContextOrder(sequence,input.prerequisites,input.contexts);
 check(same(base.source,validateSequence(input.source)),'The demonstration frames or authored account changed; use the matching source.');
 return base;
}
function changes(order,contexts){let total=0;for(let i=1;i<order.length;i++)if(contexts.get(order[i-1])!==contexts.get(order[i]))total++;return total;}
export function planContextOrder(sequence,input){
 const study=importContextOrder(sequence,input),ids=study.source.steps.map(s=>s.id),n=ids.length,index=new Map(ids.map((id,i)=>[id,i]));
 const modes=study.contexts.map(d=>d.context),contexts=new Map(study.contexts.map(d=>[d.stepId,d.context])),required=new Uint16Array(n);
 for(const edge of study.prerequisites.dependencies)required[index.get(edge.after)]|=1<<index.get(edge.before);
 const full=(1<<n)-1,cells=(full+1)*n,cost=new Uint8Array(cells).fill(255),previous=new Int8Array(cells).fill(-2),ways=new Float64Array(cells);
 for(let j=0;j<n;j++)if(required[j]===0){const k=(1<<j)*n+j;cost[k]=0;previous[k]=-1;ways[k]=1;}
 let statesVisited=0;
 for(let mask=1;mask<=full;mask++)for(let last=0;last<n;last++){
  const old=mask*n+last;if(cost[old]===255)continue;statesVisited++;
  for(let next=0;next<n;next++){
   const bit=1<<next;if((mask&bit)||(required[next]&mask)!==required[next])continue;
   const k=(mask|bit)*n+next,candidate=cost[old]+(modes[last]===modes[next]?0:1);
   if(candidate<cost[k]){cost[k]=candidate;previous[k]=last;ways[k]=ways[old];}
   else if(candidate===cost[k])ways[k]+=ways[old];
  }
 }
 let minimumChanges=255,last=-1,optimalOrderCount=0;
 for(let j=0;j<n;j++){const k=full*n+j;if(cost[k]<minimumChanges){minimumChanges=cost[k];last=j;optimalOrderCount=ways[k];}else if(cost[k]===minimumChanges)optimalOrderCount+=ways[k];}
 check(last>=0&&Number.isSafeInteger(optimalOrderCount)&&optimalOrderCount>0,'The declared-order search could not produce a complete bounded result.');
 const reversed=[];let mask=full;
 while(last>=0){reversed.push(ids[last]);const prior=previous[mask*n+last];mask^=1<<last;last=prior;}
 const order=reversed.reverse(),groups=[];
 for(const id of order){const context=contexts.get(id);if(groups.at(-1)?.context===context)groups.at(-1).stepIds.push(id);else groups.push({context,stepIds:[id]});}
 const sourceViolations=study.prerequisites.dependencies.filter(e=>index.get(e.before)>index.get(e.after)).map(e=>({...e}));
 const sourceChanges=changes(ids,contexts),satisfiesDeclarations=sourceViolations.length===0;
 return {
  order,groups,minimumChanges,optimalOrderCount,
  sourceList:{order:[...ids],contextChanges:sourceChanges,satisfiesDeclarations,violations:sourceViolations},
  fewerChangesThanSourceList:satisfiesDeclarations?sourceChanges-minimumChanges:null,
  search:{exactWithinDeclaredModel:true,stepLimit:MAX_CONTEXT_STEPS,statesVisited,typedArrayBytes:cost.byteLength+previous.byteLength+ways.byteLength},
  model:'Each retained step occurs once and has one authored context label. Count one change when adjacent labels differ, with no initial-setup charge. Labels are case-sensitive after trimming.',
  boundary:'This compares sequential orders under supplied prerequisites and context labels. The source-listed order is not a measured action sequence. Fewer declared context changes does not establish less time, effort, physical feasibility, safety, readiness, completion or learning. The retained learner attempt remains unchanged.'
 };
}
