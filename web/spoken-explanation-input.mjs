import {inspectDecodedAudio} from './audio-decoded-duration.mjs';
import {audioIdentity, sameAudio, validateSpokenExplanations,
  MAX_AUDIO_BYTES, MAX_AUDIO_SECONDS, MAX_EXPLANATIONS} from '/src/spoken-explanations.mjs';
import {readSequenceBundle, makeSequenceBundle, releaseSequenceAssets} from '/web/sequence-input.mjs';

export const SPOKEN_BUNDLE_FORMAT = 'skill-translator.spoken-explanation-bundle/v1';
export const MAX_SPOKEN_BUNDLE_BYTES = 64 * 1024 * 1024;

function current(signal) {
  if (signal?.aborted) throw Error('The explanation operation was replaced.');
}

function mediaType(bytes) {
  const is = (offset, text) => [...text].every((value, index) => bytes[offset + index] === value.charCodeAt(0));
  if (is(0, 'RIFF') && is(8, 'WAVE')) return 'audio/wav';
  if (is(0, 'ID3') || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return 'audio/mpeg';
  if (is(0, 'OggS')) return 'audio/ogg';
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return 'audio/webm';
  if (is(4, 'ftyp')) return 'audio/mp4';
  throw Error('Choose a supported WAV, MP3, Ogg, WebM or M4A file. Its contents must match a supported container.');
}

async function sha256(bytes, signal) {
  current(signal);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  current(signal);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

function base64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 16384) binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
  return btoa(binary);
}

function decoded(value) {
  if (typeof value !== 'string' || !value.length || value.length > Math.ceil(MAX_AUDIO_BYTES / 3) * 4 ||
      value.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw Error('Retained audio has invalid or oversized encoded bytes.');
  const binary = atob(value);
  if (binary.length > MAX_AUDIO_BYTES) throw Error('A retained audio file exceeds 4 MiB.');
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function inspectMedia(url, signal) {
  current(signal);
  return new Promise((resolve, reject) => {
    const player = document.createElement('audio');
    player.preload = 'auto';
    let timer, settled = false;
    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', aborted);
      player.removeEventListener('loadeddata', loaded);
      player.removeEventListener('error', failed);
      const durationSeconds = player.duration;
      player.pause(); player.removeAttribute('src'); player.load();
      if (error) reject(error); else resolve(durationSeconds);
    }
    function aborted() { finish(Error('The audio selection was replaced.')); }
    function failed() { finish(Error('This browser cannot decode the supplied audio file.')); }
    function loaded() {
      if (!Number.isFinite(player.duration)) {
        const error = Error('Audio duration metadata is unavailable.'); error.code = 'unknown-duration'; finish(error);
      } else if (player.duration <= 0 || player.duration > MAX_AUDIO_SECONDS) {
        finish(Error('Choose audio with a known duration of at most five minutes.'));
      } else finish();
    }
    player.addEventListener('loadeddata', loaded);
    player.addEventListener('error', failed);
    signal?.addEventListener('abort', aborted, {once: true});
    timer = setTimeout(() => finish(Error('Audio decoding did not complete. The accepted notebook is unchanged.')), 15000);
    player.src = url; player.load();
  });
}

export function releaseExplanationAudio(asset) {
  if (asset?.url) URL.revokeObjectURL(asset.url);
}

export function releaseExplanationAssets(assets) {
  for (const asset of assets.values()) releaseExplanationAudio(asset);
}

export async function loadExplanationAudio(file, {signal} = {}) {
  current(signal);
  if (!file || file.size < 1 || file.size > MAX_AUDIO_BYTES) throw Error('Choose an audio file up to 4 MiB.');
  const bytes = new Uint8Array(await file.arrayBuffer()); current(signal);
  if (bytes.length !== file.size || bytes.length > MAX_AUDIO_BYTES) throw Error('The audio byte length changed while opening.');
  const identity = audioIdentity({sha256: await sha256(bytes, signal), mimeType: mediaType(bytes), sizeBytes: bytes.length, name: file.name});
  const retained = new File([bytes], identity.name, {type: identity.mimeType});
  const url = URL.createObjectURL(retained);
  try {
    let durationSeconds;
    try { durationSeconds = await inspectMedia(url, signal); }
    catch (error) {
      if (error.code !== 'unknown-duration') throw error;
      ({durationSeconds} = await inspectDecodedAudio(retained, {signal}));
      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > MAX_AUDIO_SECONDS) throw Error('Choose audio with a known decoded duration of at most five minutes.');
    }
    current(signal);
    return {file: retained, identity, durationSeconds, url};
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}

function requiredAudio(notebook) {
  return new Map(notebook.explanations.map(explanation => [explanation.audio.sha256, explanation.audio]));
}

export async function makeSpokenExplanationBundle(input, sourceAssets, audioAssets, {signal} = {}) {
  const notebook = validateSpokenExplanations(input.source, input);
  const sourceBlob = await makeSequenceBundle(notebook.source, sourceAssets, {signal}); current(signal);
  const sourceBundle = JSON.parse(await sourceBlob.text()); current(signal);
  const recordings = [];
  for (const [hash, expected] of requiredAudio(notebook)) {
    const asset = audioAssets.get(hash);
    if (!asset?.file) throw Error('A retained explanation needs its complete original audio bytes.');
    const bytes = new Uint8Array(await asset.file.arrayBuffer()); current(signal);
    const observed = {sha256: await sha256(bytes, signal), mimeType: mediaType(bytes), sizeBytes: bytes.length, name: expected.name};
    if (!sameAudio(expected, observed)) throw Error('Retained audio no longer matches its original identity.');
    recordings.push({sha256: hash, dataBase64: base64(bytes)});
  }
  const blob = new Blob([JSON.stringify({format: SPOKEN_BUNDLE_FORMAT, sourceBundle, notebook, recordings})], {type: 'application/json'});
  if (blob.size > MAX_SPOKEN_BUNDLE_BYTES) throw Error('The complete explanation notebook exceeds its 64 MiB reopen limit.');
  current(signal);
  return blob;
}

export async function readSpokenExplanationBundle(file, {signal} = {}) {
  current(signal);
  if (!file || file.size < 1 || file.size > MAX_SPOKEN_BUNDLE_BYTES) throw Error('Choose a complete explanation notebook up to 64 MiB.');
  const raw = await file.arrayBuffer(); current(signal);
  if (raw.byteLength !== file.size) throw Error('The notebook byte length changed while opening.');
  const value = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(raw));
  if (value?.format !== SPOKEN_BUNDLE_FORMAT) throw Error('Choose a complete spoken explanation notebook.');
  const notebook = validateSpokenExplanations(value.sourceBundle?.sequence, value.notebook);
  const needed = requiredAudio(notebook);
  if (!Array.isArray(value.recordings) || value.recordings.length !== needed.size || value.recordings.length > MAX_EXPLANATIONS) throw Error('Every distinct explanation needs exactly one complete audio recording.');
  const retained = new Map();
  for (const recording of value.recordings) {
    if (!recording || !needed.has(recording.sha256) || retained.has(recording.sha256)) throw Error('Retained audio identities must match the notebook exactly.');
    retained.set(recording.sha256, recording.dataBase64);
  }
  let accepted = null;
  const audioAssets = new Map();
  try {
    const sequenceFile = new File([JSON.stringify(value.sourceBundle)], 'original-demonstration.json', {type: 'application/json'});
    accepted = await readSequenceBundle(sequenceFile, {signal}); current(signal);
    for (const [hash, expected] of needed) {
      const bytes = decoded(retained.get(hash)); current(signal);
      if (bytes.length !== expected.sizeBytes) throw Error('Retained audio has a different original byte length.');
      const asset = await loadExplanationAudio(new File([bytes], expected.name, {type: expected.mimeType}), {signal});
      audioAssets.set(hash, asset);
      if (!sameAudio(expected, asset.identity)) throw Error('Retained audio does not match its complete original identity.');
    }
    current(signal);
    return {accepted, notebook, audioAssets};
  } catch (error) {
    if (accepted) releaseSequenceAssets(accepted.assets);
    releaseExplanationAssets(audioAssets);
    throw error;
  }
}
