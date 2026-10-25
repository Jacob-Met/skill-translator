export const MAX_TIMED_WORDS = 512;
export const WORD_TIMING_CORRECTION_FORMAT = "captionverse.word-timing-correction/v1";
const bases = new Set(["conditional-alignment", "recognizer-estimate"]);
const digest = value => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);

function validateWords(raw, cue, field) {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_TIMED_WORDS)
    throw new Error(`${field} must contain 1–${MAX_TIMED_WORDS} supplied words`);
  let previousStart = cue.start, previousEnd = cue.start;
  const words = raw.map((word, index) => {
    const name = `${field}[${index}]`;
    if (!word || typeof word !== "object" || Array.isArray(word) ||
        typeof word.text !== "string" || !word.text.trim() || word.text.length > 2000)
      throw new Error(`${name}.text must contain literal word text`);
    const { start, end } = word;
    if (typeof start !== "number" || typeof end !== "number" ||
        !Number.isFinite(start) || !Number.isFinite(end) || end <= start ||
        start < cue.start || end > cue.end || start < previousStart || end < previousEnd)
      throw new Error(`${name} must use ordered positive [start,end) times within its cue`);
    previousStart = start; previousEnd = end;
    return Object.freeze({ text: word.text, start, end });
  });
  if (words.map(word => word.text).join("") !== cue.text)
    throw new Error(`${field} word text must exactly reproduce the complete cue text`);
  return Object.freeze(words);
}

// These are supplied estimates, optionally corrected by an author, not verified
// speech, stress or identity. Original literal segmentation is never inferred.
export function validateWordTiming(raw, cue, field = "wordTiming") {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !bases.has(raw.basis))
    throw new Error(`${field}.basis must identify supplied alignment or recognizer estimates`);
  if (cue.kind !== "dialogue") throw new Error(`${field} is only supported for dialogue`);
  if (!digest(raw.artifactSha256) || !digest(raw.receiptSha256))
    throw new Error(`${field} requires SHA-256 digests of its supplied artifact and receipt`);
  const words = validateWords(raw.words, cue, `${field}.words`);
  let correction = null;
  if (raw.correction != null) {
    const c = raw.correction;
    if (!c || typeof c !== "object" || Array.isArray(c) || c.format !== WORD_TIMING_CORRECTION_FORMAT ||
        Object.keys(c).some(key => !["format", "originalWords", "note"].includes(key)) ||
        typeof c.note !== "string" || c.note.length > 500)
      throw new Error(`${field}.correction must contain supported authored provenance and a note of at most 500 characters`);
    const originalWords = validateWords(c.originalWords, cue, `${field}.correction.originalWords`);
    if (originalWords.length !== words.length || originalWords.some((word, index) => word.text !== words[index].text))
      throw new Error(`${field}.correction must retain the exact supplied word segmentation`);
    if (originalWords.every((word, index) => word.start === words[index].start && word.end === words[index].end))
      throw new Error(`${field}.correction must describe a changed interval; restore removes the correction`);
    correction = Object.freeze({ format: WORD_TIMING_CORRECTION_FORMAT, originalWords, note: c.note });
  }
  return Object.freeze({ basis: raw.basis, artifactSha256: raw.artifactSha256,
    receiptSha256: raw.receiptSha256, words, ...(correction ? { correction } : {}) });
}

const copyWords = words => words.map(({ text, start, end }) => ({ text, start, end }));
export function wordTimingDocument(timing) {
  return { basis: timing.basis, artifactSha256: timing.artifactSha256,
    receiptSha256: timing.receiptSha256,
    words: copyWords(timing.words),
    ...(timing.correction ? { correction: { format: timing.correction.format,
      originalWords: copyWords(timing.correction.originalWords), note: timing.correction.note } } : {}) };
}

export function activeWordIndexes(timing, time) {
  if (!timing || !Number.isFinite(time)) return [];
  const indexes = [];
  for (let i = 0; i < timing.words.length; i++) {
    const word = timing.words[i];
    if (word.start <= time && time < word.end) indexes.push(i);
  }
  return indexes;
}

export function wordTimingDescription(timing) {
  const supplied = timing?.basis === "conditional-alignment"
    ? "Conditional alignment of supplied words; text and timing may need correction."
    : "Supplied recognizer estimates; text and timing may need correction.";
  return timing?.correction
    ? `Manually corrected word timing; original supplied intervals are retained. ${supplied}`
    : supplied;
}
