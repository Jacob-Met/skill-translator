import {compareSamplePixels, CHANGED_CHANNEL_LEVEL} from './visual-scan.mjs';
import {analyzePixels} from '../vendor/microverse/pixel-observations.mjs';

const unavailable = reason => ({status: 'unavailable', reason});
const rectangle = (left, top, right, bottom) => ({left, top,
  width: Math.max(0, right - left), height: Math.max(0, bottom - top),
  pixelCount: Math.max(0, right - left) * Math.max(0, bottom - top)});

/** Locate residual appearance under a comparison computed from these samples.
 * This internal composition accepts the exact fit, not a saved external report.
 * Counts in the two images retain their respective original sample coordinates.
 */
export function locateTranslatedChanges(before, after, comparison) {
  compareSamplePixels(before, after);
  if (!Number.isFinite(before.presentedSeconds) || !Number.isFinite(after.presentedSeconds)
      || after.presentedSeconds <= before.presentedSeconds)
    return unavailable('Distinct increasing presented times are required.');
  const width = before.widthPx, height = before.heightPx;
  if (width < 16 || height < 16)
    return unavailable('Region analysis requires samples at least 16 × 16; pixels are not enlarged.');
  const radius = comparison?.radius, alternatives = comparison?.alternatives;
  if (!Number.isInteger(radius) || radius < 1 || radius > 16
      || !['unique', 'ambiguous', 'search-boundary'].includes(comparison.status)
      || !Array.isArray(alternatives) || !alternatives.length
      || alternatives.length > (2 * radius + 1) ** 2)
    return unavailable('A complete finite image-shift comparison is required.');
  const earlierSupport = rectangle(radius, radius, width - radius, height - radius);
  if (earlierSupport.width < 3 || earlierSupport.height < 3)
    return unavailable('There is insufficient common interior support.');
  const seen = new Set();
  for (const shift of alternatives) {
    const key = `${shift.dx},${shift.dy}`;
    if (!Number.isInteger(shift.dx) || !Number.isInteger(shift.dy)
        || Math.abs(shift.dx) > radius || Math.abs(shift.dy) > radius
        || !Number.isInteger(shift.uniformBrightnessShift) || Math.abs(shift.uniformBrightnessShift) > 255
        || seen.has(key)) return unavailable('The retained shifts must be distinct admitted integer comparisons.');
    seen.add(key);
  }
  const laterSupport = rectangle(
    Math.max(...alternatives.map(s => radius + s.dx)),
    Math.max(...alternatives.map(s => radius + s.dy)),
    Math.min(...alternatives.map(s => width - radius + s.dx)),
    Math.min(...alternatives.map(s => height - radius + s.dy)));
  const count = width * height, earlier = new Uint16Array(count), later = new Uint16Array(count);
  let comparisons = 0;
  // A zero exact RGB L1 minimum means every retained minimizer has zero
  // residual in every evaluated channel. It needs no threshold-mask traversal.
  if (comparison.meanAdjustedChange !== 0) for (const shift of alternatives) {
    for (let y = radius; y < height - radius; y++) {
      let a = y * width + radius, b = (y + shift.dy) * width + radius + shift.dx;
      for (let x = radius; x < width - radius; x++, a++, b++) {
        let residual = 0;
        for (let c = 0; c < 3; c++) residual = Math.max(residual,
          Math.abs(after.rgba[4 * b + c] - before.rgba[4 * a + c] - shift.uniformBrightnessShift));
        if (residual >= CHANGED_CHANNEL_LEVEL) { earlier[a]++; later[b]++; }
        comparisons++;
      }
    }
  }
  const region = c => ({id: c.id, area: c.area, bbox: [...c.bbox],
    touchesBoundary: c.touchesBoundary, accepted: c.accepted, reason: c.reason});
  function extract(counts, all) {
    const data = new Uint8ClampedArray(count * 4);
    for (let i = 0; i < count; i++) {
      const changed = all ? counts[i] === alternatives.length : counts[i] > 0;
      if (changed) data.fill(255, 4 * i, 4 * i + 3);
      data[4 * i + 3] = 255;
    }
    const analysis = analyzePixels({width, height, data}, {method: 'global',
      polarity: 'bright', threshold: 127, minArea: 4, maxArea: count});
    return {changedPixels: analysis.foregroundPixels, regions: analysis.components.map(region)};
  }
  function account(counts, fullyCompared) {
    const every = extract(counts, true);
    // For one fit the two sets are identical; retain both meanings without
    // repeating connected-component extraction.
    const some = alternatives.length === 1 ? every : extract(counts, false);
    return {every, some, fullyCompared};
  }
  try {
    return {status: 'analyzed', width, height, alternativeCount: alternatives.length,
      earlier: account(earlier, earlierSupport), later: account(later, laterSupport),
      profile: {channelThreshold: CHANGED_CHANNEL_LEVEL, minArea: 4, connectivity: 8},
      work: {evaluatedPixelPairs: comparisons, maximumPixelPairs: earlierSupport.pixelCount * alternatives.length},
      limitation: 'Conditional sampled appearance under every retained minimizing image shift and its brightness offset. Some-fit pixels changed in at least one evaluated comparison; every-fit pixels changed in all fits with full support. A pixel not evaluated by a fit remains unassessed for that fit; outside full support no every-fit conclusion is available. No object, action, contact or physical correspondence is established.'};
  } catch (error) {
    return unavailable(`Connected-region extraction failed: ${error.message}`);
  }
}
