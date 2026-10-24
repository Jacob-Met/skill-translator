/** Retrospective leave-one-observation-out prediction; maintained affine geometry. */
import {validateResponseStudy, analyzeResponseStudy} from './response-family.mjs';
import {derive} from './geometry.mjs';
import {rational as r, add, sub, mul, cmp, enclosure, serial} from '../vendor/chronos/exact-halfplanes.mjs';

export const HOLDOUT_SCHEMA = 'skill-translator-response-holdout/v1';
const exact = value => [BigInt(value.numerator), BigInt(value.denominator)];

export function analyzeResponseHoldouts(input) {
  const study = validateResponseStudy(input);
  const task = derive(study.source);
  const mark = task.landmarks.find(m => m.id === study.landmarkId);
  const full = analyzeResponseStudy(study);
  const rows = study.observations.map(observation => {
    const remaining = study.observations.filter(row => row.id !== observation.id);
    const training = analyzeResponseStudy({...study, observations:remaining,
      target:{widthMm:observation.widthMm,heightMm:observation.heightMm}});
    if (training.status === 'incompatible') return {observation, retainedCount:remaining.length,
      status:'remainder-incompatible', axes:null, variationRank:training.variationRank};
    const axes = {};
    for (const axis of ['x','y']) {
      const origin = r(axis === 'x' ? mark.uv.u * task.source.widthMm : mark.uv.v * task.source.heightMm);
      const dw = sub(r(observation.widthMm),r(task.source.widthMm));
      const dh = sub(r(observation.heightMm),r(task.source.heightMm));
      const values = training.axes[axis].vertices.map(vertex => {
        const [a,b] = vertex.exact.map(exact);
        return {value:add(origin,add(mul(dw,a),mul(dh,b))), coefficients:vertex.exact};
      });
      const lower = values.reduce((a,b) => cmp(a.value,b.value) <= 0 ? a : b);
      const upper = values.reduce((a,b) => cmp(a.value,b.value) >= 0 ? a : b);
      const observedLower = sub(r(observation[axis+'Mm']),r(observation[axis+'BoundMm']));
      const observedUpper = add(r(observation[axis+'Mm']),r(observation[axis+'BoundMm']));
      const excluded = cmp(upper.value,observedLower) < 0 || cmp(lower.value,observedUpper) > 0;
      const contained = cmp(lower.value,observedLower) >= 0 && cmp(upper.value,observedUpper) <= 0;
      axes[axis] = {status:excluded?'excluded':contained?'contained':'overlaps',
        prediction:training.axes[axis].prediction,
        observed:{lower:enclosure(observedLower).lower,upper:enclosure(observedUpper).upper},
        exactPrediction:{lower:serial(lower.value),upper:serial(upper.value)},
        witnesses:{lower:lower.coefficients,upper:upper.coefficients},
        extendsBeyondSheet:training.axes[axis].extendsBeyondSheet};
    }
    const status = Object.values(axes).some(axis=>axis.status==='excluded') ? 'excluded'
      : Object.values(axes).every(axis=>axis.status==='contained') ? 'contained' : 'overlaps';
    return {observation,retainedCount:remaining.length,status,axes,variationRank:training.variationRank,
      domainOnly:remaining.length===0};
  });
  return {schema:HOLDOUT_SCHEMA,study,full,rows,complete:true,
    limitations:[
      'Each row is omitted in turn; the original source, calibration, coefficient domain and all other observations stay fixed.',
      'Contained means every remaining-model prediction falls inside that omitted coordinate box. Overlaps means some do and some do not. Excluded means no complete remaining model meets it.',
      'An incompatible remainder has no predictive family; it is not a successful or failed prediction.',
      'This is retrospective sensitivity analysis. Previously inspected observations are not a prospective test, independent sample or evidence of learned physical skill.',
      'The fixed source point is never held out. Repeated demonstrations, correlated errors, source calibration and model choice can make this audit optimistic.',
      'No observation is removed or ranked as faulty. Bounds and model assumptions may be wrong; predictions are not clipped to the workpiece.'
    ]};
}
