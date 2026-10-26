import {inspectSharedMotionGroups} from '/src/shared-motion-groups.mjs';
import {derive} from '/src/geometry.mjs';
const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const svg=(tag,attrs)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;};
const number=v=>v.toFixed(3);
export function renderSharedMotionGroups(study,evidence){
 const previous=$('motionGroup').value;
 $('motionSources').replaceChildren();$('motionFits').replaceChildren();$('motionSubset').replaceChildren();$('motionSubsetDetail').textContent='';
 let result;try{result=inspectSharedMotionGroups(study);}catch(error){$('motionSummary').textContent='Grouping unavailable: '+error.message;$('motionGroup').replaceChildren();$('motionGroup').disabled=true;return;}
 $('motionLimits').textContent=result.boundary+(result.selectionConditioned?' These point identities were selected using geometric agreement; the same agreement is not independent validation.':'');
 $('motionMissing').textContent=result.missing.length?'Unresolved original points: '+result.missing.map(m=>m.id+' (missing in '+m.sourceIds.join(', ')+')').join('; '):'Every reference point occurs in every supplied source.';
 const select=$('motionGroup');select.replaceChildren();select.disabled=!result.groups.length;
 if(result.status!=='complete'){$('motionSummary').textContent=result.reason;$('motionDetail').textContent='';$('motionSubset').disabled=true;return;}
 $('motionSummary').textContent=result.counts.maximal+' maximal shared-motion '+(result.counts.maximal===1?'group':'groups')+' from '+result.counts.evaluated+' possible point sets. '+result.counts.outsideFitThreshold+' sets exceed this fitted-residual threshold; '+result.counts.unresolvedOrientation+' have unresolved orientation.';
 result.groups.forEach((g,i)=>{const o=node('option','Group '+(i+1)+' · '+g.ids.join(' / ')+' · '+g.ids.length+' points');o.value=g.ids.join(':');select.append(o);});
 if([...select.options].some(o=>o.value===previous))select.value=previous;
 const render=()=>{
  const group=result.groups.find(g=>g.ids.join(':')===select.value);$('motionSources').replaceChildren();$('motionFits').replaceChildren();
  $('motionDetail').textContent=group?'All '+group.motions.length+' source-pair fits retain this group. Largest fitted point residual: '+number(group.maxResidualMm)+' mm, against '+number(result.thresholdMm)+' mm. No accepted larger point set contains this group.':'No multi-point group passed the declared fitted-motion test.';
  if(!group)return;
  for(const row of study.demonstrations){
   const d=derive(row.annotation),card=node('article');card.className='motion-source-card';card.append(node('h3',evidence?.sources[study.demonstrations.indexOf(row)]?.label||row.annotation.title||row.id),node('p',row.id+' · '+row.evidenceClass));
   const originalIds=group.ids.map(id=>row.spatialMapping?row.spatialMapping.pairs.find(p=>p.referenceId===id)?.observationId:id);
   const marks=d.landmarks.filter(m=>originalIds.includes(m.id));
   const index=study.demonstrations.indexOf(row),source=evidence?.sources[index],moment=source&&evidence.account.sequence.moments.find(m=>m.id===source.momentId),asset=moment&&evidence.assets.get(moment.id);
   const width=moment?.image.widthPx??300,height=moment?.image.heightPx??200;
   const plot=svg('svg',{viewBox:'0 0 '+width+' '+height,role:'img','aria-label':row.id+': selected shared-motion group on '+(asset?'the original retained frame':'the calibrated point diagram')});
   if(asset)plot.append(svg('image',{href:asset.media.url,width,height}));else plot.append(svg('rect',{x:0,y:0,width,height,fill:'#f3f7f2',stroke:'#b8cebf'}));
   const xy=m=>asset?m.sourcePx:{x:m.uv.u*width,y:m.uv.v*height};
   for(const m of d.landmarks){const p=xy(m);plot.append(svg('circle',{cx:p.x,cy:p.y,r:width/110,fill:originalIds.includes(m.id)?'#174f3b':'#899a90',opacity:originalIds.includes(m.id)?1:.35}));}
   for(const m of marks){const p=xy(m);plot.append(svg('circle',{cx:p.x,cy:p.y,r:width/65,fill:'none',stroke:'#efae32','stroke-width':width/220}));}
   card.append(plot,node('p','Group points: '+originalIds.join(', ')));
   if(asset)card.append(node('p',source.label+' · presented '+source.presentedSeconds+' s. Original PNG identity verified; geometry remains supplied.'));
   else card.append(node('p','Diagram of supplied calibrated annotations. Original image pixels are not verified here.'));
   $('motionSources').append(card);
  }
  for(const f of group.motions){const tr=node('tr');for(const text of [f.fromSourceId+' → '+f.toSourceId,number(f.angleDegrees)+'°','('+number(f.centroidDxMm)+', '+number(f.centroidDyMm)+')',number(f.remainingRmsMm),number(f.maxResidualMm)])tr.append(node('td',text));$('motionFits').append(tr);}
 };
 select.onchange=render;render();
 for(const s of result.subsets){const o=node('option',s.ids.join(' / ')+' · '+(s.status==='supported'?'passes fitted test':s.status==='unresolved-orientation'?'unresolved orientation':'outside fitted threshold'));o.value=s.ids.join(':');$('motionSubset').append(o);}
 $('motionSubset').disabled=false;
 $('motionSubset').onchange=()=>{const s=result.subsets.find(s=>s.ids.join(':')===$('motionSubset').value);$('motionSubsetDetail').textContent=s.status==='supported'?'Largest residual across all supplied source pairs: '+number(s.maxResidualMm)+' mm. Supported subsets contained in a larger supported group are omitted from the main group selector.':s.status==='unresolved-orientation'?s.witness.fromSourceId+' → '+s.witness.toSourceId+': '+s.witness.reason:s.witness.fromSourceId+' → '+s.witness.toSourceId+': fitted maximum residual '+number(s.witness.maxResidualMm)+' mm exceeds '+number(result.thresholdMm)+' mm. This rejects this least-squares fit, not every possible transformation.';};
 $('motionSubset').onchange();
}
