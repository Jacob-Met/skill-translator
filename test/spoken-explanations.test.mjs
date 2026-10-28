import test from 'node:test';
import assert from 'node:assert/strict';
import {createSequence, appendMoment, upsertStep} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';
import {createSpokenExplanations, validateSpokenExplanations, addSpokenExplanation,
  removeSpokenExplanation, audioIdentity, sameAudio, MAX_AUDIO_BYTES} from '../src/spoken-explanations.mjs';

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

test('retains separate attributed accounts and every original source field without mutation', () => {
  const original = source(), originalJSON = JSON.stringify(original), empty = createSpokenExplanations(original), emptyJSON = JSON.stringify(empty);
  const first = addSpokenExplanation(empty, note());
  const both = addSpokenExplanation(first, {...note('note-2', 'step-1', audio('c')), attribution: '<v Expert> supplied text', description: '<script>literal text</script>'});
  assert.equal(JSON.stringify(original), originalJSON);
  assert.equal(JSON.stringify(empty), emptyJSON);
  assert.equal(first.explanations.length, 1);
  assert.equal(both.explanations.length, 2);
  assert.deepEqual(both.source, original);
  assert.equal(both.explanations[1].attribution, '<v Expert> supplied text');
  assert.equal(both.explanations[1].description, '<script>literal text</script>');
  assert.deepEqual(validateSpokenExplanations(original, JSON.parse(JSON.stringify(both))), both);
});

test('source binding includes the original account, moment context and demonstrated step', () => {
  const original = source(), notebook = addSpokenExplanation(createSpokenExplanations(original), note());
  for (const change of [s => { s.title += ' revised'; }, s => { s.context += ' revised'; },
    s => { s.steps[0].sensoryCue = 'A different account'; }, s => { s.steps[0].title = 'Different stage'; },
    s => { s.moments[1].visibleState = 'Different observed state'; }]) {
    const changed = structuredClone(original); change(changed);
    assert.throws(() => validateSpokenExplanations(changed, notebook), /different original demonstration/);
  }
  assert.throws(() => addSpokenExplanation(notebook, note('note-2', 'foreign-step')), /original demonstrated step/);
  assert.deepEqual(notebook.source, original);
});

test('distinct audio budget has exact boundaries and shared recordings are counted once', () => {
  const initial = createSpokenExplanations(source());
  const first = addSpokenExplanation(initial, note('note-1', 'step-0', audio('b', MAX_AUDIO_BYTES)));
  const full = addSpokenExplanation(first, note('note-2', 'step-1', audio('c', MAX_AUDIO_BYTES)));
  const shared = addSpokenExplanation(full, note('note-3', 'step-1', {...audio('b', MAX_AUDIO_BYTES), name: 'renamed-identical.wav'}));
  assert.equal(shared.explanations.length, 3);
  assert.throws(() => addSpokenExplanation(full, note('note-3', 'step-1', audio('d', 1))), /8 MiB/);
  assert.throws(() => addSpokenExplanation(first, note('note-2', 'step-1', audio('b', MAX_AUDIO_BYTES - 1))), /conflicting/);
  assert.equal(first.explanations.length, 1);
});

test('requires explicit attribution, supported bounded media and unique source-linked identities', () => {
  const initial = createSpokenExplanations(source()), populated = addSpokenExplanation(initial, note());
  for (const patch of [{attribution: ''}, {attribution: 'x'.repeat(241)}, {description: 'x'.repeat(1801)}, {id: '../note'}, {stepId: ''}]) {
    assert.throws(() => addSpokenExplanation(initial, {...note(), ...patch}));
  }
  assert.throws(() => addSpokenExplanation(populated, note()), /unique/);
  for (const patch of [{sizeBytes: 0}, {sizeBytes: 1.5}, {sizeBytes: MAX_AUDIO_BYTES + 1}, {sha256: 'bad'}, {mimeType: 'text/html'}, {name: ''}]) {
    assert.throws(() => audioIdentity({...audio(), ...patch}));
  }
  assert.equal(sameAudio(audio(), {...audio(), name: 'renamed.wav'}), true);
  assert.equal(sameAudio(audio(), audio('c')), false);
});

test('notebook capacity and removal preserve the complete original demonstration', () => {
  const original = source(); let notebook = createSpokenExplanations(original);
  for (let index = 0; index < 12; index++) notebook = addSpokenExplanation(notebook, note('note-' + index, 'step-' + index % 2));
  const frozen = JSON.stringify(notebook);
  assert.throws(() => addSpokenExplanation(notebook, note('note-13')), /12 spoken/);
  const removed = removeSpokenExplanation(notebook, 'note-4');
  assert.equal(removed.explanations.length, 11);
  assert.equal(removed.explanations.some(value => value.id === 'note-4'), false);
  assert.deepEqual(removed.source, original);
  assert.equal(JSON.stringify(notebook), frozen);
  assert.throws(() => removeSpokenExplanation(notebook, 'not-retained'), /retained explanation/);
});

test('derived verification fields cannot replace raw source or media admission', () => {
  const original = source(), notebook = addSpokenExplanation(createSpokenExplanations(original), note());
  const forged = {...structuredClone(notebook), verified: true, expertAuthenticated: true};
  forged.explanations[0].transcriptVerified = true;
  assert.deepEqual(validateSpokenExplanations(original, forged), notebook);
  forged.explanations[0].audio.sha256 = 'claimed';
  assert.throws(() => validateSpokenExplanations(original, forged), /SHA-256/);
  assert.throws(() => validateSpokenExplanations(original, {...notebook, format: 'future-version'}), /supported/);
});
