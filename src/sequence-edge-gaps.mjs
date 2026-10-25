import {receiveSequenceEdge} from './sequence-edge.mjs';
import {receiveEdgeField,edgeFieldSupport} from './sequence-edge-field.mjs';
import {rational as q,add,mul,div,serial,enclosure} from '../vendor/chronos/exact-halfplanes.mjs';

/** A sufficient, deliberately incomplete continuity diagnostic on detector support.
 * Dot products are exact integers: admitted ROI area <=2^20 and each side >=3
 * bound coordinate differences below2^19 and dot/length² below2^39.
 * Squared gap comparisons use BigInt because those squares can exceed2^53.
 * CHRONOS owns rational witnesses; approximate lengths are display only. */
export function inspectSequenceEdgeGaps(sequence,raw,segmentId){
 const report=receiveSequenceEdge(sequence,raw),candidate=report.candidates.find(c=>c.id===segmentId);
 if(!candidate)throw Error('Choose a retained candidate segment');
 const [x,y,w]=report.roi;
 const points=report.field?edgeFieldSupport(receiveEdgeField(report.field,report.roi),report.roi,candidate.a,candidate.b).map(k=>({x:x+k%w,y:y+Math.floor(k/w)})):candidate.supportIndices.map(i=>report.points[i]);
 const dx=candidate.b.x-candidate.a.x,dy=candidate.b.y-candidate.a.y,l2=dx*dx+dy*dy;
 const ordered=points.map(p=>({point:p,dot:(p.x-candidate.a.x)*dx+(p.y-candidate.a.y)*dy})).sort((a,b)=>a.dot-b.dot||a.point.y-b.point.y||a.point.x-b.point.x);
 const at=dot=>{const t=div(dot,q(l2));return {x:add(q(candidate.a.x),mul(q(dx),t)),y:add(q(candidate.a.y),mul(q(dy),t))};};
 const exactPoint=p=>({x:serial(p.x),y:serial(p.y)}),viewPoint=p=>({x:enclosure(p.x).lower,y:enclosure(p.y).lower});
 const gaps=[];
 for(let i=1;i<ordered.length;i++){
  const before=ordered[i-1],after=ordered[i],gap=after.dot-before.dot;
  // Every support projection is on one side of these consecutive projections.
  // At their midpoint axial distance alone is gap/(2*sqrt(l2)) >2.
  if(BigInt(gap)**2n<=16n*BigInt(l2))continue;
  const middle=at(div(add(q(before.dot),q(after.dot)),q(2))),start=at(q(before.dot)),end=at(q(after.dot));
  gaps.push({before:before.point,after:after.point,projectionDots:[before.dot,after.dot],
   axialGapSquared:serial(div(mul(q(gap),q(gap)),q(l2))),approximateAxialGapPx:gap/Math.sqrt(l2),
   midpoint:exactPoint(middle),display:{start:viewPoint(start),end:viewPoint(end),midpoint:viewPoint(middle)},
   midpointSquaredDistanceLowerBound:serial(div(mul(q(gap),q(gap)),mul(q(4),q(l2))))});
 }
 return {momentId:report.momentId,image:report.image,origin:report.origin,segmentId,supportCount:points.length,gaps,
  boundary:'Internal gaps between candidate-support projections only. Each marked midpoint is farther than 2 image pixels from every retained supporting pixel center. This sufficient test does not certify continuity when no gap is found; endpoints and other detected pixels are not assessed. It does not establish physical edge absence, contact or object identity.'};
}
