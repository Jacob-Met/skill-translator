import { createCueLookup } from "./cue-index.mjs";
const acceptedCueLookups = new WeakMap();
import { validateWordTiming, wordTimingDocument } from "./word-timing.mjs";
import { validateSoundMotion, soundMotionDocument } from "./sound-motion.mjs";
export const MANIFEST_FORMAT = "captionverse-authored-cues/v1";
export const MAX_CUES = 10_000;
export const MAX_TEXT_LENGTH = 2_000;

export function createEpoch() {
  let current = 0;
  return Object.freeze({
    next: () => ++current,
    retire: () => ++current,
    isCurrent: (token) => token === current
  });
}

function fail(message) { throw new Error(message); }
function text(value, field, max = MAX_TEXT_LENGTH) {
  if (typeof value !== "string" || value.trim() === "") fail(`${field} must be non-empty text`);
  if (value.length > max) fail(`${field} is too long`);
  return value;
}
function finite(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(`${field} must be a finite number`);
  return value;
}
export function normalizeSha256(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) fail("media.sha256 must be a 64-character SHA-256 hex digest");
  return value.toLowerCase();
}

export function validateManifest(input, { mediaSha256, mediaDuration } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("manifest must be an object");
  if (input.format !== MANIFEST_FORMAT) fail(`format must be ${MANIFEST_FORMAT}`);
  if (!input.media || typeof input.media !== "object") fail("media is required");
  const sourceId = text(input.media.sourceId, "media.sourceId", 200);
  const sha256 = normalizeSha256(input.media.sha256);
  if (mediaSha256 && normalizeSha256(mediaSha256) !== sha256) fail("manifest media digest does not match the selected video");
  if (input.timeBase?.unit !== "seconds" || input.timeBase?.origin !== "media-start") fail("timeBase must use seconds from media-start");
  if (input.timeBase.interval !== undefined && input.timeBase.interval !== "[start,end)") fail("timeBase.interval must be [start,end)");
  if (!Array.isArray(input.cues)) fail("cues must be an array");
  if (input.cues.length > MAX_CUES) fail(`cues exceeds ${MAX_CUES}`);
  const ids = new Set();
  const cues = input.cues.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail(`cues[${index}] must be an object`);
    const prefix = `cues[${index}]`;
    const id = text(raw.id, `${prefix}.id`, 200);
    if (ids.has(id)) fail(`${prefix}.id is duplicated`);
    ids.add(id);
    if (raw.kind !== "dialogue" && raw.kind !== "sound") fail(`${prefix}.kind is unsupported`);
    const start = finite(raw.start, `${prefix}.start`);
    const end = finite(raw.end, `${prefix}.end`);
    if (start < 0 || end <= start) fail(`${prefix} must use a non-negative [start, end) interval`);
    if (Number.isFinite(mediaDuration) && end > mediaDuration) fail(`${prefix}.end exceeds the selected video's duration`);
    const cueText = text(raw.text, `${prefix}.text`);
    const label = text(raw.label, `${prefix}.label`, 200);
    let anchor = null;
    if (raw.anchor !== null && raw.anchor !== undefined) {
      if (!raw.anchor || typeof raw.anchor !== "object") fail(`${prefix}.anchor must be an object or null`);
      const x = finite(raw.anchor.x, `${prefix}.anchor.x`);
      const y = finite(raw.anchor.y, `${prefix}.anchor.y`);
      if (x < 0 || x > 1 || y < 0 || y > 1) fail(`${prefix}.anchor coordinates must be between 0 and 1`);
      anchor = Object.freeze({ x, y });
    }
    const confidence = raw.confidence === undefined || raw.confidence === null ? null : finite(raw.confidence, `${prefix}.confidence`);
    if (confidence !== null && (confidence < 0 || confidence > 1)) fail(`${prefix}.confidence must be between 0 and 1`);
    // Optional visual grounding from scripts/visual_ground.py: the face box the caption is anchored under.
    let face = null;
    if (raw.face !== null && raw.face !== undefined) {
      if (!anchor || !raw.face || typeof raw.face !== "object" || !Array.isArray(raw.face.box) || raw.face.box.length !== 4) fail(`${prefix}.face must be an object with a four-number box and needs an anchor`);
      const box = raw.face.box.map((v, i) => finite(v, `${prefix}.face.box[${i}]`));
      if (box.some((v) => v < 0 || v > 1)) fail(`${prefix}.face.box values must be between 0 and 1`);
      face = Object.freeze({ box: Object.freeze(box), score: raw.face.score == null ? null : finite(raw.face.score, `${prefix}.face.score`) });
    }
    // Optional loudness from scripts/voice_level.py (whole-mix level in the cue window).
    let voice = null;
    if (raw.voice !== null && raw.voice !== undefined) {
      if (!raw.voice || typeof raw.voice !== "object" || !["shout", "normal", "quiet"].includes(raw.voice.level)) fail(`${prefix}.voice.level must be shout, normal or quiet`);
      voice = Object.freeze({ level: raw.voice.level, relDb: raw.voice.relDb == null ? null : finite(raw.voice.relDb, `${prefix}.voice.relDb`) });
    }
    const wordTiming = raw.wordTiming == null ? null : validateWordTiming(raw.wordTiming,
      { kind: raw.kind, start, end, text: cueText }, `${prefix}.wordTiming`);
    const soundMotion = raw.soundMotion == null ? null : validateSoundMotion(raw.soundMotion,
      { kind: raw.kind, anchor }, `${prefix}.soundMotion`);
    return Object.freeze({ id, kind: raw.kind, start, end, text: cueText, label, anchor, confidence, ...(face ? { face } : {}), ...(voice ? { voice } : {}), ...(wordTiming ? { wordTiming } : {}), ...(soundMotion ? { soundMotion } : {}) });
  });
  // Only this validator can register an immutable track. Merely freezing an
  // arbitrary caller's array does not make its interval objects immutable.
  Object.freeze(cues);
  if (cues.length >= 64) acceptedCueLookups.set(cues, null);
  return Object.freeze({
    format: MANIFEST_FORMAT,
    media: Object.freeze({ sourceId, sha256 }),
    timeBase: Object.freeze({ unit: "seconds", origin: "media-start", interval: "[start,end)" }),
    cues: Object.freeze(cues)
  });
}

export function createAuthoredManifest({ sourceId, sha256, cues }, { mediaDuration } = {}) {
  return validateManifest({
    format: MANIFEST_FORMAT,
    media: { sourceId, sha256 },
    timeBase: { unit: "seconds", origin: "media-start", interval: "[start,end)" },
    cues
  }, { mediaSha256: sha256, mediaDuration });
}

export function manifestDocument(manifest) {
  const admitted = validateManifest(manifest, { mediaSha256: manifest?.media?.sha256 });
  return {
    format: admitted.format,
    media: { sourceId: admitted.media.sourceId, sha256: admitted.media.sha256 },
    timeBase: { unit: "seconds", origin: "media-start", interval: "[start,end)" },
    cues: admitted.cues.map((cue) => ({
      id: cue.id,
      kind: cue.kind,
      start: cue.start,
      end: cue.end,
      label: cue.label,
      text: cue.text,
      anchor: cue.anchor ? { x: cue.anchor.x, y: cue.anchor.y } : null,
      ...(cue.confidence === null ? {} : { confidence: cue.confidence }),
      ...(cue.face ? { face: { box: [...cue.face.box], ...(cue.face.score === null ? {} : { score: cue.face.score }) } } : {}),
      ...(cue.voice ? { voice: { level: cue.voice.level, ...(cue.voice.relDb === null ? {} : { relDb: cue.voice.relDb }) } } : {}),
      ...(cue.wordTiming ? { wordTiming: wordTimingDocument(cue.wordTiming) } : {}),
      ...(cue.soundMotion ? { soundMotion: soundMotionDocument(cue.soundMotion) } : {})
    }))
  };
}

export function serializeManifest(manifest) {
  return `${JSON.stringify(manifestDocument(manifest), null, 2)}\n`;
}



// Advisory review hints, never admission criteria. Rates count Unicode grapheme
// clusters (including spacing); they are not language-neutral accessibility scores.
// The ordered sweep detects every half-open dialogue overlap in O(n log n)
// without constructing a quadratic pair list for large imported subtitle files.
export function inspectReadingLoad(cues, { fastRate = 20 } = {}) {
  if (!Array.isArray(cues)) throw new TypeError("cues must be an array");
  if (!Number.isFinite(fastRate) || fastRate <= 0) throw new RangeError("fastRate must be positive and finite");
  const segmenter = typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  const ordered = cues.filter(cue => cue?.kind === "dialogue"
    && typeof cue.id === "string" && typeof cue.text === "string"
    && Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.end > cue.start)
    .slice().sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id));
  const flagged = new Map();
  const record = (cue, key, value = true) => {
    const existing = flagged.get(cue.id) ?? { cueId: cue.id, start: cue.start, rate: null, overlap: false };
    existing[key] = value;
    flagged.set(cue.id, existing);
  };
  for (const cue of ordered) {
    const displayText = cue.text.replace(/\s+/gu, " ").trim();
    const count = segmenter ? [...segmenter.segment(displayText)].length : [...displayText].length;
    const rate = count / (cue.end - cue.start);
    if (rate > fastRate) record(cue, "rate", Math.round(rate * 10) / 10);
  }
  let greatestEnd = -Infinity;
  for (let i = 0; i < ordered.length; i++) {
    const cue = ordered[i];
    if (greatestEnd > cue.start || (i + 1 < ordered.length && ordered[i + 1].start < cue.end))
      record(cue, "overlap", true);
    greatestEnd = Math.max(greatestEnd, cue.end);
  }
  return ordered.filter(cue => flagged.has(cue.id)).map(cue => Object.freeze(flagged.get(cue.id)));
}

export function activeCues(cues, currentTime) {
  if (!Number.isFinite(currentTime)) return [];
  if (acceptedCueLookups.has(cues)) {
    let lookup = acceptedCueLookups.get(cues);
    if (!lookup) { lookup = createCueLookup(cues); acceptedCueLookups.set(cues, lookup); }
    return lookup(currentTime);
  }
  return cues.filter((cue) => cue.start <= currentTime && currentTime < cue.end);
}
// A quoted sequence is an exact contiguous sequence in the accepted cue
// text, never a fabricated quote crossing speaker labels or kind metadata.
function phraseWords(value) {
  return (String(value).toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).join(" ");
}
function parseQuotedQuery(query) {
  const value = String(query);
  const outside = [], phrases = [];
  let cursor = 0, opened = null;
  for (const quote of value.matchAll(/["“”]/gu)) {
    if (opened === null) {
      outside.push(value.slice(cursor, quote.index));
      opened = quote.index + quote[0].length;
    } else {
      const phrase = phraseWords(value.slice(opened, quote.index));
      if (!phrase) return null; // empty quote must not broaden into a loose search
      phrases.push(phrase);
      cursor = quote.index + quote[0].length;
      opened = null;
    }
  }
  if (opened !== null) return null; // unclosed quotation is not a fuzzy query
  outside.push(value.slice(cursor));
  // Unquoted search is all-term retrieval, not punctuation-literal matching.
  // Preserve Unicode symbols (including emoji); a deliberately quoted phrase
  // still goes through the stricter source-text-only contiguous matcher.
  const terms = outside.join(" ").toLocaleLowerCase().split(/[\s\p{P}]+/u).filter(Boolean);
  return { terms, phrases };
}
function matchesSourcePhrases(cue, phrases) {
  if (!phrases.length) return true;
  const sourceText = " " + phraseWords(cue.text) + " ";
  return phrases.every(phrase => sourceText.includes(" " + phrase + " "));
}
export function searchCues(cues, query) {
  const parsed = parseQuotedQuery(query);
  if (!parsed || (!parsed.terms.length && !parsed.phrases.length)) return [];
  return cues.filter(cue => {
    const haystack = (cue.label + " " + cue.text + " " + cue.kind).toLocaleLowerCase();
    return parsed.terms.every(term => haystack.includes(term)) && matchesSourcePhrases(cue, parsed.phrases);
  });
}
export function formatSourceTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const totalMilliseconds = Math.round(safe * 1_000);
  const minutes = Math.floor(totalMilliseconds / 60_000);
  const remainderSeconds = (totalMilliseconds - minutes * 60_000) / 1_000;
  return `${minutes}:${remainderSeconds.toFixed(3).padStart(6, "0")}`;
}

// Extractive question answering over the bound cue record. A question such as
// "when did the dog bark?" is reduced to content terms, lightly stemmed, and
// matched against cue text, label and kind with inverse-cue-frequency weights.
// The answer is always a literal cue quoted with its source time; nothing is
// generated.
const STOPWORDS = new Set("a an and are at be been but by can did do does for from had has have he her his how i in is it its me my of on or said say says she so that the their them there they this to was we were what when where which who why will with you your about after before".split(" "));
function stem(word) { return word.replace(/(ing|ed|es|s)$/u, "").replace(/(.)\1$/u, "$1"); }
export function questionTerms(question) {
  return [...new Set(String(question).toLocaleLowerCase().split(/[^\p{L}\p{N}']+/u).map((t) => t.replace(/'/gu, "")).filter((t) => t && !STOPWORDS.has(t)).map(stem).filter((t) => t.length > 1))];
}
// Speaker-attribution requests are source-typed. An audio-event hypothesis can
// quote a word or carry a misleading "Speaker" label, but cannot identify who
// said it. Avoid classifying all "who" questions as dialogue: "Who heard it?"
// and environmental-sound questions still need ordinary source retrieval.
function asksForSpeechSource(question) {
  return /^(?:who\s+(?:said|says|spoke|speaks|mentioned|mentions|uttered|was\s+speaking|is\s+speaking)|which\s+(?:speaker|person|voice)\s+(?:said|says|spoke|speaks|mentioned|mentions|uttered|was\s+speaking|is\s+speaking)|who['’]s\s+speaking)\b/iu.test(String(question).trim());
}
export function answerQuestion(cues, question, { limit = 3 } = {}) {
  const parsed = parseQuotedQuery(question);
  if (!parsed) return [];
  const terms = questionTerms(question);
  if (terms.length === 0 && parsed.phrases.length === 0) return [];
  const speechSource = asksForSpeechSource(question);
  const admitted = cues.filter(cue => (!speechSource || cue.kind === "dialogue") && matchesSourcePhrases(cue, parsed.phrases));
  const docs = admitted.map(cue => new Set((cue.label + " " + cue.text + " " + cue.kind).toLocaleLowerCase()
    .split(/[^\p{L}\p{N}']+/u).map(t => stem(t.replace(/'/gu, ""))).filter(Boolean)));
  const idf = Object.fromEntries(terms.map(term => [term, Math.log(1 + admitted.length / (1 + docs.filter(d => d.has(term)).length))]));
  return admitted.map((cue, index) => ({ cue, matched: terms.filter(term => docs[index].has(term)) }))
    .map(hit => ({ ...hit, score: hit.matched.reduce((sum, term) => sum + idf[term], parsed.phrases.length) }))
    .filter(hit => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.cue.start - b.cue.start)
    .slice(0, limit);
}
