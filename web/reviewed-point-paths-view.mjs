import {createReviewedPointPaths,inspectReviewedPointPaths} from '/src/reviewed-point-paths.mjs';
import {makeReviewedPointPathsBundle} from '/web/reviewed-point-paths-input.mjs';
import {makeSampledPathBundle} from '/web/sampled-path-input.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const mm=value=>value===null?'Unavailable':`${value.toFixed(3)} mm`;
export function installReviewedPointPaths({getAssets,getAccepted}){
 const panel=el('section');panel.id='reviewed-point-paths';panel.className='evidence-review';panel.hidden=true;document.getElementById('result').after(panel);
 let current=null,acceptedSeed=null;
 function clear(){current=null;acceptedSeed=null;panel.hidden=true;panel.replaceChildren();}
 function invalidate(){panel.hidden=true;}
 function live(study,seed){return current===study&&acceptedSeed===seed&&getAccepted()===seed;}
 async function save(study,seed,path,index,feedback){
  if(!live(study,seed))return;
  try{const blob=path?await makeSampledPathBundle(path,getAssets()):await makeReviewedPointPathsBundle(study,getAssets());if(!live(study,seed))return;
   const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=path?`reviewed-point-path-${index+1}.json`:'reviewed-point-paths.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);feedback.textContent=path?'Ordinary point path saved with every original frame.':'Complete mappings, accepted frame declaration and every original frame saved.';
  }catch(error){if(live(study,seed))feedback.textContent=`Cannot save: ${error.message}`;}
 }
 function preview(sample){
  const figure=el('figure'),ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${sample.image.widthPx} ${sample.image.heightPx}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',`${sample.momentLabel}: original point ${sample.markId}`);
  const image=document.createElementNS(ns,'image');for(const[k,v]of Object.entries({href:getAssets().get(sample.momentId)?.media.url??'',width:sample.image.widthPx,height:sample.image.heightPx}))image.setAttribute(k,v);svg.append(image);
  const circle=document.createElementNS(ns,'circle');for(const[k,v]of Object.entries({cx:sample.sourcePx.x,cy:sample.sourcePx.y,r:Math.max(sample.image.widthPx,sample.image.heightPx)/50,fill:'none',stroke:'#cf472b','stroke-width':3}))circle.setAttribute(k,v);svg.append(circle);
  figure.append(el('figcaption',`${sample.momentLabel} · ${sample.presentedSeconds} s · original ${sample.markId}`),svg);return figure;
 }
 function receive(seed,reviews){
  clear();if(!reviews?.length)return;
  try{
   const result=inspectReviewedPointPaths(createReviewedPointPaths(seed,reviews));current=result.study;acceptedSeed=seed;const study=current;panel.hidden=false;
   panel.append(el('h2','Other point paths from the same completed reviews'),el('p',`${result.paths.length} additional ordinary paths reuse ${result.reviewedMappingCount} complete source-bound mappings already reviewed. No additional point choices or semantic confirmations were entered. Each point keeps its own original label; the seed contributes only its fixed-reference declaration.`));
   const saveAll=el('button','Save complete reviewed-point account');saveAll.type='button';saveAll.id='save-reviewed-points';const feedback=el('p');feedback.setAttribute('role','status');saveAll.addEventListener('click',()=>save(study,seed,null,0,feedback));panel.append(saveAll,feedback);
   result.paths.forEach(({referenceMarkId,path,findings},index)=>{
    const card=el('article');card.dataset.referenceMark=referenceMarkId;card.append(el('h3',`${path.label} (${referenceMarkId})`),el('p',`${findings.samples.length} original selected samples. Sampled chord sum: ${mm(findings.sampledPathDistanceMm)}. Endpoint distance: ${mm(findings.endpointDistanceMm)}.`));
    const details=el('details');details.append(el('summary','Inspect every original sample'));const frames=el('div');frames.className='grid';for(const sample of findings.samples)frames.append(preview(sample));details.append(frames);card.append(details);
    const savePath=el('button','Save this ordinary point path');savePath.type='button';savePath.className='save-reviewed-path';const message=el('p');message.setAttribute('role','status');savePath.addEventListener('click',()=>save(study,seed,path,index,message));card.append(savePath,message);panel.append(card);
   });
   panel.append(el('p',result.boundary),el('p','Ordinary point-path files retain authored choices and original frames. Use the complete reviewed-point account to retain and recompute the full mappings; basis text alone does not restore them.'));
  }catch(error){panel.hidden=false;panel.append(el('h2','Additional point paths unavailable'),el('p',`${error.message} The accepted ordinary path and its authored choices are unchanged.`));}
 }
 return {clear,invalidate,receive};
}
