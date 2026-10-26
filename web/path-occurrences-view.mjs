import {importPathComparison} from '/src/path-comparison.mjs';
import {inspectPathOccurrences,createPathOccurrenceStudy,importPathOccurrenceStudy,MAX_OCCURRENCE_BYTES} from '/src/path-occurrences.mjs';
import {makePathComparisonBundle,readPathComparisonBundle,MAX_COMPARISON_BUNDLE_BYTES} from '/web/path-comparison-input.mjs';
import {releaseSequenceAssets} from '/web/sequence-input.mjs';
const $=id=>document.getElementById(id),el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
const maxBundleBytes=MAX_COMPARISON_BUNDLE_BYTES+MAX_OCCURRENCE_BYTES+1024;
const bundleFormat='skill-translator.path-occurrences-bundle/v1';
export function mountPathOccurrences({context,receive,status}){
 let accepted=null,epoch=0;
 const clear=()=>{epoch++;accepted=null;$('occurrence-results').replaceChildren();$('occurrence-save').disabled=true;};
 function render(study,sources){
  const finding=inspectPathOccurrences(study.comparison,study.maxDistanceMm),target=$('occurrence-results');
  accepted={study,sources,finding};target.replaceChildren();target.dataset.status=finding.status;$('occurrence-save').disabled=false;
  target.append(el('p',`${finding.occurrences.length} qualifying intervals among ${finding.candidateCount} complete candidate spans. ${finding.status.replaceAll('-',' ')}.`),el('p',finding.boundary));
  if(finding.missingSecondMomentIds.length)target.append(el('p',`Missing second-source samples split coverage: ${finding.missingSecondMomentIds.join(', ')}.`));
  const choices=el('div'),witness=el('div');witness.id='occurrence-witness';target.append(choices,witness);
  for(const occurrence of finding.occurrences){
   const button=el('button',`B${occurrence.startIndex+1}–B${occurrence.endIndex+1} · ${occurrence.startSeconds}–${occurrence.endSeconds} s · ${occurrence.alignmentCount} pairings`);button.type='button';
   button.addEventListener('click',()=>{
    witness.replaceChildren();witness.append(el('p','One complete allowed pairing. This inspection does not adopt an action or alter either source.'));
    const pairs=el('div'),frames=el('div');frames.className='grid';witness.append(pairs,frames);
    for(const pair of occurrence.coupling){
     const inspect=el('button',`A${pair.firstIndex+1} ↔ B${pair.secondIndex+1} · ${pair.distanceMm.toPrecision(5)} mm`);inspect.type='button';
     inspect.addEventListener('click',()=>{
      frames.replaceChildren();[pair.firstIndex,pair.secondIndex].forEach((index,side)=>{
       const sample=finding.paths[side].samples[index],figure=el('figure');figure.dataset.momentId=sample.momentId;
       const ns='http://www.w3.org/2000/svg',view=document.createElementNS(ns,'svg');view.setAttribute('viewBox',`0 0 ${sample.image.widthPx} ${sample.image.heightPx}`);view.setAttribute('role','img');view.setAttribute('aria-label',`Original ${side?'second':'first'} source ${sample.momentLabel}, declared point`);
       const image=document.createElementNS(ns,'image');image.setAttribute('href',sources[side].assets.get(sample.momentId).media.url);image.setAttribute('width',sample.image.widthPx);image.setAttribute('height',sample.image.heightPx);
       const circle=document.createElementNS(ns,'circle');for(const [key,value]of Object.entries({cx:sample.sourcePx.x,cy:sample.sourcePx.y,r:Math.max(sample.image.widthPx,sample.image.heightPx)/45,fill:'none',stroke:side?'#c54b40':'#14756a','stroke-width':3}))circle.setAttribute(key,value);
       view.append(image,circle);figure.append(view,el('figcaption',`${side?'Second':'First'}: ${sample.momentLabel} · ${sample.presentedSeconds} s · ${sample.markLabel}`));frames.append(figure);
      });
     });pairs.append(inspect);
    }
    pairs.querySelector('button')?.click();
   });choices.append(button);
  }
 }
 $('occurrence-bound').addEventListener('input',clear);
 $('occurrence-search').addEventListener('click',()=>{clear();try{const {comparison,sources}=context();const value=$('occurrence-bound').value;if(!value.trim())throw Error('Supply a nominal separation bound.');render(createPathOccurrenceStudy(comparison,Number(value)),sources);status('All complete candidate spans inspected. Select an interval to inspect its original paired frames.');}catch(error){status(error.message);}});
 $('occurrence-save').addEventListener('click',async()=>{
  if(!accepted)return;const current=accepted,token=epoch,revision=context().revision;
  try{const blob=await makePathComparisonBundle(current.study.comparison,current.sources);if(token!==epoch||revision!==context().revision||accepted!==current)return;
   const raw={format:bundleFormat,study:current.study,comparisonBundle:JSON.parse(await blob.text())};if(token!==epoch||revision!==context().revision||accepted!==current)return;
   const output=new Blob([JSON.stringify(raw)],{type:'application/json'});if(output.size>maxBundleBytes)throw Error('The complete occurrence bundle exceeds its source budget.');const url=URL.createObjectURL(output),a=el('a');a.href=url;a.download='demonstrated-path-occurrences.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(error){if(token===epoch)status(`Cannot save occurrences: ${error.message}`);}
 });
 $('occurrence-open').addEventListener('change',async()=>{
  const file=$('occurrence-open').files[0];$('occurrence-open').value='';if(!file)return;const token=++epoch,revision=context(false).revision;let received;
  status('Reading occurrence query. Previous accepted work is retained until both original sources pass admission.');
  try{if(file.size>maxBundleBytes)throw Error('Keep the complete original-source occurrence bundle within its source budget.');const raw=JSON.parse(await file.text());if(raw.format!==bundleFormat)throw Error('Open a complete occurrence bundle.');const study=importPathOccurrenceStudy(raw.study);
   received=await readPathComparisonBundle(new File([JSON.stringify(raw.comparisonBundle)],'comparison.json',{type:'application/json'}));
   importPathComparison(received.study,study.comparison.paths);
   if(received.study.declaration.basis!==study.comparison.declaration.basis)throw Error('The occurrence query must match the original cross-demonstration declaration.');
   inspectPathOccurrences(study.comparison,study.maxDistanceMm);
   if(token!==epoch||revision!==context(false).revision){for(const source of received.sources)releaseSequenceAssets(source.assets);return;}
   receive(received);$('occurrence-bound').value=String(study.maxDistanceMm);render(study,received.sources);received=null;status('Original occurrence sources reopened and every finding recomputed.');
  }catch(error){if(received)for(const source of received.sources)releaseSequenceAssets(source.assets);if(token===epoch)status(`Occurrence input refused: ${error.message} Previous accepted work is unchanged.`);}
 });
 return clear;
}
