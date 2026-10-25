import {proposePathCorrespondences} from '/src/path-correspondence.mjs';
import {mountPathTimingPlayback} from '/web/path-timing-playback.mjs';
import {createPathTiming,inspectPathTiming} from '/src/path-timing.mjs';
import {readTimingPath,readPathTimingBundle,makePathTimingBundle} from '/web/path-timing-input.mjs';
import {releaseSequenceAssets} from '/web/sequence-input.mjs';
const $=id=>document.getElementById(id);
const state={left:null,right:null,study:null,leftAssets:new Map(),rightAssets:new Map()};let generation=0,proposalBasis=null;
const pending={left:null,right:null,study:null};
const playback=mountPathTimingPlayback($('clip-playback'));
function invalidate(){generation++;for(const kind of ['left','right','study']){pending[kind]?.abort();pending[kind]=null;}}
const say=message=>{$('status').textContent=message;};
const fmt=value=>Number(value.toPrecision(6)).toString();
function node(tag,text,parent){const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(parent)parent.append(element);return element;}
function pair(list,key,value){node('dt',key,list);node('dd',value,list);}
function render(){
 retireProposalBasis();
 playback.update(state.study);
 $('sources').textContent=['left','right'].map((side,index)=>`${index===0?'First':'Second'}: ${state[side]?.sequence.title??'not loaded'}`).join(' · ');
 $('match-fields').disabled=!(state.left&&state.right);
 $('proposal-fields').disabled=!(state.left&&state.right);
 $('proposals').replaceChildren();$('proposal-evidence').replaceChildren();
 $('remove').disabled=!state.study?.correspondences.length;$('save').disabled=!state.study;
 for(const side of ['left','right'])for(const end of ['from','to']){
  const select=$(side+'-'+end),prior=select.value;select.replaceChildren();
  for(const sample of state[side]?.samples??[]){const moment=state[side].sequence.moments.find(m=>m.id===sample.momentId);const option=node('option',`${moment.label} · ${fmt(moment.origin.mediaTimeSeconds)} s${sample.markId===null?' · missing position':''}`,select);option.value=sample.momentId;}
  const last=state.study?.correspondences.at(-1)?.[side].toMomentId;
  if(end==='from'&&last)select.value=last;else if([...select.options].some(o=>o.value===prior))select.value=prior;
  if(end==='to'&&select.options.length)select.selectedIndex=select.options.length-1;
 }
 const target=$('results');target.replaceChildren();if(!state.study){node('p','No interval comparison yet.',target);return;}
 const result=inspectPathTiming(state.study);
 node('p',`Matched intervals total: first ${fmt(result.matchedElapsedSeconds.left)} s; second ${fmt(result.matchedElapsedSeconds.right)} s. Only declared intervals contribute.`,target);
 for(const [index,row] of result.rows.entries()){
  const article=node('article',undefined,target);node('h3',`${index+1}. ${row.label}`,article);node('p',row.basis,article);
  node('p',`Second / first elapsed time: ${fmt(row.elapsedRatio)}×; difference ${fmt(row.elapsedDifferenceSeconds)} s.`,article).className='metric';
  const columns=node('div',undefined,article);columns.className='columns';
  for(const side of ['left','right']){const data=row[side],part=node('div',undefined,columns);node('h4',side==='left'?'First demonstration':'Second demonstration',part);const dl=node('dl',undefined,part);
   pair(dl,'Presented times',`${fmt(data.startSeconds)}–${fmt(data.endSeconds)} s`);pair(dl,'Elapsed',`${fmt(data.elapsedSeconds)} s`);pair(dl,'Share of matched time',`${fmt(100*data.shareOfMatchedTime)}%`);
   pair(dl,'Sampled chord sum',data.complete?`${fmt(data.sampledChordDistanceMm)} mm`:`Incomplete; ${fmt(data.coveredChordDistanceMm)} mm across known adjacent samples`);
   pair(dl,'Chord sum / elapsed',data.complete?`${fmt(data.sampledChordDistancePerSecond)} mm/s (sampled quantity)`:'Unavailable: a selected observation is missing');
   pair(dl,'Reference',`${result.references[side].label}: ${result.references[side].basis}`);
   const details=node('details',undefined,part);node('summary','Inspect source samples and gaps',details);const list=node('ul',undefined,details);
   for(const sample of data.samples){const item=node('li',`${sample.momentLabel} (${sample.momentId}) · presented ${fmt(sample.presentedSeconds)} s · ${sample.position?`(${fmt(sample.position.xMm)}, ${fmt(sample.position.yMm)}) mm`:'missing position'} · ${sample.basis}`,list);const asset=state[side+'Assets'].get(sample.momentId);if(asset){const image=node('img',undefined,item);image.src=asset.media.url;image.alt=`Original retained frame: ${sample.momentLabel}`;image.loading='lazy';image.className='source-frame';}}
   node('p',data.unselectedMoments.length?`Unselected retained moments inside this interval: ${data.unselectedMoments.map(m=>`${m.label} (${fmt(m.presentedSeconds)} s)`).join('; ')}.`:'No other retained moments inside this interval. Motion between samples remains unobserved.',details);
  }
  node('p',row.sampledChordDifferenceMm===null?'A missing selected sample prevents comparing complete sampled chord sums.':`Second minus first sampled chord sum: ${fmt(row.sampledChordDifferenceMm)} mm. Sampling density and each declared calibration affect this comparison.`,article);
 }
 node('p',result.boundary,target).className='boundary';
}
async function readFile(input,kind){
 const file=input.files?.[0];input.value='';if(!file)return;
 if(kind==='study')invalidate();else{generation++;pending.study?.abort();pending.study=null;pending[kind]?.abort();pending[kind]=null;}
 const operation=new AbortController();pending[kind]=operation;const signal=operation.signal,isCurrent=()=>pending[kind]===operation&&!signal.aborted;let received=null;
 function releaseReceived(){if(!received)return;if(kind==='study'){releaseSequenceAssets(received.leftAssets);releaseSequenceAssets(received.rightAssets);}else releaseSequenceAssets(received.assets);received=null;}
 say('Reading original frames; accepted evidence remains until admission.');
 try{
  received=kind==='study'?await readPathTimingBundle(file,{signal}):await readTimingPath(file,{signal});
  if(!isCurrent()){releaseReceived();return;}
  if(kind==='study'){
   inspectPathTiming(received.study);releaseSequenceAssets(state.leftAssets);releaseSequenceAssets(state.rightAssets);
   state.left=received.study.paths.left;state.right=received.study.paths.right;state.study=received.study;state.leftAssets=received.leftAssets;state.rightAssets=received.rightAssets;
  }else{
   releaseSequenceAssets(state[kind+'Assets']);state[kind]=received.study;state[kind+'Assets']=received.assets;state.study=null;
  }
  received=null;generation++;pending[kind]=null;$('proposal-confirm').checked=false;$('proposal-state').checked=false;render();say(kind==='study'?'Comparison reopened with both verified original frame bundles.':'Original path and frames accepted. Declare interval matches for the currently paired sources.');
 }catch(error){releaseReceived();if(isCurrent())say('Not accepted: '+error.message+'. Existing accepted work is unchanged.');}
 finally{if(pending[kind]===operation)pending[kind]=null;}
}
for(const side of ['left','right'])$(side+'-file').addEventListener('change',event=>readFile(event.target,side));
$('study-file').addEventListener('change',event=>readFile(event.target,'study'));
// Proposals are recomputed from the currently admitted original paths and never
// become saved correspondences until the ordinary authored form is submitted.
function showProposalEvidence(proposal){
 const row=inspectPathTiming(createPathTiming(state.left,state.right,[{...proposal,label:'Unaccepted geometric interval proposal'}])).rows[0],target=$('proposal-evidence');target.replaceChildren();
 const heading=node('h3','Review the proposed original endpoints',target);heading.tabIndex=-1;node('p','These are original retained frames with the selected annotated point. Inspect their meaning before naming and adding this interval.',target);
 const grid=node('div',undefined,target);grid.className='columns';
 for(const side of ['left','right'])for(const [index,sample] of [row[side].samples[0],row[side].samples.at(-1)].entries()){
  const card=node('figure',undefined,grid),asset=state[side+'Assets'].get(sample.momentId);if(!asset)throw Error('An original endpoint image is unavailable.');
  node('figcaption',`${side==='left'?'First':'Second'} demonstration · ${index?'End':'Start'} · ${sample.momentLabel} · ${fmt(sample.presentedSeconds)} s`,card);
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${sample.image.widthPx} ${sample.image.heightPx}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',`Original retained endpoint ${sample.momentLabel} with selected annotation`);svg.classList.add('proposal-frame');
  const image=document.createElementNS(ns,'image');image.setAttribute('href',asset.media.url);image.setAttribute('width',sample.image.widthPx);image.setAttribute('height',sample.image.heightPx);svg.append(image);
  if(sample.sourcePx){const point=document.createElementNS(ns,'circle');for(const[k,v]of Object.entries({cx:sample.sourcePx.x,cy:sample.sourcePx.y,r:Math.max(sample.image.widthPx,sample.image.heightPx)/45,fill:'none',stroke:'#b73320','stroke-width':3}))point.setAttribute(k,v);svg.append(point);}
  card.append(svg);node('p',sample.basis,card);const moment=state[side].sequence.moments.find(m=>m.id===sample.momentId);node('p',moment.visibleState?`Authored visible state: ${moment.visibleState}`:'No visible-state description supplied; this sample has no category constraint.',card);
 }
 heading.focus();
}
function retireProposalBasis(){if(proposalBasis!==null&&$('basis').value===proposalBasis)$('basis').value='';proposalBasis=null;}
function clearProposals(){ retireProposalBasis();$('proposals').replaceChildren();$('proposal-evidence').replaceChildren(); }
for(const id of ['proposal-confirm','proposal-distance','proposal-state'])$(id).addEventListener('input',clearProposals);
for(const side of ['left','right'])for(const end of ['from','to'])$(side+'-'+end).addEventListener('change',()=>{
 retireProposalBasis();$('proposal-evidence').replaceChildren();
});
$('propose').addEventListener('click',()=>{
 clearProposals();
 try{
  if(!state.left||!state.right)throw Error('Open both original paths first.');
  const raw=$('proposal-distance').value;
  if(!raw.trim())throw Error('Supply a geometric discrepancy bound.');
  const report=proposePathCorrespondences(state.left,state.right,{sameCoordinateFrame:$('proposal-confirm').checked,maxDistanceMm:Number(raw),sharedVisibleStateCategories:$('proposal-state').checked}),target=$('proposals');
  const descriptions={
   'missing-observations':'A selected position is missing. No alignment is proposed; missing samples are not bridged.',
   'no-alignment':report.stateConstraint?'No full monotone alignment satisfies both the bound and declared literal categories. No interval endpoints are proposed.':'No full monotone alignment fits this bound. No interval endpoints are proposed.',
   'endpoints-only':'No internal correspondence is forced across all admitted alignments. Endpoint intervals do not resolve the internal ambiguity.',
   'internal-correspondences':'Internal sample correspondences shared by every admitted alignment were found.'
  };
  node('p',descriptions[report.status],target);
  node('p',`${report.alignmentCount} admissible full alignments; ${report.forcedPairs.length} forced sample pairs; ${report.ambiguousPairs.length} optional pairs.`,target);
  node('p',report.boundary,target);
  if(Number.isInteger(report.stateConstraint?.excludedGeometricPairs))node('p',`${report.stateConstraint.excludedGeometricPairs} otherwise geometric sample pairs have different nonempty category text. Unlabeled selected samples remain unconstrained: first ${report.stateConstraint.unknownSamples.left.length}, second ${report.stateConstraint.unknownSamples.right.length}.`,target);
  const last=state.study?.correspondences.at(-1);
  for(const [index,row] of report.proposals.entries()){
   const afterLast=['left','right'].every(side=>!last||state[side].samples.findIndex(s=>s.momentId===row[side].fromMomentId)>=state[side].samples.findIndex(s=>s.momentId===last[side].toMomentId));
   const button=node('button',`Fill proposed interval ${index+1}: ${row.left.fromMomentId} → ${row.left.toMomentId} / ${row.right.fromMomentId} → ${row.right.toMomentId}`,target);button.type='button';button.disabled=!afterLast;
   button.addEventListener('click',()=>{
    for(const side of ['left','right'])for(const end of ['from','to'])$(side+'-'+end).value=row[side][end+'MomentId'];
    showProposalEvidence(row);$('basis').value=row.basis;$('label').value='';proposalBasis=row.basis;
    say('Proposed endpoints filled. Review or change them, name the action and confirm its correspondence before adding the interval.');
   });
  }
 }catch(error){say(error.message);}
});
$('match-form').addEventListener('submit',event=>{event.preventDefault();try{
 const row={label:$('label').value,basis:$('basis').value,left:{fromMomentId:$('left-from').value,toMomentId:$('left-to').value},right:{fromMomentId:$('right-from').value,toMomentId:$('right-to').value}};
 const accepted=createPathTiming(state.left,state.right,[...(state.study?.correspondences??[]),row]);inspectPathTiming(accepted);invalidate();state.study=accepted;proposalBasis=null;render();$('label').value='';$('basis').value='';say('Corresponding interval retained.');
 }catch(error){say(error.message);}});
$('remove').addEventListener('click',()=>{if(!state.study)return;invalidate();const rows=state.study.correspondences.slice(0,-1);state.study=rows.length?createPathTiming(state.left,state.right,rows):null;render();say('Last interval removed. Original paths are retained.');});
$('save').addEventListener('click',async()=>{if(!state.study)return;const token=generation,study=state.study;try{const blob=await makePathTimingBundle(study,state.leftAssets,state.rightAssets);if(token!==generation||study!==state.study)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='demonstration-path-timing.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('Complete comparison and both original frame bundles downloaded.');}catch(error){if(token===generation)say(`Cannot save: ${error.message}`);}});
addEventListener('pagehide',event=>{if(!event.persisted){invalidate();releaseSequenceAssets(state.leftAssets);releaseSequenceAssets(state.rightAssets);state.leftAssets=new Map();state.rightAssets=new Map();}});
render();

