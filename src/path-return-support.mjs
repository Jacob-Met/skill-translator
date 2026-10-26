import {importPathRegions} from './path-regions.mjs';
import {proposePathReturns} from './path-returns.mjs';
import {polygonPairDistance} from './polygon-pair-distance.mjs';
import {rational,mul,cmp} from '../vendor/chronos/exact-halfplanes.mjs';

// Rectangle admission belongs to path-regions; the maintained exact polygon
// kernel owns distances, including point/segment degeneracies.
function vertices(r) {
 if(r.xMin===r.xMax&&r.yMin===r.yMax)return [{x:r.xMin,y:r.yMin}];
 if(r.xMin===r.xMax)return [{x:r.xMin,y:r.yMin},{x:r.xMin,y:r.yMax}];
 if(r.yMin===r.yMax)return [{x:r.xMin,y:r.yMin},{x:r.xMax,y:r.yMin}];
 return [{x:r.xMin,y:r.yMin},{x:r.xMax,y:r.yMin},{x:r.xMax,y:r.yMax},{x:r.xMin,y:r.yMax}];
}
const decode=q=>[BigInt(q.numerator),BigInt(q.denominator)];

/** Conservative universal certificates for nominal original return candidates.
 * A common start is retained: both universal statements hold for EVERY position
 * in its same declared region. Extremal witnesses need not share a start and
 * are not combined into a synthetic path or an attainable joint range. */
export function inspectPathReturnSupport(raw) {
 const account=importPathRegions(raw),nominal=proposePathReturns(account.path,account.thresholdMm);
 const radius=rational(account.thresholdMm),squaredRadius=mul(radius,radius),cache=new Map();
 const pair=(a,b)=>{
  const key=`${a}:${b}`;
  if(!cache.has(key)){
   const first=account.declarations[a],second=account.declarations[b];
   // Nominal proposal admission already breaks at missing samples. Refuse if
   // a future caller changes that invariant, rather than synthesizing support.
   if(!first.rectangle||!second.rectangle)throw Error('A return certificate requires every original selected position in its interval.');
   const range=polygonPairDistance(vertices(first.rectangle),vertices(second.rectangle));
   cache.set(key,{fromMomentId:first.momentId,toMomentId:second.momentId,range,
    allOutside:cmp(decode(range.minimum.squared),squaredRadius)>0,
    allInside:cmp(decode(range.maximum.squared),squaredRadius)<=0});
  }
  return cache.get(key);
 };
 const proposals=nominal.proposals.map(proposal=>{
  const endpoint=pair(proposal.fromIndex,proposal.toIndex),interior=[];
  for(let i=proposal.fromIndex+1;i<proposal.toIndex;i++)interior.push(pair(proposal.fromIndex,i));
  const departureWitnesses=interior.filter(p=>p.allOutside);
  return {nominal:proposal,endpoint,interior,departureWitnesses,
   status:endpoint.allInside&&departureWitnesses.length?'universally-supported-excursion':'unresolved'};
 });
 return {thresholdMm:account.thresholdMm,nominal,proposals,pairComparisons:cache.size,
  boundary:'Certificates apply to every position in the supplied independent common-plane rectangles, using the same start position in both departure and return statements. Each certificate has at least one fixed interior moment always strictly outside the radius and an endpoint always inside or on it. It does not certify the first return time, exclude earlier returns, or count task cycles. Unresolved means this sufficient certificate was not established, not that a counterexample exists. Exact extrema witnesses are separate pair witnesses and need not combine into one path. Missing samples split nominal candidates; intervening motion remains unknown. Supplied regions are not inferred calibration uncertainty, verified physical accuracy, contact or skill evidence.'};
}
