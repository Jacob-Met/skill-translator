import {importNumericCueStudy} from './numeric-cue-thresholds.mjs';
import {inspectNumericTraceStudy} from './numeric-trace-readings.mjs';
import {importDecisionComparison} from './decision-comparison.mjs';
import {validateSequence} from './demonstration-sequence.mjs';
import {assertImageMatches,MAX_IMAGE_BYTES} from './capture.mjs';
import {importJointNumericStudy,inspectJointNumericStudy,JOINT_NUMERIC_FORMAT} from './joint-numeric-cues.mjs';
export const JOINT_PRODUCER_FORMAT='skill-translator.joint-numeric-cues/v2';
const check=(ok,message)=>{if(!ok)throw Error(message);};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function checkJointCapacity(raw){check(new TextEncoder().encode(JSON.stringify(raw)).length<=8*1024*1024,'Complete paired inputs exceed 8 MiB');}
async function sequenceBundle(raw,expected,budget){
 check(raw?.format==='skill-translator.sequence-bundle/v1','Retain an original sequence bundle');
 const source=validateSequence(raw.sequence);check(same(source,expected),'Original frame bundle differs from numeric source');
 check(Array.isArray(raw.frames)&&raw.frames.length===source.moments.length,'Retain every original PNG');
 const frames=new Map();for(const f of raw.frames){check(f&&typeof f.momentId==='string'&&!frames.has(f.momentId),'Unique original frame identities required');frames.set(f.momentId,f.pngBase64);}
 for(const m of source.moments){
  const data=frames.get(m.id);check(typeof data==='string'&&data.length&&data.length%4===0&&data.length<=Math.ceil(MAX_IMAGE_BYTES/3)*4&&/^[A-Za-z0-9+/]+={0,2}$/.test(data),'Invalid retained PNG encoding');
  const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));check(bytes.length<=MAX_IMAGE_BYTES,'Retained PNG exceeds image capacity');
  budget.bytes+=bytes.length;budget.pixels+=m.image.widthPx*m.image.heightPx;check(budget.bytes<=32*1024*1024&&budget.pixels<=32_000_000,'Original numeric export exceeds shared image budget');
  check(bytes.length>=33&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v),'Retain PNG file bytes');
  const view=new DataView(bytes.buffer);check(view.getUint32(8)===13&&String.fromCharCode(...bytes.slice(12,16))==='IHDR','Retain the original PNG header');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
  assertImageMatches({source:{image:m.image}},{...m.image,sha256:hash,widthPx:view.getUint32(16),heightPx:view.getUint32(20)});
 }
}
export async function receiveNumericProducer(raw){
 const bundle=raw?.format==='skill-translator.numeric-cue-bundle/v1'||raw?.format==='skill-translator.numeric-cue-bundle/v2';
 const value=bundle?raw.study:raw;
 const traced=value?.format==='skill-translator.numeric-cue-thresholds/v2';
 const numeric=traced?inspectNumericTraceStudy(value).derived:importNumericCueStudy(value);
 if(!bundle)return {numeric,evidence:'raw-numeric-record',bundle:false};
 check((raw.format.endsWith('/v2'))===traced,'Numeric bundle version must match its retained study');
 check(raw.comparison?.format==='skill-translator.decision-comparison-bundle/v1','Retain the complete original comparison bundle');
 const comparison=importDecisionComparison(raw.comparison.study);check(same(comparison,numeric.comparison),'Numeric study differs from original comparison');
 check(Array.isArray(raw.comparison.sources)&&raw.comparison.sources.length===comparison.examples.length,'Retain every comparison source');
 const budget={bytes:0,pixels:0};
 for(let i=0;i<comparison.examples.length;i++)await sequenceBundle(raw.comparison.sources[i],comparison.examples[i].source,budget);
 check(!!raw.target===!!numeric.target,'Retain matching target source evidence');
 if(numeric.target)await sequenceBundle(raw.target,numeric.target.source,budget);
 return {numeric,evidence:'original-PNG-digest-and-header-matched; decoded-pixels-not-checked-here',bundle:true};
}
export async function inspectJointProducerStudy(raw){
 checkJointCapacity(raw);
 if(raw?.format===JOINT_NUMERIC_FORMAT)return inspectJointNumericStudy(raw);
 check(raw?.format===JOINT_PRODUCER_FORMAT&&Array.isArray(raw.producer_exports)&&raw.producer_exports.length===2,'Retain exactly two original producer exports');
 const received=[];for(const value of raw.producer_exports)received.push(await receiveNumericProducer(value));
 const normalized=importJointNumericStudy({format:JOINT_NUMERIC_FORMAT,cues:received.map(r=>r.numeric),directions:raw.directions,basis:raw.basis});
 const report=inspectJointNumericStudy(normalized);
 const study={format:JOINT_PRODUCER_FORMAT,producer_exports:structuredClone(raw.producer_exports),directions:normalized.directions,basis:normalized.basis};
 checkJointCapacity(study);
 return {...report,study,normalizedStudy:normalized,producerEvidence:received.map(r=>r.evidence)};
}
