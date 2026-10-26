// Spatial return proposals from retained samples, not physical action detection.
import {inspectSequencePath} from './sequence-path.mjs';
import {GeometryError} from './geometry.mjs';

/** Each start proposes its first sampled re-entry after a witnessed departure.
 * Missing samples terminate the search. No interpolation or frame fabrication.
 * Overlapping proposals are retained: choosing task cycles requires context. */
export function proposePathReturns(raw, radiusMm) {
  if (typeof radiusMm !== 'number' || !Number.isFinite(radiusMm) || radiusMm < 0)
    throw new GeometryError('Supply a finite nonnegative return radius in millimetres.');
  const findings = inspectSequencePath(raw);
  const proposals = [];
  const samples = findings.samples;
  for (let start = 0; start < samples.length; start++) {
    const origin = samples[start];
    if (!origin.position) continue;
    let departure = null, farthest = null;
    for (let next = start + 1; next < samples.length; next++) {
      const sample = samples[next];
      if (!sample.position) break;
      const distanceMm = Math.hypot(sample.position.xMm - origin.position.xMm,
        sample.position.yMm - origin.position.yMm);
      if (!Number.isFinite(distanceMm)) throw new GeometryError('Return comparison exceeds finite calculation capacity.');
      if (distanceMm > radiusMm && distanceMm - radiusMm > findings.numericalLengthGuardMm) {
        if (departure === null) departure = next;
        if (farthest === null || distanceMm > farthest.distanceMm)
          farthest = {sampleIndex: next, momentId: sample.momentId, distanceMm};
      } else if (distanceMm <= radiusMm && departure !== null) {
        proposals.push({fromIndex: start, toIndex: next,
          fromMomentId: origin.momentId, toMomentId: sample.momentId,
          departureIndex: departure, departureMomentId: samples[departure].momentId,
          farthest, endpointDistanceMm: distanceMm,
          elapsedSeconds: sample.presentedSeconds - origin.presentedSeconds});
        break;
      }
    }
  }
  return {radiusMm, numericalLengthGuardMm: findings.numericalLengthGuardMm, proposals, originalSampleCount: samples.length,
    missingMomentIds: samples.filter(s => !s.position).map(s => s.momentId),
    boundary: 'These are first sampled re-entries after a sampled departure from each original point’s declared radius. Overlapping candidates remain alternatives, not counted task cycles. Missing readings break searches; unselected frames and intervening movement remain unknown. Departure must exceed the radius by more than the maintained numerical length guard; near-boundary differences do not establish departure. The radius and guard are nominal geometry, not measurement uncertainty. A spatial return does not establish a repeated action, contact, task completion, physical trajectory or learned skill. Original evidence is unchanged.'};
}
