import {exportJointChallengeStudy} from '../../src/joint-challenge.mjs';
import {authoredJointSource, makeJointStudy, makeChallenge, futureTrial, outcomeAt} from './joint-challenge-conflict-fixtures.mjs';

export function sequenceInitial({alternatives = false, outcomes = true} = {}) {
  const plan = makeChallenge(makeJointStudy(authoredJointSource, alternatives), [futureTrial('first-workpiece', 200, 160)]);
  const results = outcomes ? [outcomeAt(plan, 'guide', 20, 60, 'first-workpiece'), outcomeAt(plan, 'index', 60, 100, 'first-workpiece')] : [];
  return exportJointChallengeStudy(plan, results);
}
export function nextRound(id = 'second-round', widthMm = 300, heightMm = 240) {
  return {
    id, label: 'Authored ' + id, prospectiveDeclaration: true, sealPriorDeclaration: true,
    trial: futureTrial(id + '-workpiece', widthMm, heightMm)
  };
}
export function sequenceOutcome(sequence, landmarkId, xMm, yMm, {radius = .01, id} = {}) {
  const trial = sequence.rounds.at(-1).trial;
  return {
    trialId: trial.id, collectedAfterPlan: true,
    observation: {
      id: id ?? trial.id + '-' + landmarkId, label: 'Authored outcome for ' + landmarkId,
      landmarkId, evidenceClass: 'authored-example', widthMm: trial.widthMm, heightMm: trial.heightMm,
      xMm, yMm, uncertaintyMm: radius
    }
  };
}
