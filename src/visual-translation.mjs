// A finite image comparison, not camera-motion or physical correspondence evidence.
import {compareSamplePixels, inspectVisualScan} from './visual-scan.mjs';
import {locateTranslatedChanges} from './translated-change-regions.mjs';

export const TRANSLATION_RADIUS = 4;
export const WIDE_TRANSLATION_RADIUS = 16;
export const MAX_TRANSLATION_RADIUS = WIDE_TRANSLATION_RADIUS;

/** Minimize the maintained median-brightness RGB L1 metric over integer shifts.
 * Every candidate uses exactly the same reference pixels; neither wrapping nor
 * a smaller overlap can earn a lower score. Keep every exact minimizer.
 */
export function compareTranslatedSamples(before, after, {radius = TRANSLATION_RADIUS, includeChangeRegions = false} = {}) {
  // Reuse source-raster admission without changing the incumbent metric.
  compareSamplePixels(before, after);
  if (!Number.isInteger(radius) || radius < 1 || radius > MAX_TRANSLATION_RADIUS)
    throw Error(`Translation radius must be an integer from 1 to ${MAX_TRANSLATION_RADIUS}.`);
  if (typeof includeChangeRegions !== 'boolean') throw Error('Change-region analysis must be explicitly enabled or disabled.');
  const {widthPx: width, heightPx: height} = before;
  const support = {left: radius, top: radius, width: width - 2 * radius,
    height: height - 2 * radius};
  return fitSupportedSamples(before, after, radius, support, includeChangeRegions);
}

/** The same finite comparison on an explicit subset of the original common
 * interior. This is a sample-space appearance measurement, not an original ROI
 * or a calibrated point correspondence. Every shift uses identical pixels. */
export function compareSupportedTranslations(before, after, referenceSupport,
    {radius = TRANSLATION_RADIUS} = {}) {
  compareSamplePixels(before, after);
  if (!Number.isInteger(radius) || radius < 1 || radius > MAX_TRANSLATION_RADIUS)
    throw Error(`Translation radius must be an integer from 1 to ${MAX_TRANSLATION_RADIUS}.`);
  const {left, top, width, height} = referenceSupport ?? {};
  if (![left, top, width, height].every(Number.isInteger) || width < 3 || height < 3
      || left < radius || top < radius
      || left + width > before.widthPx - radius || top + height > before.heightPx - radius)
    throw Error('Use an integer reference rectangle at least 3 × 3 inside the complete search interior.');
  return fitSupportedSamples(before, after, radius, {left, top, width, height}, false);
}

function fitSupportedSamples(before, after, radius, support, includeChangeRegions) {
  const {widthPx: width, heightPx: height} = before;
  if (support.width < 3 || support.height < 3)
    return {status: 'insufficient-common-support', radius, alternatives: [],
      ...(includeChangeRegions ? {changeRegions: {status: 'unavailable', reason: 'There is insufficient common interior support.'}} : {})};
  const pixelCount = support.width * support.height, channelCount = pixelCount * 3;
  const histogram = new Uint32Array(511), rank = Math.floor((channelCount - 1) / 2);
  let minimum = Infinity, zero = null, alternatives = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      histogram.fill(0);
      for (let y = support.top; y < support.top + support.height; y++) {
        let a = 4 * (y * width + support.left), b = 4 * ((y + dy) * width + support.left + dx);
        for (let x = support.left; x < support.left + support.width; x++, a += 4, b += 4) {
          for (let c = 0; c < 3; c++) histogram[after.rgba[b + c] - before.rgba[a + c] + 255]++;
        }
      }
      let cumulative = 0, median = 0;
      for (let i = 0; i < histogram.length; i++) {
        cumulative += histogram[i];
        if (cumulative > rank) { median = i; break; }
      }
      let absoluteResidual = 0;
      for (let i = 0; i < histogram.length; i++) absoluteResidual += histogram[i] * Math.abs(i - median);
      const candidate = {dx, dy, uniformBrightnessShift: median - 255,
        meanAdjustedChange: absoluteResidual / (channelCount * 255),
        searchBoundary: Math.abs(dx) === radius || Math.abs(dy) === radius};
      if (dx === 0 && dy === 0) zero = candidate;
      if (absoluteResidual < minimum) { minimum = absoluteResidual; alternatives = [candidate]; }
      else if (absoluteResidual === minimum) alternatives.push(candidate);
    }
  }
  const result = {status: alternatives.length > 1 ? 'ambiguous' : alternatives[0].searchBoundary ? 'search-boundary' : 'unique',
    radius, support: {...support, pixelCount, omittedPixels: width * height - pixelCount},
    candidateCount: (2 * radius + 1) ** 2, zero,
    meanAdjustedChange: minimum / (channelCount * 255), alternatives,
    boundary: 'Minimum RGB appearance residual on the same inset pixels, after one integer image shift and one additive brightness shift. This can also explain real scene or object motion. Borders, subpixel shifts, rotation and unseen frames are not assessed; no camera motion, action or physical correspondence is established.'};
  if (includeChangeRegions) result.changeRegions = locateTranslatedChanges(before, after, result);
  return result;
}

/** Retain the existing scan's source/time refusals; never join across a gap. */
export function inspectTranslatedScan(plan, samples, options, onProgress = () => {}) {
  const scan = inspectVisualScan(plan, samples);
  const intervals = scan.intervals.map((interval, index) => {
    const result = interval.status === 'compared'
      ? {index: interval.index, status: 'compared', comparison: compareTranslatedSamples(samples[interval.before.index], samples[interval.after.index], options)}
      : {index: interval.index, status: interval.status};
    onProgress(index + 1, scan.intervals.length);
    return result;
  });
  return {intervals};
}
