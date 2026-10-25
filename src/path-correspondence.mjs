// Geometric proposals only. Identity, coordinate frame and action meaning remain declarations.
import {importSequencePath,inspectSequencePath} from './sequence-path.mjs';
import {GeometryError} from './geometry.mjs';
import {countMonotoneCouplings} from './path-comparison.mjs';

/** Every full monotone alignment starts/ends at the selected path endpoints and
 * advances one sample on either or both sides. No interpolation or skipped sample.
 * BigInt path counts identify vertices common to every admitted alignment exactly.
 */
export function proposePathCorrespondences(left,right,{sameCoordinateFrame=false,maxDistanceMm,sharedVisibleStateCategories=false}={}){
 if(sameCoordinateFrame!==true)throw new GeometryError('Explicitly confirm the same physical coordinate frame and corresponding point across both paths.');
 if(typeof maxDistanceMm!=='number'||!Number.isFinite(maxDistanceMm)||maxDistanceMm<0||maxDistanceMm>1000)throw new GeometryError('Supply a geometric discrepancy bound within 0–1000 mm.');
 if(typeof sharedVisibleStateCategories!=='boolean')throw new GeometryError('Explicitly choose whether retained visible-state descriptions denote shared literal categories.');
 const sources=sharedVisibleStateCategories?[importSequencePath(left),importSequencePath(right)]:null;
 const a=inspectSequencePath(sources?.[0]??left),b=inspectSequencePath(sources?.[1]??right),n=a.samples.length,m=b.samples.length;
 const descriptions=sources?.map((source,index)=>{const moments=new Map(source.sequence.moments.map(moment=>[moment.id,moment]));return [a,b][index].samples.map(sample=>({momentId:sample.momentId,text:moments.get(sample.momentId).visibleState}));});
 const stateConstraint=descriptions?{criterion:'shared-literal-visible-state-categories',excludedGeometricPairs:null,descriptions:{left:descriptions[0],right:descriptions[1]},unknownSamples:{left:descriptions[0].filter(s=>!s.text).map(s=>s.momentId),right:descriptions[1].filter(s=>!s.text).map(s=>s.momentId)}}:null;

 const boundary='Proposals are common to every full monotone alignment of the selected samples within the supplied distance bound. They are conditional on declared point identity, a common coordinate frame and calibrations; they do not establish corresponding actions, purpose, continuous motion or skill. Missing samples are not bridged. Timestamps are not used to choose matches.'+(sharedVisibleStateCategories?' Nonempty authored descriptions are explicitly treated as shared literal categories: unequal text excludes a pair, while blank text imposes no category constraint. No synonym, semantic or physical-state inference is performed.':'');
 const base={maxDistanceMm,boundary,...(stateConstraint?{stateConstraint}:{}),forcedPairs:[],ambiguousPairs:[],proposals:[],alignmentCount:'0'};
 if(!a.complete||!b.complete)return {...base,status:'missing-observations'};
 const distance=a.samples.map(x=>b.samples.map(y=>Math.hypot(x.position.xMm-y.position.xMm,x.position.yMm-y.position.yMm)));
 const agrees=(i,j)=>!descriptions[0][i].text||!descriptions[1][j].text||descriptions[0][i].text===descriptions[1][j].text;
 const matrix=stateConstraint?distance.map((row,i)=>row.map((value,j)=>value<=maxDistanceMm&&agrees(i,j)?0:1)):distance;
 if(stateConstraint)stateConstraint.excludedGeometricPairs=distance.reduce((count,row,i)=>count+row.filter((value,j)=>value<=maxDistanceMm&&!agrees(i,j)).length,0);
 const {forward,backward,total:count}=countMonotoneCouplings(matrix,stateConstraint?0:maxDistanceMm);
 if(!count)return {...base,status:'no-alignment'};
 const forcedPairs=[],ambiguousPairs=[];
 for(let i=0;i<n;i++)for(let j=0;j<m;j++){
  const through=forward[i][j]*backward[i][j];if(!through)continue;
  const pair={leftIndex:i,rightIndex:j,leftMomentId:a.samples[i].momentId,rightMomentId:b.samples[j].momentId,distanceMm:distance[i][j],...(stateConstraint?{visibleStates:{left:descriptions[0][i].text||null,right:descriptions[1][j].text||null,constrained:Boolean(descriptions[0][i].text&&descriptions[1][j].text)}}:{})};
  (through===count?forcedPairs:ambiguousPairs).push(pair);
 }
 // Consecutive forced pairs may advance on only one side. Such zero-duration
 // matches cannot become timing intervals; retain them in the evidence instead.
 const proposals=[];
 for(let k=1;k<forcedPairs.length;k++){
  const from=forcedPairs[k-1],to=forcedPairs[k];
  if(to.leftIndex<=from.leftIndex||to.rightIndex<=from.rightIndex)continue;
  proposals.push({left:{fromMomentId:from.leftMomentId,toMomentId:to.leftMomentId},right:{fromMomentId:from.rightMomentId,toMomentId:to.rightMomentId},basis:`Geometric proposal common to every full monotone selected-sample alignment within ${maxDistanceMm} mm${stateConstraint?' and declared shared literal visible-state categories (blank descriptions unconstrained)':''}; author must confirm action correspondence.`});
 }
 return {...base,status:forcedPairs.some(p=>p.leftIndex>0&&p.leftIndex<n-1&&p.rightIndex>0&&p.rightIndex<m-1)?'internal-correspondences':'endpoints-only',forcedPairs,ambiguousPairs,proposals,alignmentCount:count.toString()};
}
