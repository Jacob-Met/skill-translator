import { createAuthoredManifest, MAX_CUES, MAX_TEXT_LENGTH, normalizeSha256 } from './core.mjs';

export const MAX_SUBTITLE_BYTES = 2 * 1024 * 1024;

// Only an explicit byte-order mark opts a subtitle file into UTF-16.
// Evidence keeps the original bytes; decoding is shared by preview and restore.
export function decodeSubtitleBytes(input) {
  const bytes = input instanceof Uint8Array ? input
    : input instanceof ArrayBuffer ? new Uint8Array(input) : null;
  if (!bytes) throw new Error("Subtitle bytes must be a Uint8Array or ArrayBuffer");
  if (!bytes.byteLength) throw new Error("Subtitle file is empty");
  if (bytes.byteLength > MAX_SUBTITLE_BYTES) throw new Error("Subtitle file exceeds the 2 MiB limit");
  if (bytes.length >= 4 && (
    (bytes[0] === 0xff && bytes[1] === 0xfe && bytes[2] === 0 && bytes[3] === 0) ||
    (bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 0xfe && bytes[3] === 0xff)
  )) throw new Error("UTF-32 subtitles are not supported; use UTF-8 or BOM-marked UTF-16");
  const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? "utf-16le"
    : bytes[0] === 0xfe && bytes[1] === 0xff ? "utf-16be" : "utf-8";
  try {
    return new TextDecoder(encoding, { fatal: true }).decode(bytes);
  } catch {
    throw new Error("Subtitle contains malformed " + encoding.toUpperCase());
  }
}


function asrProvenance(lines, blockNumber) {
  // This is the exact producer convention in scripts/transcribe_local.py, not a
  // claim that arbitrary third-party subtitle comments identify their media.
  // Reviewed interchange is a plain-text copy, but its declared source digest
  // must still be checked before this viewer can associate it with media.
  if (/^NOTE[ \t]+CAPTIONVERSE reviewed(?:[ \t]|$)/u.test(lines[0])) {
    if (!/^NOTE[ \t]+CAPTIONVERSE reviewed WebVTT export[ \t]*$/u.test(lines[0])) throw new Error(`Subtitle block ${blockNumber} has an unsupported CAPTIONVERSE reviewed note`);
    const sourceLines = lines.slice(1).filter(line => /^[ \t]*Source SHA-256/iu.test(line));
    if (sourceLines.length !== 1) throw new Error(`Subtitle block ${blockNumber} must record exactly one reviewed Source SHA-256`);
    const match = /^[ \t]*Source SHA-256:[ \t]*([a-f0-9]{64})[ \t]*$/iu.exec(sourceLines[0]);
    if (!match) throw new Error(`Subtitle block ${blockNumber} has an invalid reviewed Source SHA-256`);
    return Object.freeze({ kind: 'captionverse-reviewed-vtt', sourceSha256: normalizeSha256(match[1]) });
  }
  if (!/^NOTE[ \t]+CAPTIONVERSE local ASR(?:[ \t]|$)/u.test(lines[0])) return null;
  if (!/^NOTE[ \t]+CAPTIONVERSE local ASR draft[ \t]*$/u.test(lines[0])) throw new Error(`Subtitle block ${blockNumber} has an unsupported CAPTIONVERSE ASR note`);
  const sourceLines = lines.slice(1).filter(line => /^[ \t]*Source SHA-256/iu.test(line));
  if (sourceLines.length !== 1) throw new Error(`Subtitle block ${blockNumber} must record exactly one ASR Source SHA-256`);
  const match = /^[ \t]*Source SHA-256:[ \t]*([a-f0-9]{64})[ \t]*$/iu.exec(sourceLines[0]);
  if (!match) throw new Error(`Subtitle block ${blockNumber} has an invalid ASR Source SHA-256`);
  return Object.freeze({ kind: 'captionverse-local-asr', sourceSha256: normalizeSha256(match[1]) });
}

function timestamp(value, format) {
  const pattern = format === 'srt' ? /^(\d{2,}):([0-5]\d):([0-5]\d),(\d{3})$/u : /^(?:(\d{2,}):)?([0-5]\d):([0-5]\d)\.(\d{3})$/u;
  const match = pattern.exec(value);
  if (!match) throw new Error(`Invalid ${format.toUpperCase()} timestamp: ${value}`);
  const seconds = Number(match[1] || 0) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
  if (!Number.isFinite(seconds) || seconds > Number.MAX_SAFE_INTEGER / 1000) throw new Error('Subtitle timestamp is too large');
  return seconds;
}

function plainText(payload, warnings) {
  const entities = { amp: '&', lt: '<', gt: '>', nbsp: '\u00a0', lrm: '\u200e', rlm: '\u200f', quot: '"', apos: "'" };
  const simplified = payload
    .replace(/<v(?:\.[^\s>]+)*\s+([^>]+)>/gu, (_, voice) => `${voice}: `)
    .replace(/<\/?(?:b|i|u|c|v|lang)(?:[.\s][^>]*)?>/gu, '')
    .replace(/<\/?font(?:\s[^>]*)?>/giu, '')
    .replace(/<(?:\d{2,}:)?[0-5]\d:[0-5]\d\.\d{3}>/gu, '');
  if (simplified !== payload) warnings.add('Subtitle formatting and karaoke timing are simplified to plain text; supplied voice names remain text.');
  return simplified.replace(/&(amp|lt|gt|nbsp|lrm|rlm|quot|apos);/gu, (_, name) => entities[name]).trim();
}

/** Strict, atomic SRT / WebVTT sidecar admission. No inference or automatic media match. */
export function parseSubtitles(source, { mediaDuration } = {}) {
  if (typeof source !== 'string' || new TextEncoder().encode(source).byteLength > MAX_SUBTITLE_BYTES) throw new Error('Subtitle text must be at most 2 MiB');
  // The shared fatal byte decoder rejects invalid encodings. U+FFFD itself is a
  // valid Unicode scalar and can be intentional subtitle text.
  if (source.includes('\u0000')) throw new Error('Subtitle text must not contain NUL characters');
  if (mediaDuration !== undefined && (typeof mediaDuration !== 'number' || !Number.isFinite(mediaDuration) || mediaDuration <= 0)) throw new Error('Subtitle media duration must be a positive finite number of seconds');
  const normalized = source.replace(/^\ufeff/u, '').replace(/\r\n?/gu, '\n').trim();
  if (!normalized) throw new Error('Subtitle file is empty');
  const format = /^WEBVTT(?:[ \t].*)?(?:\n|$)/u.test(normalized) ? 'vtt' : 'srt';
  const blocks = normalized.split(/\n[ \t]*\n+/u);
  const warnings = new Set(), cues = [];
  let provenance = null;
  if (format === 'vtt') {
    const header = blocks.shift();
    if (/X-TIMESTAMP-MAP/iu.test(header)) throw new Error('WebVTT timestamp maps require a stream clock and are not supported for local sidecars');
    if (header.includes('-->')) throw new Error('Invalid WebVTT header');
    if (header.includes('\n')) warnings.add('WebVTT header metadata is not applied.');
  }
  for (const [index, block] of blocks.entries()) {
    const lines = block.split('\n');
    if (format === 'vtt' && /^NOTE(?:[ \t]|$)/u.test(lines[0])) {
      // WebVTT §4.1 forbids --> in comment/style blocks. Rejecting it avoids
      // silently swallowing a cue after an accidentally omitted blank line.
      if (block.includes('-->')) throw new Error(`Subtitle block ${index + 1} has a timing arrow in NOTE; separate comments and cues with a blank line`);
      const recorded = asrProvenance(lines, index + 1);
      if (recorded) {
        if (provenance) throw new Error('Subtitle file contains more than one CAPTIONVERSE ASR or reviewed source note');
        provenance = recorded;
        warnings.add(recorded.kind === 'captionverse-reviewed-vtt'
          ? 'CAPTIONVERSE reviewed WebVTT digest recorded; binding requires the exact video. This does not authenticate authorship or preserve spatial and cue metadata.'
          : 'CAPTIONVERSE ASR source digest recorded; binding requires that exact video. Recognition and timing still require review.');
      }
      continue;
    }
    if (format === 'vtt' && /^(STYLE|REGION)[ \t]*$/u.test(lines[0])) {
      if (block.includes('-->')) throw new Error(`Subtitle block ${index + 1} has a timing arrow in ${lines[0].trim()}; separate metadata and cues with a blank line`);
      if (cues.length) throw new Error(`Subtitle block ${index + 1} has ${lines[0].trim()} after the first cue; WebVTT styles and regions must precede cues`);
      warnings.add('WebVTT styles, regions and cue placement are not applied; captions use the reader area.'); continue;
    }
    if (/X-TIMESTAMP-MAP/iu.test(lines[0])) throw new Error('WebVTT timestamp maps are not supported');
    let timing = lines.shift();
    if (!timing.includes('-->')) {
      if (format === 'srt' && !/^\d+$/u.test(timing.trim())) throw new Error(`Subtitle block ${index + 1} requires a numeric SRT cue identifier`);
      timing = lines.shift() || '';
    }
    const match = /^(\S+)[ \t]+-->[ \t]+(\S+)(?:[ \t]+(.*))?$/u.exec(timing.trim());
    if (!match) throw new Error(`Subtitle block ${index + 1} has an invalid timing line`);
    if (format === 'srt' && match[3]) throw new Error(`SRT block ${index + 1} has unsupported timing metadata`);
    if (match[3]) warnings.add('WebVTT styles, regions and cue placement are not applied; captions use the reader area.');
    const start = timestamp(match[1], format), end = timestamp(match[2], format);
    if (end <= start) throw new Error(`Subtitle block ${index + 1} must end after it starts`);
    if (Number.isFinite(mediaDuration) && end > mediaDuration) throw new Error(`Subtitle block ${index + 1} ends after the selected video`);
    const payload = lines.join('\n');
    if (payload.includes('-->')) throw new Error(`Subtitle block ${index + 1} is missing a blank separator or contains an unsupported arrow`);
    const text = plainText(payload, warnings);
    if (!text || text.length > MAX_TEXT_LENGTH) throw new Error(`Subtitle block ${index + 1} must contain 1–${MAX_TEXT_LENGTH} text characters`);
    cues.push(Object.freeze({ id: `subtitle-${cues.length + 1}`, kind: 'dialogue', start, end, label: 'Subtitle (unattributed)', text, anchor: null }));
    if (cues.length > MAX_CUES) throw new Error(`Subtitle file exceeds ${MAX_CUES} cues`);
  }
  if (cues.length === 0) throw new Error('No subtitle cues found');
  return Object.freeze({ format, cues: Object.freeze(cues), warnings: Object.freeze([...warnings]), provenance });
}

export function bindSubtitles(parsed, { sourceId, sha256, mediaDuration }) {
  const selectedSha256 = normalizeSha256(sha256);
  if (typeof mediaDuration !== 'number' || !Number.isFinite(mediaDuration) || mediaDuration <= 0) throw new Error('Binding subtitles requires a positive finite video duration');
  if (parsed.provenance !== null && parsed.provenance !== undefined) {
    if (!['captionverse-local-asr', 'captionverse-reviewed-vtt'].includes(parsed.provenance.kind)) throw new Error('Unsupported subtitle source provenance');
    if (normalizeSha256(parsed.provenance.sourceSha256) !== selectedSha256) {
      if (parsed.provenance.kind === 'captionverse-reviewed-vtt') throw new Error('Reviewed WebVTT source digest does not match the selected video; select the exact original media');
      throw new Error('ASR source digest does not match the selected video; select the exact video used to produce this draft');
    }
  }
  return createAuthoredManifest({ sourceId, sha256, cues: parsed.cues }, { mediaDuration });
}
