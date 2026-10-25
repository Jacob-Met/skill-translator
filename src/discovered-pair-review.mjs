import {discoverRelationships} from './relationship-discovery.mjs';
import {createPractice} from './practice.mjs';
import {createPairInterpretations} from './pair-interpretations.mjs';
/** Explicitly reviewed investigation; no actual placement or score is invented. */
export function createDiscoveredPairReview(study,candidateId,{widthMm,heightMm,toleranceMm,basis}){
 const result=discoverRelationships(study),candidate=result.candidates.find(c=>c.id===candidateId);
 if(candidate?.status!=='repeatable'||candidate.kind!=='distance')throw Error('Choose a repeatable distance candidate for the maintained pair comparison');
 const source=result.study.demonstrations[0].annotation;
 return createPairInterpretations(source,createPractice(source,widthMm,heightMm),{id:'discovered-pair',label:`${candidate.from} to ${candidate.to}: investigated distance`,from:candidate.from,to:candidate.to,kind:'distance',toleranceMm},basis,{study:result.study,candidateId});
}
