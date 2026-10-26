import {inspectSharedMotionSpans,inspectMotionSpan} from '/src/shared-motion-spans.mjs';
import {renderMotionSourceCards,renderMotionFits} from '/web/shared-motion-groups-view.mjs';
const $=id=>document.getElementById(id);
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const number=v=>Number(v.toFixed(3)).toString();
function boundaryText(name,extension){
 if(extension.status==='recording-edge')return name+': edge of the retained moments.';
 const w=extension.witness;
 if(extension.status==='uncalibrated-moment')return name+': uncalibrated retained moment '+w.momentIds.join(', ')+' breaks support.';
 if(extension.status==='missing-point')return name+': missing '+w.ids.join(', ')+' in '+w.fromMomentId+' / '+w.toMomentId+'.';
 if(extension.status==='unresolved-orientation')return name+': unresolved orientation for '+w.fromMomentId+' → '+w.toMomentId+'.';
 if(extension.status==='outside-fit-threshold')return name+': extending the span fails the fitted test at '+w.fromMomentId+' → '+w.toMomentId+' ('+number(w.maxResidualMm)+' mm).';
 return name+': this point set also fits the extended span.';
}
export function renderSharedMotionSpans(study,evidence){
 const section=$('motionSpanSection'),select=$('motionSpan'),previous=select.value;
 section.hidden=!evidence;select.replaceChildren();select.disabled=true;
 for(const id of ['motionSpanSources','motionSpanFits','motionSpanTimeline'])$(id).replaceChildren();
 for(const id of ['motionSpanSummary','motionSpanDetail','motionSpanBoundary'])$(id).textContent='';
 if(!evidence)return;
 let result;try{result=inspectSharedMotionSpans(evidence.account);}catch(error){$('motionSpanSummary').textContent='Span inference unavailable: '+error.message;return;}
 $('motionSpanLimits').textContent=result.boundary+' '+result.referencePopulation;
 if(result.status!=='complete'){$('motionSpanSummary').textContent=result.reason;return;}
 $('motionSpanSummary').textContent=result.counts.maximal+' maximal shared-motion spans from '+result.counts.pointSets+' point sets across '+result.counts.intervals+' contiguous retained-moment intervals. No group labels or interval boundaries were supplied.';
 const key=s=>s.startMomentId+':'+s.endMomentId+':'+s.ids.join(':');
 for(const span of result.spans){
  const option=node('option',number(span.startSeconds)+'–'+number(span.endSeconds)+' s · '+span.sampleCount+' moments · '+span.ids.join(' / '));option.value=key(span);select.append(option);
 }
 if(!result.spans.length){$('motionSpanDetail').textContent='No multi-point span passed the fitted test over at least two consecutive retained moments.';return;}
 select.disabled=false;
 if(result.spans.some(s=>key(s)===previous))select.value=previous;
 else{const partial=result.spans.find(s=>s.sampleCount>=3&&s.sampleCount<result.timeline.length);if(partial)select.value=key(partial);}
 const render=()=>{
  const span=result.spans.find(s=>key(s)===select.value),finding=inspectMotionSpan(evidence.account,span);
  $('motionSpanSources').replaceChildren();$('motionSpanFits').replaceChildren();$('motionSpanTimeline').replaceChildren();
  if(finding.status!=='supported'){$('motionSpanDetail').textContent='This span no longer passes the fitted test.';return;}
  $('motionSpanDetail').textContent=span.ids.length+' points fit together in '+span.sampleCount+' retained moments, '+number(span.startSeconds)+'–'+number(span.endSeconds)+' s. All '+span.sourcePairCount+' source-pair fits pass; largest fitted residual '+number(finding.maxResidualMm)+' mm against '+number(result.thresholdMm)+' mm. No accepted larger point set covers this entire span, and this point set cannot extend to a neighboring retained moment.';
  $('motionSpanBoundary').textContent=boundaryText('Before',finding.extensions.before)+' '+boundaryText('After',finding.extensions.after);
  for(const moment of result.timeline){
   const selected=span.momentIds.includes(moment.momentId),item=node('li');
   item.className=selected?'selected':'';
   item.append(node('strong',number(moment.presentedSeconds)+' s'),node('span',moment.label),node('small',!moment.calibrated?'Uncalibrated gap':selected?'In selected span':'Outside selected span'));$('motionSpanTimeline').append(item);
  }
  renderMotionSourceCards($('motionSpanSources'),study,evidence,span.ids,span.momentIds);
  renderMotionFits($('motionSpanFits'),finding.motions);
 };
 select.onchange=render;render();
}
