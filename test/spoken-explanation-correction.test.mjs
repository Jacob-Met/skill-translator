import test from 'node:test';
import assert from 'node:assert/strict';
import {createSequence, appendMoment, upsertStep} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
import {createSpokenExplanations, addSpokenExplanation, validateSpokenExplanations, updateSpokenExplanation} from '../src/spoken-explanations.mjs';
function source() {
  const clip = {name: 'authored-fold.webm', mimeType: 'video/webm', sizeBytes: 1234, sha256: 'a'.repeat(64), durationSeconds: 20};
  let sequence = createSequence(clip, {title: 'Authored bookbinding control', context: 'Software fixture; not observed craft work.'});
  for (const [index, time] of [0, 2, 4].entries()) {
    const image = {name: 'frame-' + index + '.png', mimeType: 'image/png', sha256: String(index + 1).repeat(64), widthPx: 640, heightPx: 360, pixelCoordinates: 'browser-oriented'};
    sequence = appendMoment(sequence, {id: 'moment-' + index, label: 'State ' + index, visibleState: 'Authored state', image,
      origin: frameOrigin(clip, time, {mediaTime: time, width: 640, height: 360}, image)});
  }
  for (let index = 0; index < 2; index++) sequence = upsertStep(sequence, {id: 'step-' + index,
    beforeMomentId: 'moment-' + index, afterMomentId: 'moment-' + (index + 1), title: 'Stage ' + index,
    intent: 'Keep the fold against the guide', visibleChange: 'The authored sheet is folded',
    sensoryCue: 'Original supplied resistance account', recoveryCue: 'Original recovery note'});
  return sequence;
}

const audio = (hash = 'b', sizeBytes = 8044) => ({sha256: hash.repeat(64), mimeType: 'audio/wav', sizeBytes, name: 'explanation.wav'});
const note = (id = 'note-1', stepId = 'step-0', recording = audio()) => ({id, stepId, attribution: 'Supplied by an author · software control', description: 'A separately recorded account of resistance.', audio: recording});

function verifyCorrectionContract(update, validate, notebook) {
  assert.ok(notebook.explanations.length >= 2, 'Use two retained explanations to detect collateral changes');
  const base = validate(notebook.source, notebook);
  const id = base.explanations[0].id;
  const frozen = structuredClone(base);
  const freeze = object => { Object.freeze(object); for (const value of Object.values(object)) if (value && typeof value === 'object') freeze(value); };
  freeze(frozen);
  const run = patch => update(frozen, frozen.source, id, patch);
  const corrected = run({attribution: '  Correct supplier  ', description: '  Correct account  '});
  assert.deepEqual(corrected, {...base, explanations: base.explanations.map((item, index) => index ? item : {...item, attribution: 'Correct supplier', description: 'Correct account'})});
  assert.deepEqual(frozen, base, 'Correction must not mutate source input');
  assert.equal(run({description: ''}).explanations[0].description, '');
  assert.equal(run({attribution: 'Other supplier'}).explanations[0].description, base.explanations[0].description);
  assert.equal(run({description: 'Other account'}).explanations[0].attribution, base.explanations[0].attribution);
  assert.deepEqual(run({}), base);
  assert.deepEqual(validate(base.source, JSON.parse(JSON.stringify(corrected))), corrected, 'Correction roundtrips through unchanged v1 schema');
  for (const patch of [null, [], {attribution: ''}, {attribution: ' \n '}, {attribution: 3}, {attribution: 'a'.repeat(241)}, {description: 'x'.repeat(1801)}, {description: null}, {description: undefined}, {description: 4}]) {
    assert.throws(() => run(patch), 'Invalid correction must fail');
    assert.deepEqual(frozen, base);
  }
  for (const key of ['id', 'stepId', 'audio', 'source', 'format', '__proto__', Symbol('unexpected')]) {
    const patch = Object.create(null); patch.attribution = 'Looks valid'; patch[key] = 'replacement';
    assert.throws(() => run(patch), 'Identity/media/schema keys must not be accepted');
  }
  assert.deepEqual(run(Object.create({attribution: 'Inherited supplier'})), base, 'Inherited data must not alter authored fields');
  assert.throws(() => update(frozen, frozen.source, 'missing-id', {attribution: 'Other'}));
  assert.equal(run({attribution: 'a'.repeat(240), description: 'd'.repeat(1800)}).explanations[0].description.length, 1800);
  return {checks: 'correction preservation, immutable inputs, v1 roundtrip, omitted/cleared fields, invalid text, forbidden keys, inherited fields, missing ID, boundaries'};
}

test('corrections preserve authored source and retained identity while rejecting invalid changes', () => {
  const initial = createSpokenExplanations(source());
  const notebook = addSpokenExplanation(addSpokenExplanation(initial, note()), note('note-2', 'step-1'));
  verifyCorrectionContract(updateSpokenExplanation, validateSpokenExplanations, notebook);
});

test('correction refuses an independently supplied different original source', () => {
  const original = source(), notebook = addSpokenExplanation(createSpokenExplanations(original), note());
  const other = structuredClone(original); other.steps[0].sensoryCue = 'A changed original account';
  assert.throws(() => updateSpokenExplanation(notebook, other, 'note-1', {description: 'Corrected'}), /different original demonstration/);
});
