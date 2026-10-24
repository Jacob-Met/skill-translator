/** Local foreground observations. Components are image regions, not organisms. */
export const PIXEL_VERSION = 'microverse-pixel-observations/v1';
export const PIXEL_LIMITS = Object.freeze({ pixels: 2_000_000, frames: 80, components: 4096 });
const finite = value => typeof value === 'number' && Number.isFinite(value);
const fail = message => { throw new Error(message); };

export function settingsFor(input = {}) {
  const settings = {
    method: input.method ?? 'local-contrast',
    polarity: input.polarity ?? 'dark',
    threshold: input.threshold ?? 24,
    radius: input.radius ?? 16,
    minArea: input.minArea ?? 12,
    maxArea: input.maxArea ?? PIXEL_LIMITS.pixels,
  };
  if (!['local-contrast', 'global'].includes(settings.method)) fail('Choose local contrast or global intensity.');
  if (!['dark', 'bright'].includes(settings.polarity)) fail('Choose dark or bright foreground.');
  if (!finite(settings.threshold) || settings.threshold < 0 || settings.threshold > 255) fail('Threshold must be between 0 and 255.');
  if (!Number.isInteger(settings.radius) || settings.radius < 1 || settings.radius > 128) fail('Background radius must be an integer from 1 to 128 pixels.');
  if (!Number.isInteger(settings.minArea) || settings.minArea < 1 || !Number.isInteger(settings.maxArea) || settings.maxArea < settings.minArea || settings.maxArea > PIXEL_LIMITS.pixels) fail('Area limits must be increasing whole pixel counts.');
  return settings;
}

function admitImage(image) {
  const {width, height, data} = image ?? {};
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 16 || height < 16 || width > 8192 || height > 8192 || width * height > PIXEL_LIMITS.pixels) fail('Use a raster at least 16 × 16 and at most 2 million pixels. Images are never silently resized.');
  if (!(data instanceof Uint8Array || data instanceof Uint8ClampedArray) || data.length !== width * height * 4) fail('Supply one RGBA byte value per channel and pixel.');
  const intensity = new Float64Array(width * height);
  for (let i = 0; i < intensity.length; i++) {
    if (data[i * 4 + 3] !== 255) fail('Transparent pixels need an explicit opaque source image before analysis.');
    intensity[i] = (77 * data[i * 4] + 150 * data[i * 4 + 1] + 29 * data[i * 4 + 2]) / 256;
  }
  return {width, height, intensity};
}

/** Summed-area local mean, in decoded display-intensity units, not radiance. */
function localBackground(intensity, width, height, radius) {
  const stride = width + 1;
  const integral = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      sum += intensity[y * width + x];
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + sum;
    }
  }
  const background = new Float64Array(intensity.length);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius), y1 = Math.min(height, y + radius + 1);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius), x1 = Math.min(width, x + radius + 1);
      const sum = integral[y1 * stride + x1] - integral[y0 * stride + x1] - integral[y1 * stride + x0] + integral[y0 * stride + x0];
      background[y * width + x] = sum / ((x1 - x0) * (y1 - y0));
    }
  }
  return background;
}

export function analyzePixels(image, input = {}) {
  const settings = settingsFor(input), {width, height, intensity} = admitImage(image);
  const background = settings.method === 'local-contrast' ? localBackground(intensity, width, height, settings.radius) : null;
  const mask = new Uint8Array(intensity.length);
  for (let i = 0; i < mask.length; i++) {
    const value = intensity[i];
    mask[i] = settings.method === 'global'
      ? Number(settings.polarity === 'dark' ? value < settings.threshold : value > settings.threshold)
      : Number(settings.polarity === 'dark' ? background[i] - value > settings.threshold : value - background[i] > settings.threshold);
  }
  const labels = new Uint32Array(mask.length), queue = new Uint32Array(mask.length), components = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start]) continue;
    if (components.length >= PIXEL_LIMITS.components) fail('More than 4096 foreground regions. Increase contrast or remove noise before export.');
    const label = components.length + 1;
    let head = 0, tail = 1, sumX = 0, sumY = 0, sumIntensity = 0;
    let x0 = width, y0 = height, x1 = 0, y1 = 0;
    queue[0] = start;
    labels[start] = label;
    while (head < tail) {
      const i = queue[head++], x = i % width, y = Math.floor(i / width);
      sumX += x + .5; sumY += y + .5; sumIntensity += intensity[i];
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1);
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width || (!dx && !dy)) continue;
          const neighbor = ny * width + nx;
          if (mask[neighbor] && !labels[neighbor]) {
            labels[neighbor] = label;
            queue[tail++] = neighbor;
          }
        }
      }
    }
    const reason = tail < settings.minArea ? 'below-minimum-area' : tail > settings.maxArea ? 'above-maximum-area' : null;
    components.push({id: `component-${label}`, label, x: sumX / tail, y: sumY / tail, area: tail, bbox: [x0, y0, x1, y1], meanIntensity: sumIntensity / tail, touchesBoundary: x0 === 0 || y0 === 0 || x1 === width || y1 === height, accepted: !reason, reason});
  }
  return {
    version: PIXEL_VERSION, width, height, settings, mask, labels, components,
    foregroundPixels: mask.reduce((total, value) => total + value, 0),
    limitations: [
      'A connected region may contain several touching objects; no instance split or biological identity is inferred.',
      'Local contrast measures deviation from a nearby mean. Objects wider than the background window may fragment or disappear.',
      'Thresholds and areas depend on acquisition and decoded display intensity; no calibrated biological accuracy is implied.',
    ],
  };
}

export function validatePixelSource(source, width, height) {
  if (!source || typeof source.name !== 'string' || !source.name.length || source.name.length > 160 || /[\\/\x00-\x1f]/.test(source.name)) fail('Each source needs a local filename, without paths or URLs.');
  if (!['image/png', 'image/jpeg'].includes(source.type) || !/^[a-f0-9]{64}$/.test(source.sha256 ?? '') || !Number.isInteger(source.bytes) || source.bytes < 1) fail('Each source needs its PNG/JPEG type, byte length and SHA-256 digest.');
  return {name: source.name, type: source.type, bytes: source.bytes, sha256: source.sha256, width, height, raster: 'browser-decoded, orientation applied; pixel centers, origin upper left'};
}

/** Export matches the existing encounter investigator. Extra provenance is retained alongside it. */
export function makePixelExperiment(frames, {id = 'pixel-investigation', evidence} = {}) {
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) fail('Experiment ID needs 1–40 letters, numbers, underscores or hyphens.');
  if (!['authored simulation', 'measured detections'].includes(evidence)) fail('Declare whether the source is a recording or an authored simulation.');
  if (!Array.isArray(frames) || frames.length < 2 || frames.length > PIXEL_LIMITS.frames) fail('Choose 2–80 source frames for the encounter investigator.');
  const width = frames[0]?.analysis?.width, height = frames[0]?.analysis?.height;
  let previous = -Infinity;
  const names = new Set(), extractionFrames = [];
  const observations = frames.map((frame, index) => {
    const analysis = frame.analysis;
    if (!analysis || analysis.version !== PIXEL_VERSION || analysis.width !== width || analysis.height !== height) fail('All source frames must have the same decoded dimensions.');
    if (!finite(frame.time) || frame.time < 0 || frame.time > 86400 || frame.time <= previous) fail('Frame times must strictly increase, in seconds from 0 to 86400.');
    previous = frame.time;
    if (!Array.isArray(frame.stage) || frame.stage.length !== 2 || frame.stage.some(n => !finite(n) || Math.abs(n) > 16384)) fail('Declare both stage-displacement coordinates for every frame.');
    const source = validatePixelSource(frame.source, width, height);
    if (names.has(source.name)) fail('Source filenames must be unique so the investigator can reattach the correct frame.');
    names.add(source.name);
    const excluded = new Set(frame.excluded ?? []);
    if ([...excluded].some(id => !analysis.components.some(component => component.id === id && component.accepted))) fail('An excluded component no longer exists. Review the new extraction.');
    const included = analysis.components.filter(component => component.accepted && !excluded.has(component.id));
    const limit = index === 0 ? 4 : 6;
    if (included.length > limit || (index === 0 && included.length === 0)) fail(`Frame ${index + 1}: select ${index === 0 ? 'one to four starting regions' : 'at most six regions'} before export. Nothing is silently dropped.`);
    const detections = included.map(component => ({id: component.id, x: component.x, y: component.y}));
    extractionFrames.push({frame: index, time: frame.time, source, settings: {...analysis.settings}, components: analysis.components.map(component => ({...component, bbox: [...component.bbox], included: included.includes(component), review: excluded.has(component.id) ? 'manually excluded' : component.reason ?? 'included'}))});
    return {time: frame.time, stage: [...frame.stage], image: source.name, detections};
  });
  return {
    format: 'microverse-encounter/v1', id, width, height, evidence, frames: observations,
    extraction: {
      format: PIXEL_VERSION,
      coordinates: 'Decoded raster pixel centers, origin upper left; stage displacement is supplied separately.',
      method: 'Eight-connected regions after an explicit intensity or local-mean contrast threshold.',
      frames: extractionFrames,
      limitations: [...frames[0].analysis.limitations],
      media: 'Original local images are not embedded. Reattach matching filenames and verify their SHA-256 digests.',
    },
  };
}
