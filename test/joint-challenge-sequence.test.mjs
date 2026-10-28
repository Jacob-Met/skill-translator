import test from 'node:test';
import assert from 'node:assert/strict';
import {
  startJointChallengeSequence as start, freezeNextJointChallengeRound as next,
  activeJointChallengeSequenceRequest as request, recordJointChallengeSequenceResult as record,
  analyzeJointChallengeSequence as analyze, exportJointChallengeSequence as save,
  importJointChallengeSequence as open, serializeJointChallengeSequence as serialize,
  MAX_JOINT_CHALLENGE_SEQUENCE_BYTES as LIMIT, jointChallengeSequenceContextMatches as contextMatches
} from '../src/joint-challenge-sequence.mjs';
import {freezeJointChallengePlan, analyzeJointChallenge, exportJointChallengeStudy, createJointChallengeResult} from '../src/joint-challenge.mjs';
import {jointSourceReading, createJointCalibrationHypothesis} from '../src/joint-calibration.mjs';
import {authoredJointSource, makeJointStudy, makeChallenge, futureTrial, outcomeAt} from './support/joint-challenge-conflict-fixtures.mjs';
import {sequenceInitial, nextRound, sequenceOutcome} from './support/joint-challenge-sequence-fixtures.mjs';

const begun = options => next(start(sequenceInitial(options)), nextRound());
function receive(sequence, mark, x, y, options) { return record(sequence, request(sequence), sequenceOutcome(sequence, mark, x, y, options)); }

test('a later workpiece retains the one shared explanation instead of restarting from 25', () => {
  const initial = sequenceInitial(), source = JSON.stringify(initial), sequence = next(start(initial), nextRound());
  const a = analyze(sequence), round = a.rounds[0];
  assert.equal(a.initial.combinationCount, 1); assert.equal(round.before.combinationCount, 1);
  assert.deepEqual(round.predictions[0].marks.map(mark => [mark.landmarkId, mark.candidates.length, mark.candidates[0].rule, mark.candidates[0].predicted.xMm, mark.candidates[0].predicted.yMm]),
    [['guide', 1, 'left', 20, 90], ['index', 1, 'left', 60, 150]]);
  const fresh = freezeJointChallengePlan(initial.plan.investigation, {id:'fresh',label:'Training only',prospectiveDeclaration:true,trials:[nextRound().trial]});
  assert.equal(analyzeJointChallenge(fresh, []).combinationCount, 25);
  const received = receive(receive(sequence, 'guide', 20, 90), 'index', 60, 150);
  assert.equal(analyze(received).current.combinationCount, 1);
  assert.equal(analyze(received).current.qualifiedCount, 4);
  assert.equal(JSON.stringify(initial), source); assert.equal(sequence.rounds[0].results.length, 0);
});

test('later actuals cannot rewrite frozen predictions or restore a rule excluded by retained prior evidence', () => {
  let sequence = begun(); const initialText = JSON.stringify(sequence.initial), firstPrediction = JSON.stringify(analyze(sequence).rounds[0].predictions);
  sequence = receive(receive(sequence, 'guide', 20, 90), 'index', 60, 150);
  const sealedText = JSON.stringify(sequence.rounds[0]);
  sequence = next(sequence, nextRound('third-round', 400, 320));
  assert.equal(analyze(sequence).rounds[0].sealed, true);
  sequence = receive(sequence, 'guide', 320, 120);
  assert.equal(analyze(sequence).current.combinationCount, 0);
  assert.equal(JSON.stringify(analyze(sequence).rounds[0].predictions), firstPrediction);
  assert.equal(JSON.stringify(sequence.rounds[0]), sealedText);
  assert.equal(JSON.stringify(sequence.initial), initialText);
  assert.throws(() => next(sequence, nextRound('fourth-round', 500, 400)), /No original joint explanation/);
});

test('cross-mark source switching is not a shared explanation and an empty initial family cannot continue', () => {
  const initial = sequenceInitial({alternatives:true}), plan = initial.plan;
  initial.results = [outcomeAt(plan, 'guide', 20, 60, 'first-workpiece'), outcomeAt(plan, 'index', 90, 100, 'first-workpiece')];
  const sequence = start(initial), a = analyze(sequence);
  assert.equal(a.current.combinationCount, 0); assert.equal(a.current.requiresSourceSwitching, true);
  assert.throws(() => next(sequence, nextRound()), /No original joint explanation/);
});

test('missing and imprecise prior outcomes are explicitly sealed, retained, and nonconstraining', () => {
  const initial = sequenceInitial({outcomes:false});
  initial.results = [outcomeAt(initial.plan, 'guide', 199, 159, 'first-workpiece', .2)];
  const started = start(initial);
  assert.throws(() => next(started, {...nextRound(), sealPriorDeclaration:false}), /seal/);
  assert.throws(() => next(started, {...nextRound(), prospectiveDeclaration:false}), /before seeing/);
  const sequence = next(started, nextRound()), a = analyze(sequence);
  assert.equal(a.rounds[0].before.missingCount, 1); assert.equal(a.rounds[0].before.impreciseCount, 1);
  assert.equal(a.rounds[0].before.combinationCount, 25); assert.equal(a.current.combinationCount, 25);
  assert.deepEqual(sequence.rounds[0].prefix.initial.results, initial.results);
  assert.throws(() => record(sequence, request(sequence), {...sequenceOutcome(sequence, 'guide', 20, 60), trialId:'first-workpiece'}), /current frozen/);
});

test('complete prior-source prefixes reject earlier result, precision, identity and declaration changes', () => {
  const sequence = next(receive(receive(begun(), 'guide', 20, 90), 'index', 60, 150), nextRound('third-round', 400, 320));
  const mutations = [
    x => x.initial.results[0].observation.label = 'Changed earlier acquisition',
    x => x.initial.plan.trials[0].uncertaintyMm = .3,
    x => x.rounds[0].results[0].observation.label = 'Changed sealed outcome',
    x => x.rounds[0].trial.label = 'Changed sealed workpiece',
    x => x.rounds[0].prospectiveDeclaration = false,
    x => x.rounds[1].prefix.rounds[0].results[0].observation.xMm++,
    x => x.rounds[1].prefix.initial.plan.id = 'Other-plan'
  ];
  for (const mutate of mutations) { const bad = save(sequence); mutate(bad); assert.throws(() => open(bad)); }
  const reorder = value => Array.isArray(value) ? value.map(reorder) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).reverse().map(key => [key, reorder(value[key])])) : value;
  assert.equal(serialize(open(reorder(save(sequence)))), serialize(sequence));
});

test('current intake binds the exact request and supplied anchors and preserves caller state on refusal', () => {
  const sequence = begun(), before = serialize(sequence), oldRequest = request(sequence);
  const later = next(sequence, nextRound('third-round', 400, 320));
  assert.throws(() => record(later, oldRequest, sequenceOutcome(later, 'guide', 20, 120)), /exact active round/);
  const wrong = structuredClone(oldRequest); wrong.trial.uncertaintyMm = .2;
  assert.throws(() => record(sequence, wrong, sequenceOutcome(sequence, 'guide', 20, 90)), /exact active round/);
  const valid = receive(sequence, 'guide', 20, 90).rounds[0].results[0];
  for (const reference of [null, false, 0, '', undefined]) {
    const input = sequenceOutcome(sequence, 'guide', 20, 90); input.observation = {...valid.observation, sourceReference:reference};
    assert.throws(() => record(sequence, oldRequest, input), /source reference/);
  }
  assert.throws(() => record(sequence, oldRequest, {...sequenceOutcome(sequence, 'guide', 20, 90), collectedAfterPlan:false}), /after the frozen plan/);
  assert.equal(serialize(sequence), before);
});

test('only the latest unsealed slot can be corrected and global observation identities remain distinct', () => {
  let sequence = begun(); sequence = receive(sequence, 'guide', 220, 90);
  assert.equal(analyze(sequence).current.combinationCount, 0);
  sequence = receive(sequence, 'guide', 20, 90, {id:'corrected-guide'});
  assert.equal(sequence.rounds[0].results.length, 1); assert.equal(analyze(sequence).current.combinationCount, 1);
  assert.throws(() => receive(sequence, 'index', 60, 150, {id:'first-workpiece-guide'}), /globally distinct/);
  assert.throws(() => receive(sequence, 'index', 60, 150, {id:'corrected-guide'}), /globally distinct/);
  const old = request(sequence), sealed = next(sequence, nextRound('third-round', 400, 320));
  assert.throws(() => record(sealed, old, sequenceOutcome(sequence, 'guide', 20, 90)), /exact active round/);
});

test('source-only replay ignores derived caches and preserves original roles', () => {
  const sequence = receive(receive(begun(), 'guide', 20, 90), 'index', 60, 150), source = save(sequence);
  source.analysis = {combinationCount:999}; source.rounds[0].predictions = [{xMm:999}];
  source.initial.plan.readings = [{id:'invented',combinationCount:999}];
  const reopened = open(source);
  assert.equal(serialize(reopened), serialize(sequence));
  assert.equal(analyze(reopened).current.combinationCount, 1);
  assert.equal(reopened.initial.plan.investigation.observations.length, 2);
  assert.equal(reopened.rounds[0].results.length, 2);
  assert.equal('predictions' in save(reopened).rounds[0], false);
  assert.ok(Object.isFrozen(reopened.rounds[0].prefix.initial.plan.investigation.source));
});

test('reopened context matches identical admitted sources regardless of JSON key order', () => {
  const initial = sequenceInitial(), sequence = open(serialize(next(start(initial), nextRound())));
  assert.notEqual(JSON.stringify(sequence.initial), JSON.stringify(initial));
  assert.equal(contextMatches(sequence, initial, initial.plan.investigation), true);
  const changed = structuredClone(initial); changed.plan.label = 'A different initial challenge';
  assert.equal(contextMatches(sequence, changed, initial.plan.investigation), false);
  const training = structuredClone(initial.plan.investigation); training.observations[0].label = 'A changed training record';
  assert.equal(contextMatches(sequence, initial, training), false);
  assert.equal(contextMatches(sequence, null, initial.plan.investigation), false);
});

test('the complete course enforces distinct dimensions, round IDs and conservative original-family sheet admission', () => {
  const sequence = begun();
  for (const input of [nextRound('same-as-first',200,160), nextRound('training-size',100,80), nextRound('second-round',400,320), nextRound('tiny',10,10)]) assert.throws(() => next(sequence,input));
  for (const value of [NaN, Infinity, 0, 10001]) assert.throws(() => next(sequence,{...nextRound('bad',400,320),trial:{...nextRound('bad',400,320).trial,widthMm:value}}));
  assert.throws(() => next(sequence,{...nextRound('bad',400,320),trial:{...nextRound('bad',400,320).trial,uncertaintyMm:1001}}));
  const invalid = save(sequence); invalid.rounds[0].results = null; assert.throws(() => open(invalid), /explicit array/);
});

test('six workpieces span five ordered rounds and a seventh is refused', () => {
  let sequence = start(sequenceInitial({outcomes:false}));
  for (let i=0; i<5; i++) sequence = next(sequence,nextRound('round-'+i,300+i*100,240+i*80));
  const a = analyze(sequence); assert.equal(a.workpieceCount,6); assert.equal(a.remainingWorkpieces,0);
  assert.equal(a.current.missingCount,12); assert.equal(a.current.combinationCount,25);
  assert.throws(() => next(sequence,nextRound('seventh',900,720)), /five later rounds|six workpieces/);
});

test('12 marks and six workpieces retain all 72 outcomes with factored joint counts', () => {
  const source = structuredClone(authoredJointSource);
  source.landmarks = Array.from({length:12},(_,i)=>({...source.landmarks[0],id:'mark-'+i,sourcePx:{x:10+i*5,y:20+i}}));
  const investigation = makeJointStudy(source,false);
  investigation.hypotheses = Array.from({length:24},(_,i)=>createJointCalibrationHypothesis(source,{id:'reading-'+i,label:'Same original geometry',basis:'proposed-reading',reading:jointSourceReading(source)}));
  const trials = Array.from({length:5},(_,i)=>futureTrial('initial-'+i,200+i*10,160+i*10,1000));
  const plan = makeChallenge(investigation,trials);
  const results = trials.flatMap(trial=>source.landmarks.map(mark=>outcomeAt(plan,mark.id,mark.sourcePx.x*trial.widthMm/100,mark.sourcePx.y*trial.heightMm/80,trial.id,1000)));
  let sequence = next(start(exportJointChallengeStudy(plan,results)), {...nextRound('sixth',300,240),trial:futureTrial('sixth-workpiece',300,240,1000)});
  const combined = freezeJointChallengePlan(investigation,{id:'capacity',label:'Capacity control',prospectiveDeclaration:true,trials:[...trials,sequence.rounds[0].trial]});
  const complete = save(sequence);
  complete.rounds[0].results = source.landmarks.map(mark=>createJointChallengeResult(combined,sequenceOutcome(sequence,mark.id,mark.sourcePx.x*3,mark.sourcePx.y*3,{radius:1000})));
  sequence = open(complete); const a = analyze(sequence);
  assert.equal(a.outcomeCount,72); assert.equal(a.current.qualifiedCount,72);
  assert.equal(a.current.combinationCount,25*5**12);
  assert.equal(open(serialize(sequence)).rounds[0].results.length,12);
});

test('canonical UTF-8 export counts its final newline and the exact maximum reopens', () => {
  const initial = sequenceInitial(); initial.plan.investigation.source.padding = '';
  const empty = start(initial), gap = LIMIT - new TextEncoder().encode(serialize(empty)).length;
  initial.plan.investigation.source.padding = 'x'.repeat(gap);
  const maximum = start(initial), text = serialize(maximum);
  assert.equal(new TextEncoder().encode(text).length,LIMIT); assert.equal(text.at(-1),'\n');
  assert.equal(serialize(open(text)),text);
  assert.throws(() => open(text+' '), /4,000,000/);
  assert.throws(() => next(maximum,nextRound()), /4,000,000/);
  initial.plan.investigation.source.padding += 'x'; assert.throws(() => start(initial), /4,000,000/);
  initial.plan.investigation.source.padding = 'é'.repeat(Math.floor(gap/2)+1); assert.throws(() => start(initial), /4,000,000/);
});
