// Source-backed explanations of missing prerequisite reports.
import {explainReadiness} from '/src/readiness-explanation.mjs';
/** The alternatives belong to the frozen author declaration, not a recommended
 * method or a claim that a physical outcome was independently established. */
export function renderCompletionAlternatives(finding){
 const node=(tag,text)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;return element;};
 if(!finding.completionAlternatives)return document.createDocumentFragment();
 const section=node('div');section.className='completion-alternatives';section.style.overflowWrap='anywhere';
 const names=ids=>ids.map(id=>finding.checks.find(c=>c.id===id)?.prompt??id).join('; ');
 const alternatives=finding.completionAlternatives;
 section.append(node('h4','Author-declared completion methods'),node('p','Every check within one declared method must have passing evidence. Different methods are alternatives, not an instruction to perform all of them.'),node('p',alternatives.sharedCheckIds.length?'Common to every declared method: '+names(alternatives.sharedCheckIds):'No check is common to every declared method. This does not establish that the physical methods have no shared constraints.'));
 for(const route of alternatives.routes){
  const card=node('article');card.dataset.routeId=route.id;card.dataset.satisfied=String(route.satisfied);
  card.append(node('h5',route.label),node('p','Author basis: '+route.basis),node('p','Required in this method: '+names(route.checkIds)),node('strong',route.satisfied?'This method’s checks have passing evidence.':'Not established for this method: '+names(route.unestablishedCheckIds)));
  const evidence=node('details'),list=node('ul');evidence.append(node('summary','Inspect this method’s required check evidence'));
  for(const id of route.checkIds){const check=finding.checks.find(c=>c.id===id),observation=check?.observation;const item=node('li');item.append(node('p',`${check?.prompt??id}: ${observation?`${observation.value} · ${observation.evidenceClass} · journal event ${observation.eventIndex+1} — ${observation.note}`:'No retained observation'}`));if(check?.basis)item.append(node('p','Check rationale: '+check.basis));list.append(item);}
  evidence.append(list);card.append(evidence);
  section.append(card);
 }
 if(finding.blockedBy?.length)section.append(node('p','Prerequisite evidence is still unestablished; satisfying a method’s own checks alone does not establish this step’s completion.'));
 return section;
}
export function renderReadinessExplanation({sequence,study,selectedStepId,urlFor}){
 const result=explainReadiness(sequence,study,selectedStepId);
 const node=(tag,text)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;return element;};
 const section=node('div');section.className='readiness-evidence-explanation';
 section.append(node('h3','Which evidence is still missing?'));
 if(result.evidenceReady){section.append(node('p','The declared prerequisites have passing reports. This does not establish the selected step’s own completion or physical readiness.'));return section;}
 section.append(node('p',result.boundary));
 for(const finding of result.unresolvedAlternatives??[]){
  const article=node('article');article.dataset.stepId=finding.stepId;
  article.append(node('h4',finding.stepTitle),renderCompletionAlternatives(finding));
  const details=node('details');details.append(node('summary','Inspect this prerequisite’s retained source states'));
  for(const [label,id] of [['Before',finding.beforeMomentId],['After',finding.afterMomentId]]){
   const moment=sequence.moments.find(m=>m.id===id),figure=node('figure'),image=node('img');image.src=urlFor(id);image.alt=moment.label;image.style.maxWidth='100%';
   figure.append(image,node('figcaption',`${label}: ${moment.label} · presented ${moment.origin.mediaTimeSeconds}s · ${moment.visibleState}`));details.append(figure);
  }
  article.append(details);section.append(article);
 }
 for(const check of result.unresolvedChecks){
  const article=node('article');article.dataset.stepId=check.stepId;article.dataset.checkId=check.checkId;
  article.append(node('h4',check.stepTitle),node('p',check.prompt),node('p','Expert check rationale: '+check.basis));
  const status={unobserved:'No retained observation',unknown:'Reported as unknown',fail:'Reported as unsatisfied'}[check.state];
  article.append(node('strong',status));
  if(check.observation)article.append(node('p',`${check.observation.evidenceClass} · journal event ${check.observation.eventIndex+1}: ${check.observation.note}`));
  const details=node('details');details.append(node('summary','Inspect this prerequisite’s retained source states'));
  for(const [label,id] of [['Before',check.beforeMomentId],['After',check.afterMomentId]]){
   const moment=sequence.moments.find(m=>m.id===id),figure=node('figure'),image=node('img');image.src=urlFor(id);image.alt=moment.label;image.style.maxWidth='100%';
   figure.append(image,node('figcaption',`${label}: ${moment.label} · presented ${moment.origin.mediaTimeSeconds}s · ${moment.visibleState}`));details.append(figure);
  }
  article.append(details);section.append(article);
 }
 const reasons=node('details');reasons.append(node('summary','Inspect the declared dependency reasons behind these requests'));
 const list=node('ul'),title=id=>sequence.steps.find(s=>s.id===id).title;
 for(const edge of result.dependencyWitnesses)list.append(node('li',`${title(edge.before)} is declared necessary before ${title(edge.after)}: ${edge.reason}`));
 reasons.append(list);section.append(reasons);return section;
}

