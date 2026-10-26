import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compareSamplePixels, createVisualScanPlan} from '../src/visual-scan.mjs';
import {compareTranslatedSamples, inspectTranslatedScan} from '../src/visual-translation.mjs';

function image(width = 24, height = 19, seed = 71) {
  let state = seed;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < rgba.length; i += 4) {
    for (let c = 0; c < 3; c++) { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; rgba[i + c] = 35 + state % 170; }
    rgba[i + 3] = 255;
  }
  return {widthPx: width, heightPx: height, rgba};
}
function shift(source, dx, dy, light = 0) {
  const out = image(source.widthPx, source.heightPx, 9901);
  for (let y = 0; y < source.heightPx; y++) for (let x = 0; x < source.widthPx; x++) {
    const xx = x + dx, yy = y + dy;
    if (xx < 0 || yy < 0 || xx >= source.widthPx || yy >= source.heightPx) continue;
    const a = 4 * (y * source.widthPx + x), b = 4 * (yy * source.widthPx + xx);
    for (let c = 0; c < 3; c++) out.rgba[b + c] = source.rgba[a + c] + light;
  }
  return out;
}

// Independent direct sorting / explicit residual oracle; no histogram reuse.
function oracle(a, b, radius) {
  const rows = [];
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
    const deltas = [];
    for (let y = radius; y < a.heightPx - radius; y++) for (let x = radius; x < a.widthPx - radius; x++) {
      for (let c = 0; c < 3; c++) deltas.push(b.rgba[4 * ((y + dy) * a.widthPx + x + dx) + c] - a.rgba[4 * (y * a.widthPx + x) + c]);
    }
    deltas.sort((x, y) => x - y);
    const light = deltas[Math.floor((deltas.length - 1) / 2)];
    rows.push({dx, dy, light, sum: deltas.reduce((s, d) => s + Math.abs(d - light), 0)});
  }
  const least = Math.min(...rows.map(r => r.sum));
  return rows.filter(r => r.sum === least);
}

test('translated texture and brightness are fitted without suppressing original evidence', () => {
  const before = image(), after = shift(before, 2, -1, 18), saved = structuredClone([before, after]);
  const original = compareSamplePixels(before, after), result = compareTranslatedSamples(before, after);
  assert.ok(original.meanAdjustedChange > .1);
  assert.equal(result.status, 'unique'); assert.equal(result.meanAdjustedChange, 0);
  assert.deepEqual(result.alternatives.map(x => [x.dx, x.dy, x.uniformBrightnessShift]), [[2, -1, 18]]);
  assert.ok(result.zero.meanAdjustedChange > .1);
  assert.deepEqual([before, after], saved);
});

test('a local change remains after translation; foreground movement is not called camera motion', () => {
  const before = image(40, 31), after = shift(before, -2, 1, 9);
  for (let y = 12; y < 16; y++) for (let x = 15; x < 20; x++) after.rgba.set([250, 0, 250, 255], 4 * (y * 40 + x));
  const result = compareTranslatedSamples(before, after);
  assert.equal(result.status, 'unique'); assert.deepEqual(result.alternatives.map(x => [x.dx, x.dy]), [[-2, 1]]);
  assert.ok(result.meanAdjustedChange > .01); assert.ok(result.meanAdjustedChange < result.zero.meanAdjustedChange);
  assert.match(result.boundary, /real scene or object motion/);
});

test('finite exhaustive result agrees with independent sorted-delta oracle on changed inputs', () => {
  for (let seed = 1; seed <= 24; seed++) {
    const a = image(10 + seed % 4, 11 + seed % 3, seed), b = seed % 3 ? shift(a, seed % 5 - 2, (seed * 3) % 5 - 2, seed % 9) : image(a.widthPx, a.heightPx, seed + 122);
    const result = compareTranslatedSamples(a, b, {radius: 2}), expected = oracle(a, b, 2);
    assert.deepEqual(result.alternatives.map(x => [x.dx, x.dy, x.uniformBrightnessShift]), expected.map(x => [x.dx, x.dy, x.light]));
    assert.equal(result.meanAdjustedChange, expected[0].sum / ((a.widthPx - 4) * (a.heightPx - 4) * 3 * 255));
  }
});

test('flat and periodic images keep every exact optimum, including search-boundary ties', () => {
  const flat = image(); flat.rgba.fill(80); const light = structuredClone(flat); light.rgba.fill(100);
  const result = compareTranslatedSamples(flat, light);
  assert.equal(result.status, 'ambiguous'); assert.equal(result.alternatives.length, 81); assert.equal(result.meanAdjustedChange, 0);
  const periodic = image();
  for (let y = 0; y < periodic.heightPx; y++) for (let x = 0; x < periodic.widthPx; x++) periodic.rgba.set([20 + (x % 2) * 90, 40 + (y % 2) * 80, 30, 255], 4 * (y * periodic.widthPx + x));
  const repeated = compareTranslatedSamples(periodic, periodic);
  assert.equal(repeated.status, 'ambiguous'); assert.equal(repeated.alternatives.length, 25);
  assert.ok(repeated.alternatives.some(a => a.searchBoundary));
});

test('edge minima and unexamined borders remain explicit, with no wrapped/fill pixels', () => {
  const a = image(), b = shift(a, 4, 0);
  const result = compareTranslatedSamples(a, b);
  assert.equal(result.status, 'search-boundary'); assert.equal(result.meanAdjustedChange, 0);
  assert.deepEqual(result.support, {left: 4, top: 4, width: 16, height: 11, pixelCount: 176, omittedPixels: 280});
  const border = structuredClone(a);
  for (let x = 0; x < a.widthPx; x++) border.rgba.set([255, 0, 255, 255], x * 4);
  assert.equal(compareTranslatedSamples(a, border).meanAdjustedChange, 0);
  assert.ok(compareSamplePixels(a, border).meanAdjustedChange > 0);
});

test('scan preserves gaps, duplicate presentation, source/time admission and insufficient support', () => {
  const clip = {name: 'authored.webm', mimeType: 'video/webm', sizeBytes: 100, sha256: 'a'.repeat(64), durationSeconds: 10};
  const plan = createVisualScanPlan(clip, {startSeconds: 0, endSeconds: 8, sampleCount: 5});
  const sample = (i, t) => ({...image(), requestedSeconds: plan.requestedTimes[i], presentedSeconds: t});
  const report = inspectTranslatedScan(plan, [sample(0, 0), sample(1, 2), sample(2, 2), {requestedSeconds: 6, error: 'test decoder failure'}]);
  assert.deepEqual(report.intervals.map(r => r.status), ['compared', 'same-presented-frame', 'missing-frame', 'missing-frame']);
  assert.equal(report.intervals[1].comparison, undefined);
  assert.equal(compareTranslatedSamples(image(5, 5), image(5, 5)).status, 'insufficient-common-support');
  assert.throws(() => inspectTranslatedScan(plan, [{...sample(0, 0), requestedSeconds: 1}]), /different requested time/);
  for (const radius of [0, 1.5, 7, NaN]) assert.throws(() => compareTranslatedSamples(image(), image(), {radius}), /radius/);
});
