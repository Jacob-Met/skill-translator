import {receiveWholeFrameContours,receiveWholeFrameField} from './whole-frame-contours.mjs';
import {explainEdgeGap} from './edge-gap.mjs';
export function inspectWholeEdgeGap(sequence,raw,selection){
 const report=receiveWholeFrameContours(sequence,raw);
 if(!selection||Object.keys(selection).sort().join(',')!=='end,start')throw Error('Retain exactly two selected original edge pixels');
 const w=report.image.widthPx,h=report.image.heightPx,field=receiveWholeFrameField(report.field,[0,0,w,h]);
 const result=explainEdgeGap(field,w,h,selection.start,selection.end);
 return {momentId:report.momentId,image:structuredClone(report.image),origin:structuredClone(report.origin),selection:structuredClone(selection),result,work:{connectionNeighbourVisits:result.original.neighbourVisits,gapNeighbourVisits:result.neighbourVisits,maximumPerTraversal:8*w*h},boundary:'The original field and its connectivity result remain unchanged. A hypothetical route minimizes absent pixels only, not geometric distance or physical repair. Original connectivity and gap traversal have separate bounded neighbour-visit accounts; decoding and report admission are additional work.'};
}
