// Geometric proposals only. Identity, coordinate frame and action meaning remain declarations.
import {inspectSequencePath} from './sequence-path.mjs';
import {GeometryError} from './geometry.mjs';
import {countMonotoneCouplings} from './path-comparison.mjs';

/** Every full monotone alignment starts/ends at the selected path endpoints and
 * advances one sample on either or both sides. No interpolation or skipped sample.
 * BigInt path counts identify vertices common to every admitted alignment exactly.
 */
export function proposePathCorrespondences(left,right,{sameCoordinateFrame=false,maxDistanceMm}={}){
 if(sameCoordinateFrame!==true)throw new GeometryError('Explicitly confirm the same physical coordinate frame and corresponding point across both paths.');
 if(typeof maxDistanceMm!=='number'||!Number.isFinite(maxDistanceMm)||maxDistanceMm<0||maxDistanceMm>1000)throw new GeometryError('Supply a geometric discrepancy bound within 0–1000 mm.');
 const a=inspectSequencePath(left),b=inspectSequencePath(right),n=a.samples.length,m=b.samples.length;
 const boundary='Proposals are common to every full monotone alignment of the selected samples within the supplied distance bound. They are conditional on declared point identity, a common coordinate frame and calibrations; they do not establish corresponding actions, purpose, continuous motion or skill. Missing samples are not bridged. Timestamps are not used to choose matches.';
 const base={maxDistanceMm,boundary,forcedPairs:[],ambiguousPairs:[],proposals:[],alignmentCount:'0'};
 if(!a.complete||!b.complete)return {...base,status:'missing-observations'};
 const distance=a.samples.map(x=>b.samples.map(y=>Math.hypot(x.position.xMm-y.position.xMm,x.position.yMm-y.position.yMm)));
 const {forward,backward,total:count}=countMonotoneCouplings(distance,maxDistanceMm);
 if(!count)return {...base,status:'no-alignment'};
 const forcedPairs=[],ambiguousPairs=[];
 for(let i=0;i<n;i++)for(let j=0;j<m;j++){
  const through=forward[i][j]*backward[i][j];if(!through)continue;
  const pair={leftIndex:i,rightIndex:j,leftMomentId:a.samples[i].momentId,rightMomentId:b.samples[j].momentId,distanceMm:distance[i][j]};
  (through===count?forcedPairs:ambiguousPairs).push(pair);
 }
 // Consecutive forced pairs may advance on only one side. Such zero-duration
 // matches cannot become timing intervals; retain them in the evidence instead.
 const proposals=[];
 for(let k=1;k<forcedPairs.length;k++){
  const from=forcedPairs[k-1],to=forcedPairs[k];
  if(to.leftIndex<=from.leftIndex||to.rightIndex<=from.rightIndex)continue;
  proposals.push({left:{fromMomentId:from.leftMomentId,toMomentId:to.leftMomentId},right:{fromMomentId:from.rightMomentId,toMomentId:to.rightMomentId},basis:`Geometric proposal common to every full monotone selected-sample alignment within ${maxDistanceMm} mm; author must confirm action correspondence.`});
 }
 return {...base,status:forcedPairs.some(p=>p.leftIndex>0&&p.leftIndex<n-1&&p.rightIndex>0&&p.rightIndex<m-1)?'internal-correspondences':'endpoints-only',forcedPairs,ambiguousPairs,proposals,alignmentCount:count.toString()};
}
