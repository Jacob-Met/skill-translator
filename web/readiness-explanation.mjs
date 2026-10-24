// Source-backed explanations of missing prerequisite reports.
import {explainReadiness} from '/src/readiness-explanation.mjs';
export function renderReadinessExplanation({sequence,study,selectedStepId,urlFor}){
 const result=explainReadiness(sequence,study,selectedStepId);
 const node=(tag,text)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;return element;};
 const section=node('div');section.className='readiness-evidence-explanation';
 section.append(node('h3','Which evidence is still missing?'));
 if(result.evidenceReady){section.append(node('p','The declared prerequisites have passing reports. This does not establish the selected step’s own completion or physical readiness.'));return section;}
 section.append(node('p',result.boundary));
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
