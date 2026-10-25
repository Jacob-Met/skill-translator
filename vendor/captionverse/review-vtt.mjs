import { validateManifest } from './core.mjs';
import { MAX_SUBTITLE_BYTES } from './subtitles.mjs';

// Transport subtitles are intentionally lossy. Bound JSON remains the source of
// truth for cue identity, sound kind, normalized positions and confidence.
export function serializeReviewedWebVtt(input, { mediaSha256, mediaDuration } = {}) {
  if (!mediaSha256 || !Number.isFinite(mediaDuration) || mediaDuration <= 0) {
    throw new Error('Reviewed WebVTT export requires an identified video and its decoded duration');
  }
  const revision = validateManifest(input, { mediaSha256, mediaDuration });
  if (!revision.cues.length) throw new Error('Add or import at least one accepted cue before exporting subtitles');

  const timestamp = (seconds) => {
    const millis = Math.round(seconds * 1000);
    if (!Number.isSafeInteger(millis)) throw new Error('Cue time is too large for WebVTT milliseconds');
    const hours = Math.floor(millis / 3_600_000);
    const minutes = Math.floor((millis % 3_600_000) / 60_000);
    const secs = Math.floor((millis % 60_000) / 1000);
    const ms = millis % 1000;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  };
  const escape = value => value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');
  const cues = [...revision.cues].sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id));
  const blocks = cues.map(cue => {
    if (/\r|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(cue.text) || /\n[ \t]*\n/u.test(cue.text) || /[\r\n\u0000-\u001f]/u.test(cue.label)) {
      throw new Error(`Cue ${cue.id} contains a line break or control character unsupported by this plain-text WebVTT export`);
    }
    const start = Math.round(cue.start * 1000), end = Math.round(cue.end * 1000);
    if (end <= start) throw new Error(`Cue ${cue.id} becomes zero-length at WebVTT millisecond precision; keep the bound JSON or extend its interval`);
    if (end / 1000 > mediaDuration) throw new Error(`Cue ${cue.id} would round beyond the selected video duration in WebVTT; keep bound JSON or shorten its interval`);
    const prefix = cue.kind === 'sound' ? `[Sound: ${cue.label}] `
      : cue.label === 'Subtitle (unattributed)' ? '' : `${cue.label}: `;
    return `${timestamp(cue.start)} --> ${timestamp(cue.end)}\n${escape(prefix + cue.text)}`;
  });
  const result = `WEBVTT\n\nNOTE CAPTIONVERSE reviewed WebVTT export\nSource SHA-256: ${revision.media.sha256}\nThis is a plain-text interchange copy; keep bound JSON for source evidence and spatial metadata.\n\n${blocks.join('\n\n')}\n`;
  if (new TextEncoder().encode(result).byteLength > MAX_SUBTITLE_BYTES) {
    throw new Error('Reviewed subtitles exceed the 2 MiB WebVTT import limit; retain the bound JSON or export a smaller revision');
  }
  return result;
}
