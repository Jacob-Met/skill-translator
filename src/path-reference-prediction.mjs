// Two first-source reference hypotheses inspected on identical second-source points.
import {importPathComparison} from './path-comparison.mjs';
import {inspectPathAxisPrediction} from './path-axis-prediction.mjs';
import {inspectPathCircle} from './path-circle.mjs';
const summary=values=>({count:values.length,rmsMm:values.length?Math.hypot(...values)/Math.sqrt(values.length):null,maxMm:values.length?Math.max(...values.map(Math.abs)):null});

export function inspectPathReferencePrediction(raw){
 const study=importPathComparison(raw),axis=inspectPathAxisPrediction(study),circle=inspectPathCircle(study.paths[0]);
 const rows=axis.rows.map(row=>({momentId:row.momentId,position:row.position,presentedSeconds:row.presentedSeconds,
  axisResidualMm:row.residualMm,
  circleResidualMm:circle.circle.status==='resolved'?Math.hypot(row.position.xMm-circle.circle.center.xMm,row.position.yMm-circle.circle.center.yMm)-circle.circle.radiusMm:null}));
 const common=rows.filter(r=>r.axisResidualMm!==null&&r.circleResidualMm!==null);
 return {axis,circle,rows,targetCount:rows.length,commonCount:common.length,
  status:common.length===rows.length?'both-references-supported':'incomplete-reference-support',
  axisSummary:summary(rows.filter(r=>r.axisResidualMm!==null).map(r=>r.axisResidualMm)),
  circleSummary:summary(rows.filter(r=>r.circleResidualMm!==null).map(r=>r.circleResidualMm)),
  commonAxisSummary:summary(common.map(r=>r.axisResidualMm)),commonCircleSummary:summary(common.map(r=>r.circleResidualMm)),
  boundary:'Both reference hypotheses use only the first demonstration. Every selected second-source point is inspected once, independent of the displayed ordered pairing; repeated coupling rows do not add weight. No second-source point refits, registers, rescales or selects either reference. Unsupported first-source hypotheses have no score, not zero error. Signed axis residuals follow its numerical direction; positive circle residuals are outside its radius. RMS values describe disagreement with different geometric sets, not model probabilities or physical accuracy. Agreement does not establish matching traversal order, extent, timing or contact. Lower error does not identify the task guide: both hypotheses can disagree substantially or agree for unrelated reasons. No winner, physical tolerance, pass verdict or correction is inferred. Reversing source order asks a different question. Source-only reopening recomputes these results under the unchanged common-coordinate declaration.'};
}
