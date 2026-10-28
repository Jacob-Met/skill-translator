// Complete workpiece-subset diagnostics over the maintained frozen explanations.
import {analyzeJointChallenge} from './joint-challenge.mjs';

export function analyzeJointChallengeConflicts(rawPlan, rawResults) {
  // Admission, source reconstruction, precision qualification and geometric
  // residual decisions remain owned by the maintained challenge analysis.
  const analysis = analyzeJointChallenge(rawPlan, rawResults);
  const trials = analysis.trials;
  if (trials.length > 6) throw new RangeError('Conflict inspection supports at most six frozen workpieces');
  const trialIndex = new Map(trials.map((trial, index) => [trial.id, index]));
  const fullMask = (1 << trials.length) - 1;
  const included = (mask, trialId) => {
    const index = trialIndex.get(trialId);
    if (index === undefined) throw new Error('Challenge residual has an unknown workpiece');
    return (mask & (1 << index)) !== 0;
  };

  // A candidate is eliminated by a subset exactly when that subset contains a
  // workpiece with a qualified residual that the maintained analysis rejected.
  // Keep the family factored by reading and mark; never expand rule products.
  const family = analysis.readings.map(reading => ({
    id: reading.id,
    label: reading.label,
    marks: reading.marks.map(mark => ({
      landmarkId: mark.landmarkId,
      candidates: mark.candidates.map(candidate => {
        const rejections = candidate.residuals.filter(row => row.compatible === false);
        let rejectedMask = 0;
        for (const row of rejections) {
          const index = trialIndex.get(row.trialId);
          if (index === undefined) throw new Error('Challenge residual has an unknown workpiece');
          rejectedMask |= 1 << index;
        }
        return {rule: candidate.rule, rejectedMask, rejections};
      })
    }))
  }));

  function summarize(mask) {
    let combinationCount = 0;
    const viableReadingIds = [];
    for (const reading of family) {
      let readingCount = 1;
      for (const mark of reading.marks) {
        readingCount *= mark.candidates.filter(candidate => (candidate.rejectedMask & mask) === 0).length;
      }
      if (readingCount > 0) viableReadingIds.push(reading.id);
      combinationCount += readingCount;
    }
    return {
      mask,
      trialIds: trials.filter(trial => included(mask, trial.id)).map(trial => trial.id),
      combinationCount,
      viableReadingIds
    };
  }

  // The admitted plan has at most six workpieces: at most 63 nonempty subsets.
  const subsets = Array.from({length: fullMask + 1}, (_, mask) => summarize(mask));
  if (subsets[0].combinationCount <= 0 || subsets[fullMask].combinationCount !== analysis.combinationCount) {
    throw new Error('Workpiece diagnostic disagrees with the maintained frozen family');
  }
  const contradictory = subsets.slice(1).filter(subset => subset.combinationCount === 0);
  const minimal = contradictory.filter(subset => subset.trialIds.every(trialId => {
    const bit = 1 << trialIndex.get(trialId);
    return subsets[subset.mask ^ bit].combinationCount > 0;
  }));
  minimal.sort((a, b) => a.trialIds.length - b.trialIds.length || a.mask - b.mask);

  const minimalGroups = minimal.map(subset => {
    const selectedTrials = trials.filter(trial => included(subset.mask, trial.id));
    const slots = selectedTrials.flatMap(trial => trial.slots);
    return {
      trialIds: subset.trialIds,
      qualifiedObservationIds: slots.filter(slot => slot.status === 'qualified').map(slot => slot.observation.id),
      impreciseObservationIds: slots.filter(slot => slot.status === 'insufficient-precision').map(slot => slot.observation.id),
      missingSlots: slots.filter(slot => slot.status === 'missing').map(slot => ({trialId: slot.trialId, landmarkId: slot.landmarkId})),
      // Conjunction makes incompatibility monotone. It is sufficient to check
      // every immediate removal to prove inclusion-minimality of this subset.
      singleRemovalSupport: selectedTrials.map(trial => {
        const remainder = subsets[subset.mask ^ (1 << trialIndex.get(trial.id))];
        return {removedTrialId: trial.id, combinationCount: remainder.combinationCount, viableReadingIds: remainder.viableReadingIds};
      }),
      readingEliminations: family.map(reading => ({
        readingId: reading.id,
        readingLabel: reading.label,
        blockedMarks: reading.marks.filter(mark => mark.candidates.every(candidate => (candidate.rejectedMask & subset.mask) !== 0)).map(mark => ({
          landmarkId: mark.landmarkId,
          rules: mark.candidates.map(candidate => ({
            rule: candidate.rule,
            rejectingObservationIds: candidate.rejections.filter(row => included(subset.mask, row.trialId)).map(row => row.observationId)
          }))
        }))
      }))
    };
  });

  return {
    analysis,
    evaluatedNonemptySubsets: fullMask,
    enumerationComplete: true,
    baselineCombinationCount: subsets[0].combinationCount,
    contradictorySubsetCount: contradictory.length,
    minimalGroups,
    subsets: subsets.slice(1),
    limitations: [
      'Every workpiece is one group containing all its supplied selected-mark outcomes; minimality is not over individual observations.',
      'One original shared source reading and one fixed rule per mark must explain every qualified outcome in a group.',
      'Missing and imprecise outcomes remain visible and cannot eliminate explanations.',
      'All inclusion-minimal groups are returned, including alternatives of different sizes; this does not identify faulty observations or recommend removing evidence.',
      'These are conditional finite-family diagnostics, not probabilities, causal explanations or physical-skill validation.'
    ]
  };
}
