import {importPathComparison,inspectPathComparison} from './path-comparison.mjs';
import {inspectPathAxis} from './path-axis.mjs';

/** Fit only the first retained demonstration; second-path points never train it. */
export function inspectPathAxisPrediction(raw){
 const study=importPathComparison(raw);
 // Maintained admission enforces complete paths and equal declared dimensions,
 // in addition to the explicit common-point/common-coordinate declaration.
 const comparison=inspectPathComparison(study),training=inspectPathAxis(study.paths[0]);
 const axis=training.axis;
 const rows=comparison.paths[1].samples.map(sample=>{
  const residualMm=axis.status==='resolved'?axis.direction.x*(sample.position.yMm-axis.center.yMm)-axis.direction.y*(sample.position.xMm-axis.center.xMm):null;
  return {momentId:sample.momentId,position:sample.position,presentedSeconds:sample.presentedSeconds,residualMm};
 });
 const residuals=rows.filter(r=>r.residualMm!==null).map(r=>r.residualMm);
 return {axis,training,rows,comparison,
  rmsResidualMm:residuals.length?Math.hypot(...residuals)/Math.sqrt(residuals.length):null,
  maxResidualMm:residuals.length?Math.max(...residuals.map(Math.abs)):null,
  boundary:'The first demonstration alone determines the inferred line. Every selected second-demonstration point is evaluated against that unchanged line; no translation, rotation, scale or refitting uses the second source. This is a source-held-out geometric check under explicitly declared common coordinates, not independent physical validation. A small residual supports only proximity to this infinite line, not matching order, extent, timing, contact, a required task invariant or skill. A large residual may reflect different geometry or invalid calibration/correspondence. No physical tolerance, pass verdict or correction is inferred. Reversing source order asks a different question.'};
}
