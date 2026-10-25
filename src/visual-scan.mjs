// Image appearance between sampled frames; this does not infer task boundaries.
import {clipIdentity, requestedFrameTime} from './frame-origin.mjs';
import {GeometryError} from './geometry.mjs';

export const MAX_SCAN_SAMPLES = 64;
export const MAX_SAMPLE_SIDE = 160;
export const CHANGED_CHANNEL_LEVEL = 16;
const check = (condition, message) => { if (!condition) throw new GeometryError(message); };

export function createVisualScanPlan(clip, {startSeconds, endSeconds, sampleCount}) {
  const source = clipIdentity(clip);
  requestedFrameTime(startSeconds, source.durationSeconds);
  requestedFrameTime(endSeconds, source.durationSeconds);
  check(endSeconds > startSeconds, 'Choose an end time after the start, before the end of the clip.');
  check(Number.isInteger(sampleCount) && sampleCount >= 2 && sampleCount <= MAX_SCAN_SAMPLES,
    `Choose 2–${MAX_SCAN_SAMPLES} sampled frames.`);
  const requestedTimes = Array.from({length: sampleCount}, (_, i) =>
    i === sampleCount - 1 ? endSeconds : startSeconds + (endSeconds - startSeconds) * i / (sampleCount - 1));
  check(requestedTimes.every((t, i) => Number.isFinite(t) && (!i || t > requestedTimes[i - 1])),
    'The interval is too small for distinct requested times.');
  return {clip: source, startSeconds, endSeconds, sampleCount, requestedTimes};
}

function validatePixels(sample) {
  check(sample && Number.isInteger(sample.widthPx) && Number.isInteger(sample.heightPx)
    && sample.widthPx >= 1 && sample.heightPx >= 1
    && sample.widthPx <= MAX_SAMPLE_SIDE && sample.heightPx <= MAX_SAMPLE_SIDE,
  `Sample images must fit within ${MAX_SAMPLE_SIDE} pixels per side.`);
  check((sample.rgba instanceof Uint8ClampedArray || sample.rgba instanceof Uint8Array)
    && sample.rgba.length === sample.widthPx * sample.heightPx * 4, 'Sample pixels are incomplete.');
}

/** Remove one median additive RGB-channel shift; retain the unadjusted score too.
 * A global appearance change can resemble illumination, so neither is a verdict.
 */
export function compareSamplePixels(before, after) {
  validatePixels(before); validatePixels(after);
  check(before.widthPx === after.widthPx && before.heightPx === after.heightPx,
    'Compare samples with the same image dimensions.');
  const count = before.widthPx * before.heightPx, histogram = new Uint32Array(511);
  let raw = 0;
  for (let i = 0; i < before.rgba.length; i += 4) {
    for (let channel = 0; channel < 3; channel++) {
      const delta = after.rgba[i + channel] - before.rgba[i + channel];
      histogram[delta + 255]++; raw += Math.abs(delta);
    }
  }
  const rank = Math.floor((count * 3 - 1) / 2);
  let cumulative = 0, shift = 0;
  for (let i = 0; i < histogram.length; i++) {
    cumulative += histogram[i];
    if (cumulative > rank) { shift = i - 255; break; }
  }
  let adjusted = 0, changed = 0;
  for (let i = 0; i < before.rgba.length; i += 4) {
    let largest = 0;
    for (let channel = 0; channel < 3; channel++) {
      const residual = Math.abs(after.rgba[i + channel] - before.rgba[i + channel] - shift);
      adjusted += residual; largest = Math.max(largest, residual);
    }
    if (largest >= CHANGED_CHANNEL_LEVEL) changed++;
  }
  // Residuals can exceed 255 after a fitted shift. Do not clip the measured value.
  return {meanAbsoluteChange: raw / (count * 3 * 255),
    meanAdjustedChange: adjusted / (count * 3 * 255),
    uniformBrightnessShift: shift, changedPixelFraction: changed / count, pixelCount: count};
}

/** Keep every requested interval, including unattempted or duplicate frames.
 * Missing evidence never becomes a zero score or a comparison across the gap.
 */
export function inspectVisualScan(planInput, samples) {
  const plan = createVisualScanPlan(planInput.clip, planInput);
  check(Array.isArray(samples) && samples.length <= plan.sampleCount, 'Unexpected scan sample count.');
  const frames = plan.requestedTimes.map((requestedSeconds, index) => {
    const sample = samples[index];
    if (!sample) return {index, requestedSeconds, status: 'not-sampled'};
    check(sample.requestedSeconds === requestedSeconds, 'A sample belongs to a different requested time.');
    if (sample.error !== undefined) {
      check(typeof sample.error === 'string' && sample.error.length > 0 && sample.error.length <= 1200,
        'A failed sample needs its decoder error.');
      return {index, requestedSeconds, status: 'failed', error: sample.error};
    }
    validatePixels(sample);
    check(Number.isFinite(sample.presentedSeconds) && sample.presentedSeconds >= 0
      && sample.presentedSeconds <= plan.clip.durationSeconds, 'A sample needs its actual presented-frame time.');
    return {index, requestedSeconds, presentedSeconds: sample.presentedSeconds, status: 'sampled',
      widthPx: sample.widthPx, heightPx: sample.heightPx};
  });
  const intervals = frames.slice(1).map((after, i) => {
    const before = frames[i], base = {index: i, before, after};
    if (before.status !== 'sampled' || after.status !== 'sampled') return {...base, status: 'missing-frame'};
    if (after.presentedSeconds <= before.presentedSeconds) return {...base,
      status: after.presentedSeconds === before.presentedSeconds ? 'same-presented-frame' : 'out-of-order-frame'};
    if (before.widthPx !== after.widthPx || before.heightPx !== after.heightPx)
      return {...base, status: 'changed-frame-size'};
    return {...base, status: 'compared', elapsedSeconds: after.presentedSeconds - before.presentedSeconds,
      ...compareSamplePixels(samples[i], samples[i + 1])};
  });
  return {plan, frames, intervals, sampledCount: frames.filter(f => f.status === 'sampled').length,
    comparedCount: intervals.filter(i => i.status === 'compared').length,
    complete: frames.every(f => f.status === 'sampled'),
    boundary: 'Only the sampled images are compared. Motion between them, small features lost in resizing, camera movement and lighting can change or escape the scores. Brightness adjustment can also hide a real global appearance change. These scores do not identify actions, intent, contact, force or skill.'};
}
