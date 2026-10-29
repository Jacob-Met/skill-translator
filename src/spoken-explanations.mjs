// Separately supplied explanations stay beside the original demonstration.
// Their association and attribution are authored accounts, not observations.
import {validateSequence} from './demonstration-sequence.mjs';

export const SPOKEN_FORMAT = 'skill-translator.spoken-explanations/v1';
export const MAX_EXPLANATIONS = 12;
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
export const MAX_TOTAL_AUDIO_BYTES = 8 * 1024 * 1024;
export const MAX_AUDIO_SECONDS = 300;
export const AUDIO_TYPES = Object.freeze(['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/webm', 'audio/mp4']);

function record(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`${label} is missing.`);
  return value;
}

function text(value, label, limit, required = false) {
  if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) {
    throw Error(`${label} must ${required ? 'contain text and ' : ''}fit within ${limit} characters.`);
  }
  return value.trim();
}

function identifier(value, label) {
  if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value)) {
    throw Error(`${label} needs a stable short identifier.`);
  }
  return value;
}

export function audioIdentity(value) {
  record(value, 'Explanation audio');
  if (typeof value.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.sha256)) throw Error('Explanation audio needs its complete SHA-256 identity.');
  if (!AUDIO_TYPES.includes(value.mimeType)) throw Error('Choose supported WAV, MP3, Ogg, WebM or M4A audio.');
  if (!Number.isSafeInteger(value.sizeBytes) || value.sizeBytes < 1 || value.sizeBytes > MAX_AUDIO_BYTES) throw Error('Each explanation audio file must fit within 4 MiB.');
  return {sha256: value.sha256, mimeType: value.mimeType, sizeBytes: value.sizeBytes,
    name: text(value.name, 'Audio file name', 240, true)};
}

export function sameAudio(expected, actual) {
  const left = audioIdentity(expected), right = audioIdentity(actual);
  return ['sha256', 'mimeType', 'sizeBytes'].every(key => left[key] === right[key]);
}

export function validateSpokenExplanations(source, value) {
  const sequence = validateSequence(source);
  record(value, 'Spoken explanation notebook');
  if (value.format !== SPOKEN_FORMAT) throw Error('Choose a supported spoken explanation notebook.');
  const retained = validateSequence(value.source);
  if (JSON.stringify(sequence) !== JSON.stringify(retained)) throw Error('The explanation notebook belongs to a different original demonstration.');
  if (!Array.isArray(value.explanations) || value.explanations.length > MAX_EXPLANATIONS) throw Error('Retain at most 12 spoken explanations.');
  const steps = new Set(sequence.steps.map(step => step.id)), ids = new Set(), audio = new Map();
  let total = 0;
  const explanations = value.explanations.map(input => {
    record(input, 'Spoken explanation');
    const id = identifier(input.id, 'Explanation'), stepId = identifier(input.stepId, 'Original step');
    if (ids.has(id)) throw Error('Explanation identifiers must be unique.');
    if (!steps.has(stepId)) throw Error('Every explanation must explicitly name an original demonstrated step.');
    ids.add(id);
    const media = audioIdentity(input.audio), previous = audio.get(media.sha256);
    if (previous && !sameAudio(previous, media)) throw Error('One audio identity cannot have conflicting retained metadata.');
    if (!previous) { audio.set(media.sha256, media); total += media.sizeBytes; }
    if (total > MAX_TOTAL_AUDIO_BYTES) throw Error('The complete notebook must fit within 8 MiB of distinct audio files.');
    return {id, stepId, attribution: text(input.attribution, 'Who supplied this explanation', 240, true),
      description: text(input.description ?? '', 'Written description', 1800), audio: media};
  });
  return {format: SPOKEN_FORMAT, source: sequence, explanations};
}

export function createSpokenExplanations(source) {
  const sequence = validateSequence(source);
  return validateSpokenExplanations(sequence, {format: SPOKEN_FORMAT, source: sequence, explanations: []});
}

export function addSpokenExplanation(notebook, explanation) {
  const current = validateSpokenExplanations(notebook.source, notebook);
  return validateSpokenExplanations(current.source, {...current, explanations: [...current.explanations, explanation]});
}

export function updateSpokenExplanation(value, source, id, patch) {
  const current = validateSpokenExplanations(source, value);
  if (!current.explanations.some(explanation => explanation.id === id)) throw Error('Choose a retained explanation to correct.');
  record(patch, 'Explanation correction');
  const changes = {};
  for (const key of Reflect.ownKeys(patch)) {
    if (key === 'attribution') changes.attribution = text(patch[key], 'Who supplied this explanation', 240, true);
    else if (key === 'description') changes.description = text(patch[key], 'Written description', 1800);
    else throw Error('Only attribution and written description can be corrected.');
  }
  // An empty correction is a validated no-op; omitted fields keep their current values.
  return validateSpokenExplanations(current.source, {...current, explanations: current.explanations.map(
    explanation => explanation.id === id ? {...explanation, ...changes} : explanation)});
}

export function removeSpokenExplanation(notebook, id) {
  const current = validateSpokenExplanations(notebook.source, notebook);
  if (!current.explanations.some(explanation => explanation.id === id)) throw Error('Choose a retained explanation to remove.');
  return validateSpokenExplanations(current.source, {...current, explanations: current.explanations.filter(explanation => explanation.id !== id)});
}


