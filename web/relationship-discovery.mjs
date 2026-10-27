import {renderSharedMotionPractice} from '/web/shared-motion-practice-view.mjs';
import {createSharedMotionPractice,importSharedMotionPractice,assessSharedMotionPractice} from '/src/shared-motion-practice.mjs';
import {createPractice} from '/src/practice.mjs';
import {renderSharedMotionSpans} from '/web/shared-motion-spans-view.mjs';
import {renderSharedMotionGroups} from '/web/shared-motion-groups-view.mjs';
import {createSequenceDiscovery,sequenceDiscoveryInputs} from '/src/sequence-discovery.mjs';
import {readSequenceDiscoveryBundle,makeSequenceDiscoveryBundle,SEQUENCE_DISCOVERY_BUNDLE_FORMAT,MAX_DISCOVERY_BUNDLE_BYTES} from '/web/sequence-discovery-input.mjs';
import {releaseSequenceAssets} from '/web/sequence-input.mjs';
import {createDiscoveredPairReview} from '/src/discovered-pair-review.mjs';
import {DISCOVERY_FORMAT,importRelationshipDiscovery,discoverRelationships,compareDiscoveredTransfer} from '/src/relationship-discovery.mjs';
import {derive} from '/src/geometry.mjs';
const $=id=>document.getElementById(id);let study=null,result=null,revision=0,sequenceEvidence=null,pending=null,motionPractice=null,motionPracticeReport=null;
const MOTION_PRACTICE_BUNDLE_FORMAT='skill-translator.shared-motion-practice-bundle/v1';
const MAX_MOTION_PRACTICE_BYTES=MAX_DISCOVERY_BUNDLE_BYTES+256*1024+8192;
function invalidate(){pending?.abort();pending=null;return ++revision;}
const ns='http://www.w3.org/2000/svg';
function node(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
function svg(tag,attrs){const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;}
function accept(raw,evidence=null,comparison=null){
 // Stage all source/session validation and derived results before the one commit.
 const checked=importRelationshipDiscovery(raw),computed=discoverRelationships(checked);
 const record=comparison?createSharedMotionPractice(checked,comparison.session,{fitToleranceMm:comparison.fitToleranceMm,basis:comparison.basis}):null;
 const assessment=record?assessSharedMotionPractice(record):null,previous=sequenceEvidence;
 study=checked;result=computed;sequenceEvidence=evidence;motionPractice=record;motionPracticeReport=assessment;
 invalidate();$('deviation').value=study.deviationMm;$('save').disabled=false;$('motionPracticeStart').disabled=false;$('error').textContent='';$('transfer').textContent='';
 render();renderSharedMotionGroups(study,sequenceEvidence);renderSharedMotionSpans(study,sequenceEvidence);renderSharedMotionPractice(motionPractice,motionPracticeReport);
 if(previous&&previous.assets!==evidence?.assets)releaseSequenceAssets(previous.assets);
}
function render(){
 $('sequenceContext').textContent=sequenceEvidence?`Original demonstration: ${sequenceEvidence.account.sequence.title}. ${sequenceEvidence.sources.length} calibrated moments analyzed; ${sequenceEvidence.uncalibratedMoments.length} uncalibrated moments retained but not analyzed${sequenceEvidence.uncalibratedMoments.length?': '+sequenceEvidence.uncalibratedMoments.map(m=>m.label).join(', '):''}. Common-plane / identity basis: ${sequenceEvidence.account.declarations.basis}. These are sampled moments from one clip, not independent successful executions.`:'';
 $('summary').textContent=`${study.demonstrations.length} sources; ${result.candidates.length} automatically enumerated pair relationships: ${result.counts.repeatable} repeatable, ${result.counts.contradicted} contradicted, ${result.counts.incomplete} incomplete. Accepted maximum observed range: ${study.deviationMm} mm. No pair or relation type was supplied.`;
 $('limits').textContent=result.limitation;
 const previous=$('candidate').value;$('candidate').replaceChildren();
 for(const c of result.candidates.filter(c=>$('filter').value==='all'||c.status==='repeatable')){const o=node('option',`${c.from} → ${c.to} · ${c.kind} · ${c.status}`);o.value=c.id;$('candidate').append(o);}
 if([...$('candidate').options].some(o=>o.value===previous))$('candidate').value=previous;detail();
}
function detail(){
 $('transfer').textContent='';$('sourcesView').replaceChildren();const c=result?.candidates.find(c=>c.id===$('candidate').value);
 if(!c){$('finding').textContent='No candidates in this view. Choose all candidates to inspect contradictions or missing evidence.';return;}
 $('finding').textContent=`${c.kind}: ${c.minMm.toFixed(3)}–${c.maxMm.toFixed(3)} mm; observed range ${c.spreadMm.toFixed(3)} mm. ${c.status}. Extremes: ${c.witnesses.minimum} and ${c.witnesses.maximum}.`;
 for(const [i,row] of study.demonstrations.entries()){
  const card=node('article');card.className='source-card';card.append(node('h3',row.annotation.title||row.id),node('p',`${row.id} · ${row.evidenceClass}`));
  const reading=c.readings[i];card.append(node('p',reading.valueMm===null?`Unobserved pair: missing ${reading.missing.join(', ')}`:`${reading.valueMm.toFixed(3)} mm`));
  const d=derive(row.annotation),w=d.source.widthMm,h=d.source.heightMm,scale=Math.min(260/w,160/h),x=20,y=15;
  const view=svg('svg',{viewBox:'0 0 300 190',role:'img','aria-label':`${row.id}: calibrated ${c.from} to ${c.to} pair`});view.append(svg('rect',{x,y,width:w*scale,height:h*scale,fill:'#e4eee7',stroke:'#668574'}));
  const originalIds=reading.sourcePointIds?[reading.sourcePointIds.from,reading.sourcePointIds.to]:[c.from,c.to];if(reading.sourcePointIds)card.append(node('p',`Reviewed mapping: ${c.from} → ${originalIds[0]}; ${c.to} → ${originalIds[1]}. Original source IDs shown below.`));const points=originalIds.map(id=>d.landmarks.find(m=>m.id===id));
  if(points.every(Boolean))view.append(svg('line',{x1:x+points[0].uv.u*w*scale,y1:y+points[0].uv.v*h*scale,x2:x+points[1].uv.u*w*scale,y2:y+points[1].uv.v*h*scale,stroke:'#0d6746','stroke-width':2}));
  for(const m of points.filter(Boolean)){view.append(svg('circle',{cx:x+m.uv.u*w*scale,cy:y+m.uv.v*h*scale,r:4,fill:'#b45d13'}));const label=svg('text',{x:x+m.uv.u*w*scale+7,y:y+m.uv.v*h*scale-5,'font-size':12});label.textContent=m.id;view.append(label);}
  card.append(view,node('p',`${w} × ${h} mm. Diagram of supplied annotations${sequenceEvidence?'; source pixels below':'; original image pixels are not verified here'}.`));
  if(sequenceEvidence){const source=sequenceEvidence.sources[i],moment=sequenceEvidence.account.sequence.moments.find(m=>m.id===source.momentId),asset=sequenceEvidence.assets.get(moment.id);const original=svg('svg',{viewBox:`0 0 ${moment.image.widthPx} ${moment.image.heightPx}`,role:'img','aria-label':`${source.label}: original retained frame and supplied mark locations`});original.append(svg('image',{href:asset.media.url,width:moment.image.widthPx,height:moment.image.heightPx}));for(const mark of row.annotation.landmarks.filter(m=>originalIds.includes(m.id)))original.append(svg('circle',{cx:mark.sourcePx.x,cy:mark.sourcePx.y,r:Math.max(3,moment.image.widthPx/100),fill:'none',stroke:'#ffb328','stroke-width':Math.max(2,moment.image.widthPx/300)}));card.append(original,node('p',`${source.label} · presented ${source.presentedSeconds} s. Original PNG identity verified; point meanings and calibration remain supplied.`));}
  $('sourcesView').append(card);
 }
}
function refuse(error){$('error').textContent=`Input refused; retained investigation unchanged. ${error.message}`;}
$('analyze').onclick=async()=>{
 const token=invalidate();try{
  if(!$('identities').checked)throw Error('Confirm corresponding mark IDs first.');
  const files=[...$('sources').files];if(files.length<2||files.length>12)throw Error('Choose 2–12 annotation files.');
  if(files.reduce((s,f)=>s+f.size,0)>1_900_000)throw Error('Keep source files below 1.9 MB combined.');
  const category=$('evidence').value,deviation=Number($('deviation').value);
  const annotations=await Promise.all(files.map(f=>f.text().then(JSON.parse)));if(token!==revision)return;
  accept({format:DISCOVERY_FORMAT,deviationMm:deviation,demonstrations:annotations.map((annotation,i)=>({id:`source-${i+1}`,annotation,evidenceClass:category,correspondenceConfirmed:true}))});$('status').textContent='Original annotations retained. Pair candidates inferred from all supplied sources.';
 }catch(error){if(token===revision)refuse(error);}
};
$('reopen').onchange=async event=>{
 const token=invalidate(),file=event.target.files?.[0];event.target.value='';if(!file)return;
 let received=null;
 try{
  if(file.size>MAX_MOTION_PRACTICE_BYTES)throw Error('File exceeds the complete original-source and practice account limit.');
  const raw=JSON.parse(await file.text());if(token!==revision)return;
  const savedPractice=raw?.format===MOTION_PRACTICE_BUNDLE_FORMAT;
  if(!savedPractice&&file.size>MAX_DISCOVERY_BUNDLE_BYTES)throw Error('File exceeds the complete original-frame account limit.');
  if(savedPractice&&(!raw.comparison||typeof raw.comparison!=='object'))throw Error('A saved comparison needs its original practice inputs.');
  const original=savedPractice?raw.discovery:raw,comparison=savedPractice?raw.comparison:null;
  if(original?.format===SEQUENCE_DISCOVERY_BUNDLE_FORMAT){
   pending=new AbortController();
   received=await readSequenceDiscoveryBundle(new Blob([JSON.stringify(original)],{type:'application/json'}),{signal:pending.signal});
   if(token!==revision){releaseSequenceAssets(received.assets);return;}
   const derived=sequenceDiscoveryInputs(received.account);
   accept(derived.study,{...derived,assets:received.assets},comparison);
  }else accept(original,null,comparison);
  $('status').textContent=savedPractice?'Recomputed every group, original-source fit and retained actual round from the saved inputs.':'Recomputed every candidate from the retained original annotations.';
 }catch(error){
  if(received&&received.assets!==sequenceEvidence?.assets)releaseSequenceAssets(received.assets);
  if(token===revision)refuse(error);
 }
};
for(const id of ['sources','identities','evidence','deviation'])$(id).addEventListener('input',()=>{invalidate();});
$('deviation').addEventListener('change',()=>{if(study)try{
 if(sequenceEvidence){const account=createSequenceDiscovery(sequenceEvidence.account.sequence,{...sequenceEvidence.account.declarations,deviationMm:Number($('deviation').value)});const derived=sequenceDiscoveryInputs(account);accept(derived.study,{...derived,assets:sequenceEvidence.assets},motionPractice);}
 else accept({...study,deviationMm:Number($('deviation').value)},null,motionPractice);
}catch(error){refuse(error);}});
$('filter').onchange=()=>{if(result)render();};$('candidate').onchange=detail;
for(const id of ['width','height'])$(id).oninput=()=>{$('transfer').textContent='';};
$('compare').onclick=()=>{try{if(!study)throw Error('Open an investigation first.');const r=compareDiscoveredTransfer(study,Number($('width').value),Number($('height').value)),c=r.candidates.find(c=>c.id===$('candidate').value);if(!c)throw Error('Select a candidate.');$('transfer').textContent=`Existing authored adaptation: ${c.authoredTargetMm.toFixed(3)} mm; ${c.outsideObservedRangeMm.toFixed(3)} mm outside the observed range. Candidate status remains ${c.status}; no rule or score changed.`;$('error').textContent='';}catch(error){$('error').textContent=error.message;}};
$('save').onclick=async()=>{if(!study)return;const token=revision;try{const blob=sequenceEvidence?await makeSequenceDiscoveryBundle(sequenceEvidence.account,sequenceEvidence.assets):new Blob([JSON.stringify(importRelationshipDiscovery(study),null,2)+'\n'],{type:'application/json'});if(token!==revision)return;const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=sequenceEvidence?'skill-demonstrated-relationships.json':'skill-relationship-discovery.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){if(token===revision)refuse(error);}};
$('example').onclick=()=>{
 const annotation=(points,w,h)=>({title:'Authored rotated point pair',provenance:'Analytic authored control; no physical demonstration',source:{widthMm:w,heightMm:h,corners:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}]},landmarks:points.map((p,i)=>({id:i?'b':'a',label:i?'B':'A',kind:'fraction',sourcePx:{x:p[0],y:p[1]},toleranceMm:1}))});
 accept({format:DISCOVERY_FORMAT,deviationMm:.001,demonstrations:[annotation([[20,30],[50,70]],200,150),annotation([[80,40],[40,70]],240,180)].map((a,i)=>({id:`example-${i}`,annotation:a,evidenceClass:'authored-example',correspondenceConfirmed:true}))});$('status').textContent='Authored example: rotated pair preserves distance while directed components change.';
};

$('reviewPair').onclick=()=>{try{if(!$('reviewTolerance').value.trim())throw Error('Declare a comparison tolerance independently of the exploratory range.');const record=createDiscoveredPairReview(study,$('candidate').value,{widthMm:Number($('width').value),heightMm:Number($('height').value),toleranceMm:Number($('reviewTolerance').value),basis:$('reviewBasis').value});sessionStorage.setItem('skill-translator-discovered-pair/v1',JSON.stringify(record));location.assign('/pair-interpretations');}catch(error){$('error').textContent=error.message;}};

$('openFamilies').onclick=()=>{try{if(!study)throw Error('Open original demonstrations first.');const target={widthMm:Number($('width').value),heightMm:Number($('height').value)};if(!Object.values(target).every(v=>Number.isFinite(v)&&v>=1&&v<=10000))throw Error('Target dimensions must be 1–10000 mm.');sessionStorage.setItem('skill-translator-relationship-families/v1',JSON.stringify({study:importRelationshipDiscovery(study),target}));location.assign('/relationship-families');}catch(error){$('error').textContent=error.message;}};


$('analyzeSequence').onclick=async()=>{const token=invalidate();let received=null;try{const file=$('sequenceSource').files?.[0];const options={correspondenceConfirmed:$('sequenceIdentities').checked,commonFixedPlaneConfirmed:$('sequencePlane').checked,basis:$('sequenceBasis').value,evidenceClass:$('evidence').value,deviationMm:Number($('deviation').value)};pending=new AbortController();received=await readSequenceDiscoveryBundle(file,{signal:pending.signal});if(token!==revision){releaseSequenceAssets(received.assets);return;}const account=received.account??createSequenceDiscovery(received.sequence,options),derived=sequenceDiscoveryInputs(account);accept(derived.study,{...derived,assets:received.assets});$('status').textContent='All calibrated original moments received together. Every pair was enumerated by the maintained discovery mechanism; no separate annotation exports were required.';}catch(error){if(received&&received.assets!==sequenceEvidence?.assets)releaseSequenceAssets(received.assets);if(token===revision)refuse(error);}};
for(const id of ['sequenceSource','sequenceIdentities','sequencePlane','sequenceBasis'])$(id).addEventListener('input',invalidate);

function practiceParameters(){
 if(!$('motionPracticeTolerance').value.trim())throw Error('Declare a practice fitted-residual tolerance independently of the original exploratory threshold.');
 return {fitToleranceMm:Number($('motionPracticeTolerance').value),basis:$('motionPracticeBasis').value};
}
function practiceReady(){
 return !!motionPractice&&$('motionPracticeTolerance').value.trim()!==''&&Number($('motionPracticeTolerance').value)===motionPractice.fitToleranceMm&&$('motionPracticeBasis').value===motionPractice.basis;
}
function acceptPractice(record,assessment){
 motionPractice=record;motionPracticeReport=assessment;invalidate();$('error').textContent='';renderSharedMotionPractice(record,assessment);
}
$('motionPracticeStart').onclick=()=>{
 try{
  if(!study)throw Error('Open original demonstrations first.');
  const demo=study.demonstrations[0].annotation,widthMm=Number($('width').value),heightMm=Number($('height').value);
  createPractice(demo,widthMm,heightMm);
  sessionStorage.setItem('skill-translator-practice-input/v1',JSON.stringify({demo,widthMm,heightMm,mirrored:false,showGoals:true}));
  const opened=window.open('/practice','_blank');
  if(!opened)throw Error('Allow the practice tab to open, then try again.');
  $('motionPracticeStatus').textContent='An empty '+widthMm+' × '+heightMm+' mm session opened for the first original source. Place marks in Practice, export the session, then open that file here.';
 }catch(error){refuse(error);}
};
for(const id of ['motionPracticeTolerance','motionPracticeBasis'])$(id).addEventListener('input',()=>{
 invalidate();$('motionPracticeSave').disabled=!practiceReady();
 if(motionPractice)$('motionPracticeStatus').textContent='Edited parameters have not been applied. The displayed comparison still uses '+motionPractice.fitToleranceMm+' mm and its retained basis. Recompute to apply the edits.';
});
$('motionPracticeSession').onchange=async event=>{
 const token=invalidate(),file=event.target.files?.[0];event.target.value='';if(!file)return;
 const original=study;
 try{
  if(!original)throw Error('Open original demonstrations first.');
  if(file.size>256*1024)throw Error('Practice session must be at most 256 KB.');
  const options=practiceParameters(),text=await file.text();if(token!==revision)return;
  const record=createSharedMotionPractice(original,JSON.parse(text),options),assessment=assessSharedMotionPractice(record);
  acceptPractice(record,assessment);$('status').textContent='Every inferred group was compared with every original source for every retained actual round.';
 }catch(error){if(token===revision)refuse(error);}
};
$('motionPracticeRecompute').onclick=()=>{
 try{
  if(!motionPractice)throw Error('Open an actual practice session first.');
  const record=createSharedMotionPractice(study,motionPractice.session,practiceParameters()),assessment=assessSharedMotionPractice(record);
  acceptPractice(record,assessment);
 }catch(error){refuse(error);}
};
$('motionPracticeSave').onclick=async()=>{
 const token=revision,original=study,evidence=sequenceEvidence;
 try{
  if(!practiceReady())throw Error('Recompute the current comparison parameters before saving.');
  const record=importSharedMotionPractice(motionPractice);
  const discovery=evidence?JSON.parse(await (await makeSequenceDiscoveryBundle(evidence.account,evidence.assets)).text()):importRelationshipDiscovery(original);
  if(token!==revision)return;
  const raw={format:MOTION_PRACTICE_BUNDLE_FORMAT,discovery,comparison:{session:record.session,fitToleranceMm:record.fitToleranceMm,basis:record.basis}};
  const blob=new Blob([JSON.stringify(raw)],{type:'application/json'});
  if(blob.size>MAX_MOTION_PRACTICE_BYTES)throw Error('Complete source and practice account exceeds the export limit; no evidence was dropped.');
  const url=URL.createObjectURL(blob),link=node('a');link.href=url;link.download='skill-shared-motion-practice.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(error){if(token===revision)refuse(error);}
};

window.addEventListener('pagehide',event=>{invalidate();if(sequenceEvidence&&!event.persisted)releaseSequenceAssets(sequenceEvidence.assets);});

try{const raw=sessionStorage.getItem('skill-translator-mapped-discovery/v1');if(raw){accept(JSON.parse(raw));sessionStorage.removeItem('skill-translator-mapped-discovery/v1');$('status').textContent='Reviewed spatial mapping received. Original annotations and local IDs remain unchanged; repeated distances are selection-conditioned.';}}catch(error){$('error').textContent='Mapped discovery refused: '+error.message;}
