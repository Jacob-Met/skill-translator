import {assessPairInterpretations,importPairInterpretations} from './pair-interpretations.mjs';
import {polygonPairDistance} from './polygon-pair-distance.mjs';
import {nominalGeometryPolicy} from './annotation-bound.mjs';
import {rational as q,add,sub,mul,cmp,serial} from '../vendor/chronos/exact-halfplanes.mjs';
const zero=q(0),square=x=>mul(x,x),read=x=>[BigInt(x.numerator),BigInt(x.denominator)];
/** Whole-sheet nominal geometry, both endpoints free. This does not solve an
 * anchored correction, change an actual score, or establish physical feasibility.
 */
export function inspectPairSheetFit(raw){
 const accepted=importPairInterpretations(raw),assessment=assessPairInterpretations(accepted);
 const {widthMm,heightMm}=accepted.session.reference.target;
 const rectangle=[{x:0,y:0},{x:widthMm,y:0},{x:widthMm,y:heightMm},{x:0,y:heightMm}];
 const exact=polygonPairDistance(rectangle,rectangle),maximumSquared=read(exact.maximum.squared);
 // Keep the operational allowance exactly as task-relationships/pair-interpretations
 // calculate it. A separate inherited endpoint guard prevents near-tangent exact
 // geometry from overruling the maintained rounded-distance verdict.
 const operationalAllowanceMm=accepted.pair.toleranceMm+1e-9;
 const endpointPolicy=nominalGeometryPolicy(widthMm,heightMm),guardMm=2*endpointPolicy.guardMm,guard=q(guardMm);
 function inspect(expectedMm,key){
  const lower=sub(q(expectedMm),q(operationalAllowanceMm)),upper=add(q(expectedMm),q(operationalAllowanceMm));
  const outsideLower=sub(lower,guard),insideLower=add(lower,guard);
  const strictlyExcluded=cmp(outsideLower,zero)>0&&cmp(maximumSquared,square(outsideLower))<0;
  const nearBoundary=cmp(insideLower,zero)>0&&cmp(maximumSquared,square(insideLower))<=0;
  const withinRounds=assessment.rounds.filter(r=>r[key].status==='within').map(r=>r.round);
  // Never manufacture a categorical exclusion against an admitted actual witness.
  const numericConflict=strictlyExcluded&&withinRounds.length>0;
  const status=numericConflict?'boundary-unresolved':strictlyExcluded?'excluded':nearBoundary?'boundary-unresolved':'not-ruled-out';
  return {expectedMm,status,operationalAllowanceMm,numericalGuardMm:guardMm,
   exactBand:{lower:serial(lower),upper:serial(upper)},exactGuardedExclusionThreshold:serial(outsideLower),withinRounds,numericConflict,
   reason:status==='excluded'?'Even the whole nominal sheet is too small for this guarded pair band; changing the actual attempt cannot resolve that nominal geometric incompatibility.':status==='boundary-unresolved'?'The band meets a numerical boundary or conflicts with an admitted within witness; no sheet-wide exclusion is made.':'This sheet-only distance test does not rule out the band. Other task constraints and physical feasibility are not established.'};
 }
 return {sheet:{widthMm,heightMm,rectangle},assumption:'Both endpoints may lie anywhere on the entire nominal rectangle; no observed anchor is held fixed.',
  exactSquaredExtrema:exact,approximateMaximumMm:Math.sqrt(exact.maximum.squaredBounds.upper),
  policy:{source:'nominalGeometryPolicy from maintained annotation-bound.mjs; two endpoint guards',endpointGuardMm:endpointPolicy.guardMm,pairGuardMm:guardMm,operationalAllowanceMm},
  fixed:inspect(assessment.sourceExpectedMm,'fixed'),adapted:inspect(assessment.adaptedExpectedMm,'adapted'),
  limitations:['Exact predicates concern declared nominal geometry and guarded bands; displayed square roots are approximate.',
   'The inherited numerical guard is a conservative comparison policy, not a certified rounding bound, physical uncertainty interval or calibration accuracy claim.',
   'Existing actual within/outside/incomplete assessments and point scores are unchanged. No replacement placement, preferred rule, necessity or physical action is inferred.',
   'A band not ruled out by this whole-sheet test may still conflict with an observed anchor, other marks or other task requirements.']};
}
