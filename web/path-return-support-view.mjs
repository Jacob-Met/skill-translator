import {inspectPathReturnSupport} from '/src/path-return-support.mjs';

export function showPathReturnSupport(container,account,inspectOriginal) {
 container.querySelector('[data-return-support]')?.remove();
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const section=el('section');section.dataset.returnSupport='true';
 section.append(el('h3','Does a sampled departure and return survive these bounds?'));
 try {
  const report=inspectPathReturnSupport(account);
  section.append(el('p',`${report.proposals.length} nominal overlapping alternatives at the declared ${report.thresholdMm} mm threshold. These are not task-cycle counts.`));
  for(const p of report.proposals){
   const article=el('section');article.dataset.support=p.status;
   article.append(el('h4',`${p.nominal.fromMomentId} → ${p.nominal.toMomentId}`));
   article.append(el('p',p.status==='universally-supported-excursion'?
    'Every allowed shared-start position has a witnessed departure and an eventual return within this interval. First-return timing is not certified.':
    'Unresolved: these sufficient universal conditions are not established. This does not prove that a counterexample exists.'));
   article.append(el('p',`Endpoint always within radius: ${p.endpoint.allInside?'yes':'not established'}. Fixed interior moments always strictly outside: ${p.departureWitnesses.map(w=>w.toMomentId).join(', ')||'none certified'}.`));
   for(const pair of p.alternativeDepartureWitnesses){
    const group=el('section');group.className='evidence-review';group.dataset.alternativePair='true';
    group.append(el('h5',`At least one of ${pair.fromMomentId} or ${pair.toMomentId} must depart`));
    group.append(el('p',`Every allowed separation of this interior pair exceeds twice the ${report.thresholdMm} mm radius. Both cannot remain within that radius of the same start. This identifies an alternative pair, not one fixed departure moment.`));
    for(const id of [pair.fromMomentId,pair.toMomentId]){const button=el('button',`Inspect pair frame ${id}`);button.type='button';button.addEventListener('click',()=>inspectOriginal(id));group.append(button);}
    const pairDetails=el('details');pairDetails.append(el('summary','Exact pair separation and witnesses'),el('pre',JSON.stringify(pair.range,null,2)));group.append(pairDetails);article.append(group);
   }
   if(p.alternativePairComparisons.length&&!p.alternativeDepartureWitnesses.length)article.append(el('p','No interior pair has a certified separation strictly greater than twice the radius. Equality is insufficient.'));
   const ids=[p.nominal.fromMomentId,...p.interior.map(w=>w.toMomentId),p.nominal.toMomentId];
   for(const id of ids){const button=el('button',`Inspect original ${id}`);button.type='button';button.addEventListener('click',()=>inspectOriginal(id));article.append(button);}
   const details=el('details');details.append(el('summary','Original candidate and every exact pair witness'),el('pre',JSON.stringify(p,null,2)));article.append(details);section.append(article);
  }
  section.append(el('p',report.boundary));
 } catch(error){section.append(el('p',`Return support unavailable: ${error.message}`));}
 container.append(section);
}
