// Explain unresolved prerequisite reports using the maintained source-bound replay.
import {importReadiness,readinessFindings} from './task-readiness.mjs';
export function explainReadiness(sequence,input,selectedStepId){
 const study=importReadiness(sequence,input),findings=readinessFindings(sequence,study);
 const byId=new Map(findings.steps.map(s=>[s.stepId,s])),sourceSteps=new Map(study.source.steps.map(s=>[s.id,s]));
 if(!byId.has(selectedStepId))throw Error('Choose a retained modeled step');
 const visited=new Set(),dependencyWitnesses=[],unresolvedChecks=[];
 function inspect(id){
  if(visited.has(id))return;visited.add(id);const status=byId.get(id);
  if(status.blockedBy.length){
   for(const prerequisite of status.blockedBy){
    const declaration=study.prerequisites.dependencies.find(e=>e.before===prerequisite&&e.after===id);
    dependencyWitnesses.push({...declaration});inspect(prerequisite);
   }
   return;
  }
  if(id===selectedStepId)return;
  const step=sourceSteps.get(id);
  for(const check of status.checks.filter(c=>c.observation?.value!=='pass'))unresolvedChecks.push({stepId:id,stepTitle:step.title,checkId:check.id,prompt:check.prompt,basis:check.basis,state:check.observation?.value??'unobserved',observation:structuredClone(check.observation),beforeMomentId:step.beforeMomentId,afterMomentId:step.afterMomentId});
 }
 inspect(selectedStepId);
 return {selectedStepId,evidenceReady:byId.get(selectedStepId).ready,dependencyWitnesses,unresolvedChecks,
  boundary:'This is the earliest unresolved evidence in the declared dependency graph. It identifies what remains unestablished, not an instruction to perform a physical action or proof that the declaration is correct.'};
}
