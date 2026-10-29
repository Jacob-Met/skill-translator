import {receiveWholeFrameContours,receiveWholeFrameField} from './whole-frame-contours.mjs';
import {traceEdgeConnection} from './edge-connection.mjs';
export function inspectWholeEdgeConnection(sequence,raw,selection){
 const report=receiveWholeFrameContours(sequence,raw);
 if(!selection||Object.keys(selection).sort().join(',')!=='end,start')throw Error('Retain exactly two selected original edge pixels');
 const width=report.image.widthPx,height=report.image.heightPx,field=receiveWholeFrameField(report.field,[0,0,width,height]);
 return {momentId:report.momentId,image:structuredClone(report.image),origin:structuredClone(report.origin),selection:structuredClone(selection),connection:traceEdgeConnection(field,width,height,selection.start,selection.end),coverage:structuredClone(report.coverage),boundary:'The full imported edge field supplies connectivity, including pixels omitted by native contour walks. Report consistency and original image identity are checked; this does not independently recompute OpenCV or establish a physical boundary.'};
}
