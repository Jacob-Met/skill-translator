// Ordered, source-bound continuation of the maintained finite joint challenge.
import {GeometryError} from './geometry.mjs';
import {analyzeJointChallengeConflicts} from './joint-challenge-conflicts.mjs';
import {
  freezeJointChallengePlan, createJointChallengeResult, analyzeJointChallenge,
  exportJointChallengeStudy, importJointChallengeStudy,
  MAX_JOINT_CHALLENGE_TRIALS, MAX_JOINT_CHALLENGE_RESULTS, MAX_JOINT_CHALLENGE_BYTES
} from './joint-challenge.mjs';

export const JOINT_CHALLENGE_SEQUENCE_SCHEMA = 'skill-translator-joint-challenge-sequence/v1';
export const JOINT_CHALLENGE_SEQUENCE_REQUEST_SCHEMA = 'skill-translator-joint-challenge-sequence-request/v1';
const PREFIX_SCHEMA = 'skill-translator-joint-challenge-sequence-prefix/v1';
export const MAX_JOINT_CHALLENGE_SEQUENCE_BYTES = MAX_JOINT_CHALLENGE_BYTES;
const requireThat = (ok, message) => { if (!ok) throw new GeometryError(message); };
const copy = value => JSON.parse(JSON.stringify(value));
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function bytes(text) { return new TextEncoder().encode(text).length; }
function admitInput(raw) {
  try {
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
    requireThat(typeof text === 'string' && bytes(text) <= MAX_JOINT_CHALLENGE_SEQUENCE_BYTES,
      'Complete sequence exceeds 4,000,000 UTF-8 bytes');
    return typeof raw === 'string' ? JSON.parse(text) : raw;
  } catch (error) {
    if (error instanceof GeometryError) throw error;
    throw new GeometryError('Supply valid, bounded sequence JSON');
  }
}
function checkOutput(source) {
  requireThat(bytes(canonical(source) + '\n') <= MAX_JOINT_CHALLENGE_SEQUENCE_BYTES,
    'Complete canonical sequence, including its final newline, exceeds 4,000,000 UTF-8 bytes');
}
function bareRound(round) {
  return {
    id: round.id, label: round.label, prospectiveDeclaration: true, sealPriorDeclaration: true,
    trial: round.trial, results: round.results
  };
}
function prefixFor(source) {
  return {schema: PREFIX_SCHEMA, initial: source.initial, rounds: source.rounds.map(bareRound)};
}
function requestFor(round) {
  return {
    schema: JOINT_CHALLENGE_SEQUENCE_REQUEST_SCHEMA, id: round.id, label: round.label,
    prospectiveDeclaration: true, sealPriorDeclaration: true, trial: round.trial, prefix: round.prefix
  };
}
function initialSource(raw) {
  const admitted = importJointChallengeStudy(raw);
  return {plan: admitted.plan, results: admitted.results, source: exportJointChallengeStudy(admitted.plan, admitted.results)};
}
function admission(rawInput) {
  const raw = admitInput(rawInput);
  requireThat(raw?.schema === JOINT_CHALLENGE_SEQUENCE_SCHEMA, 'Unsupported joint challenge sequence schema');
  requireThat(Array.isArray(raw.rounds) && raw.rounds.length < MAX_JOINT_CHALLENGE_TRIALS,
    'A sequence can contain at most five later rounds');
  const initial = initialSource(raw.initial);
  const source = {schema: JOINT_CHALLENGE_SEQUENCE_SCHEMA, initial: initial.source, rounds: []};
  let trials = [...initial.plan.trials], results = [...initial.results];
  let latestPlan = initial.plan, latestAnalysis = analyzeJointChallenge(initial.plan, initial.results);
  const initialAnalysis = latestAnalysis, rounds = [], ids = new Set([initial.plan.id]);
  for (const candidate of raw.rounds) {
    requireThat(candidate && typeof candidate === 'object', 'Supply each source round');
    requireThat(candidate.prospectiveDeclaration === true, 'Declare the later workpiece before seeing its outcomes');
    requireThat(candidate.sealPriorDeclaration === true, 'Explicitly seal the currently reported prior evidence');
    requireThat(latestAnalysis.combinationCount > 0, 'No original joint explanation remains; another round cannot be frozen');
    requireThat(!ids.has(candidate.id), 'Round identifiers must be distinct from the initial plan and all previous rounds');
    const prefix = prefixFor(source);
    requireThat(canonical(candidate.prefix) === canonical(prefix), 'The frozen round does not bind the complete original prior-source prefix');
    requireThat(trials.length < MAX_JOINT_CHALLENGE_TRIALS, 'The complete sequence can contain at most six workpieces');
    requireThat(Array.isArray(candidate.results), 'Round results must be an explicit array');
    requireThat(results.length + candidate.results.length <= MAX_JOINT_CHALLENGE_RESULTS, 'The complete sequence can contain at most 72 outcomes');
    // The unchanged freezer keeps whole-original-family on-sheet admission.
    const plan = freezeJointChallengePlan(initial.plan.investigation, {
      id: candidate.id, label: candidate.label, prospectiveDeclaration: true,
      trials: [...trials, candidate.trial]
    });
    const trial = plan.trials.at(-1);
    requireThat(candidate.results.every(result => result?.trialId === trial.id), 'A round can report only its own frozen workpiece');
    const combined = exportJointChallengeStudy(plan, [...results, ...candidate.results]);
    const received = combined.results.slice(results.length);
    const before = analyzeJointChallenge(plan, results);
    const after = analyzeJointChallenge(plan, combined.results);
    const item = {
      id: plan.id, label: plan.label, prospectiveDeclaration: true, sealPriorDeclaration: true,
      trial, prefix, results: received
    };
    rounds.push({source: item, plan, before, after, prior: latestAnalysis, priorWorkpieces: trials.length});
    source.rounds.push(item); ids.add(item.id);
    trials = [...plan.trials]; results = combined.results;
    latestPlan = plan; latestAnalysis = after;
  }
  checkOutput(source);
  return {source, initial, initialAnalysis, rounds, latestPlan, latestAnalysis, trials, results};
}

export function startJointChallengeSequence(rawInitialStudy) {
  const initial = initialSource(rawInitialStudy);
  return freeze(admission({schema: JOINT_CHALLENGE_SEQUENCE_SCHEMA, initial: initial.source, rounds: []}).source);
}
export function importJointChallengeSequence(raw) { return freeze(admission(raw).source); }
export function exportJointChallengeSequence(raw) { return copy(admission(raw).source); }
export function serializeJointChallengeSequence(raw) { return canonical(admission(raw).source) + '\n'; }

// Context comparison for already-admitted source records; this does not admit input.
export function jointChallengeSequenceContextMatches(sequence, initialStudy, investigation) {
  const retained = sequence?.initial;
  if (!retained?.plan?.investigation || !initialStudy || !investigation) return false;
  return canonical(retained) === canonical(initialStudy)
    && canonical(retained.plan.investigation) === canonical(investigation);
}

export function freezeNextJointChallengeRound(raw, input) {
  const state = admission(raw);
  requireThat(input?.prospectiveDeclaration === true, 'Declare the new workpiece before seeing its outcomes');
  requireThat(input?.sealPriorDeclaration === true, 'Explicitly seal the currently reported prior evidence');
  const round = {
    id: input.id, label: input.label, prospectiveDeclaration: true, sealPriorDeclaration: true,
    trial: input.trial, prefix: prefixFor(state.source), results: []
  };
  return freeze(admission({...state.source, rounds: [...state.source.rounds, round]}).source);
}
export function activeJointChallengeSequenceRequest(raw) {
  const state = admission(raw), current = state.source.rounds.at(-1);
  requireThat(current, 'Freeze a later round before receiving its outcome');
  return freeze(copy(requestFor(current)));
}
export function recordJointChallengeSequenceResult(raw, rawRequest, input) {
  const state = admission(raw), current = state.rounds.at(-1);
  requireThat(current, 'Freeze a later round before receiving its outcome');
  const request = requestFor(current.source);
  requireThat(canonical(admitInput(rawRequest)) === canonical(request), 'Outcome request differs from the exact active round and prior-source prefix');
  requireThat(input?.trialId === current.source.trial.id, 'Outcome must name the current frozen workpiece');
  const row = createJointChallengeResult(current.plan, input);
  const source = copy(state.source), last = source.rounds.at(-1);
  last.results = [...last.results.filter(old => old.observation.landmarkId !== row.observation.landmarkId), row];
  return freeze(admission(source).source);
}

function summary(analysis) {
  return {
    status: analysis.status, combinationCount: analysis.combinationCount,
    viableReadingIds: [...analysis.viableReadingIds], qualifiedCount: analysis.qualifiedCount,
    missingCount: analysis.missingCount, impreciseCount: analysis.impreciseCount,
    totalCount: analysis.totalCount, requiresSourceSwitching: analysis.requiresSourceSwitching
  };
}
export function analyzeJointChallengeSequence(raw) {
  const state = admission(raw);
  const rounds = state.rounds.map(round => ({
    id: round.source.id, label: round.source.label, trial: round.source.trial,
    sealed: round !== state.rounds.at(-1),
    priorWorkpieces: round.priorWorkpieces, before: summary(round.prior), after: summary(round.after),
    slots: round.after.trials.find(trial => trial.id === round.source.trial.id).slots,
    predictions: round.before.readings.filter(reading => reading.viable).map(reading => ({
      id: reading.id, label: reading.label, combinationCount: reading.combinationCount,
      marks: reading.marks.map(mark => ({
        landmarkId: mark.landmarkId,
        candidates: mark.candidates.filter(candidate => candidate.status === 'compatible').map(candidate => ({
          rule: candidate.rule,
          predicted: candidate.residuals.find(residual => residual.trialId === round.source.trial.id).predicted
        }))
      }))
    }))
  }));
  return freeze({
    initial: {label: state.initial.plan.label, ...summary(state.initialAnalysis), trials: state.initialAnalysis.trials},
    rounds, current: summary(state.latestAnalysis),
    workpieceCount: state.trials.length, remainingWorkpieces: MAX_JOINT_CHALLENGE_TRIALS - state.trials.length,
    outcomeCount: state.results.length,
    limitations: [
      'Original training is fixed. One original source reading and one fixed rule per mark explain all retained workpieces.',
      'Each later prediction uses only its sealed prior-source prefix. Missing and imprecise outcomes stay visible and cannot eliminate explanations.',
      'Every originally training-supported prediction must fit each proposed sheet; a prior exclusion does not relax that conservative admission.',
      'The latest unsealed outcome can be corrected; an older sealed outcome cannot be changed through current intake.',
      'Finite counts are not probabilities. Prospective timing and measurement origin remain declarations, not authenticated acquisition.'
    ]
  });
}

// Retrospective grouping over the admitted original family. Each round's
// prospective predictions remain owned by analyzeJointChallengeSequence.
export function analyzeJointChallengeSequenceConflicts(raw) {
  const state = admission(raw);
  const diagnostic = analyzeJointChallengeConflicts(state.latestPlan, state.results);
  const workpieces = state.initial.plan.trials.map(trial => ({
    trialId: trial.id, label: trial.label, origin: 'initial', roundIndex: 0,
    roundId: state.initial.plan.id, roundLabel: state.initial.plan.label, sealed: true
  }));
  for (const [index, round] of state.rounds.entries()) {
    workpieces.push({
      trialId: round.source.trial.id, label: round.source.trial.label,
      origin: 'later-round', roundIndex: index + 1,
      roundId: round.source.id, roundLabel: round.source.label,
      sealed: index < state.rounds.length - 1
    });
  }
  return freeze({
    ...diagnostic, workpieces,
    interpretation: 'retrospective-workpiece-groups',
    limitations: [...diagnostic.limitations,
      'This retrospective diagnosis uses the original training-supported family across the complete admitted sequence. Earlier predictions remain bound to their own prior-source prefixes.',
      'Initial workpieces stay separate groups. Original round locations and sealed/current state are retained; no acquisition declaration or evidence removal is created.'
    ]
  });
}
