export const ALGORITHM = "materialtruth-lambertian-qr/1";

const finite = value => typeof value === "number" && Number.isFinite(value);

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

function dot(left, right) {
  let sum = 0;
  for (let index = 0; index < left.length; index += 1) sum += left[index] * right[index];
  return sum;
}

// Factor only the light matrix. Applying its saved reflectors below retains
// the original operation order for every right-hand side.
function factorQr(rows, rankTolerance, maximumColumns = 3) {
  const columns = rows[0]?.length;
  if (!Number.isInteger(columns) || columns < 1 || columns > maximumColumns || rows.length < columns || rows.some(row => row.length !== columns)) return null;
  const matrix = rows.map(row => [...row]);
  const permutation = Array.from({length:columns}, (_, index) => index);
  const diagonal = [];
  const reflectors = [];

  for (let k = 0; k < columns; k += 1) {
    let pivot = k;
    let pivotNorm = -1;
    for (let candidate = k; candidate < columns; candidate += 1) {
      const norm = Math.hypot(...matrix.slice(k).map(row => row[candidate]));
      if (norm > pivotNorm) { pivotNorm = norm; pivot = candidate; }
    }
    if (pivot !== k) {
      for (const row of matrix) [row[k], row[pivot]] = [row[pivot], row[k]];
      [permutation[k], permutation[pivot]] = [permutation[pivot], permutation[k]];
    }
    const column = matrix.slice(k).map(row => row[k]);
    const norm = Math.hypot(...column);
    if (!finite(norm) || norm === 0) return null;
    const alpha = column[0] >= 0 ? -norm : norm;
    column[0] -= alpha;
    const vectorNorm = Math.hypot(...column);
    if (!finite(vectorNorm) || vectorNorm === 0) return null;
    const vector = column.map(value => value / vectorNorm);
    for (let target = k; target < columns; target += 1) {
      let projection = 0;
      for (let row = k; row < matrix.length; row += 1) projection += vector[row - k] * matrix[row][target];
      for (let row = k; row < matrix.length; row += 1) matrix[row][target] -= 2 * vector[row - k] * projection;
    }
    reflectors.push(vector);
    matrix[k][k] = alpha;
    diagonal.push(Math.abs(alpha));
  }

  const maximum = Math.max(...diagonal);
  const minimum = Math.min(...diagonal);
  if (minimum <= rankTolerance * maximum) return null;
  return { matrix, permutation, reflectors, qrPivotRatio: maximum / minimum };
}

function applyQr(factor, values) {
  if (!factor || values.length !== factor.matrix.length) return null;
  const { matrix, permutation, reflectors, qrPivotRatio } = factor;
  const columns = permutation.length;
  const right = [...values];
  for (let k = 0; k < columns; k += 1) {
    const vector = reflectors[k];
    let rightProjection = 0;
    for (let row = k; row < matrix.length; row += 1) rightProjection += vector[row - k] * right[row];
    for (let row = k; row < matrix.length; row += 1) right[row] -= 2 * vector[row - k] * rightProjection;
  }
  const permuted = Array(columns).fill(0);
  for (let row = columns - 1; row >= 0; row -= 1) {
    let value = right[row];
    for (let column = row + 1; column < columns; column += 1) value -= matrix[row][column] * permuted[column];
    permuted[row] = value / matrix[row][row];
  }
  const solution = Array(columns).fill(0);
  for (let index = 0; index < columns; index += 1) solution[permutation[index]] = permuted[index];
  return { solution, qrPivotRatio };
}

export function qrSolve(rows, values, rankTolerance) {
  const columns = rows[0]?.length;
  if (![1, 2, 3].includes(columns) || rows.length < columns || values.length !== rows.length) return null;
  return applyQr(factorQr(rows, rankTolerance), values);
}

/**
 * Bounded least-squares adapter for maintained consumers needing up to seven
 * coefficients. Reuses the photometric factorization and RHS operation order;
 * qrSolve and ordinary optical reconstruction retain their three-column gate.
 * Returns null for unsupported input, numerical rank refusal or overflow.
 * qrPivotRatio is the existing diagonal-pivot diagnostic, not a condition bound.
 */
export function qrSolveBounded(rows, values, rankTolerance) {
  if (!Array.isArray(rows) || !Array.isArray(values) ||
      rows.length < 1 || rows.length > 600 || values.length !== rows.length ||
      !finite(rankTolerance) || rankTolerance <= 0 || rankTolerance >= 1) return null;
  const columns = rows[0]?.length;
  if (!Number.isInteger(columns) || columns < 1 || columns > 7 || rows.length < columns) return null;
  // Indexed iteration also rejects sparse arrays; Array#some skips their holes.
  for (let i = 0; i < rows.length; i += 1) {
    if (!Array.isArray(rows[i]) || rows[i].length !== columns || !finite(values[i])) return null;
    for (let j = 0; j < columns; j += 1) if (!finite(rows[i][j])) return null;
  }
  const solved = applyQr(factorQr(rows, rankTolerance, 7), values);
  return solved && finite(solved.qrPivotRatio) && solved.solution.every(finite) ? solved : null;
}

function validateOptions(options) {
  const defaults = {
    shadowFloor: 0.001,
    saturationCeiling: 0.999,
    minSignal: 1e-8,
    rankTolerance: 1e-10,
  };
  const result = { ...defaults, ...options };
  for (const key of Object.keys(defaults)) if (!finite(result[key])) fail("OPTIONS_NUMBER", `${key} must be finite.`);
  if (result.shadowFloor < 0 || result.shadowFloor >= result.saturationCeiling || result.saturationCeiling > 1) fail("OPTIONS_THRESHOLDS", "Require 0 <= shadowFloor < saturationCeiling <= 1.");
  if (result.minSignal <= 0 || result.rankTolerance <= 0 || result.rankTolerance >= 1) fail("OPTIONS_TOLERANCE", "Tolerances must be positive and rankTolerance must be below one.");
  return result;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function rms(values) {
  return values.length ? Math.hypot(...values) / Math.sqrt(values.length) : null;
}

export function solveProject(project, options = {}) {
  const settings = validateOptions({ ...project.settings, ...options });
  const { width, height } = project.dimensions;
  const pixels = width * height;
  const byId = new Map(project.captures.map(capture => [capture.id, capture]));
  const fit = project.selection.fitCaptureIds.map(id => byId.get(id));
  const heldOut = project.selection.validationCaptureIds.map(id => byId.get(id));
  const maps = {
    status: Array(pixels),
    albedo: Array(pixels).fill(null),
    normal: Array(pixels).fill(null),
    fitRmse: Array(pixels).fill(null),
    validationRmse: Array(pixels).fill(null),
    usableFitCount: Array(pixels).fill(0),
    rejectedFitCount: Array(pixels).fill(0),
    rejectedFitShadowCount: Array(pixels).fill(0),
    rejectedFitSaturatedCount: Array(pixels).fill(0),
    usableValidationCount: Array(pixels).fill(0),
    rejectedValidationShadowCount: Array(pixels).fill(0),
    rejectedValidationSaturatedCount: Array(pixels).fill(0),
    qrPivotRatio: Array(pixels).fill(null),
  };
  let validPixels = 0;
  // Admitted projects have at most twelve captures and at least one withheld,
  // so the complete fitting-support domain has at most 2048 masks. Retain it
  // lazily, bounded independently of image size, only for this solve. Direct
  // unadmitted callers can exceed this domain; overflow uses the same solver.
  const factors = fit.length <= 12 ? new Map() : null;

  for (let pixel = 0; pixel < pixels; pixel += 1) {
    let support = 0;
    const usable = fit.filter((capture, index) => {
      const retained = capture.intensities[pixel] > settings.shadowFloor && capture.intensities[pixel] < settings.saturationCeiling;
      if (retained) support += 2 ** index;
      return retained;
    });
    maps.usableFitCount[pixel] = usable.length;
    maps.rejectedFitCount[pixel] = fit.length - usable.length;
    maps.rejectedFitShadowCount[pixel] = fit.filter(capture => capture.intensities[pixel] <= settings.shadowFloor).length;
    maps.rejectedFitSaturatedCount[pixel] = fit.filter(capture => capture.intensities[pixel] >= settings.saturationCeiling).length;
    if (usable.length < 3) { maps.status[pixel] = "insufficient-observations"; continue; }
    const rows = usable.map(capture => capture.light);
    const intensities = usable.map(capture => capture.intensities[pixel]);
    let factor = factors?.get(support);
    if (factor === undefined) {
      factor = factorQr(rows, settings.rankTolerance);
      if (factors && factors.size < 2048) factors.set(support, factor);
    }
    const solved = applyQr(factor, intensities);
    if (!solved) { maps.status[pixel] = "rank-deficient"; continue; }
    const g = solved.solution;
    const albedo = Math.hypot(...g);
    if (!finite(albedo) || albedo < settings.minSignal) { maps.status[pixel] = "low-signal"; continue; }
    const normal = g.map(value => value / albedo);
    if (normal[2] <= 0) { maps.status[pixel] = "back-facing-model"; continue; }
    const fitErrors = rows.map((row, index) => Math.max(0, dot(row, g)) - intensities[index]);
    const fitRmse = rms(fitErrors);
    const validationErrors = [];
    for (const capture of heldOut) {
      const observed = capture.intensities[pixel];
      if (observed <= settings.shadowFloor) maps.rejectedValidationShadowCount[pixel] += 1;
      else if (observed >= settings.saturationCeiling) maps.rejectedValidationSaturatedCount[pixel] += 1;
      else {
        maps.usableValidationCount[pixel] += 1;
        validationErrors.push(Math.max(0, dot(capture.light, g)) - observed);
      }
    }
    maps.status[pixel] = "valid";
    maps.albedo[pixel] = albedo;
    maps.normal[pixel] = normal;
    maps.fitRmse[pixel] = fitRmse;
    maps.validationRmse[pixel] = rms(validationErrors);
    maps.qrPivotRatio[pixel] = solved.qrPivotRatio;
    validPixels += 1;
  }

  const fitResiduals = maps.fitRmse.filter(finite);
  const validationResiduals = maps.validationRmse.filter(finite);
  return Object.freeze({
    algorithm: ALGORITHM,
    width,
    height,
    fitCaptureIds: [...project.selection.fitCaptureIds],
    validationCaptureIds: [...project.selection.validationCaptureIds],
    fitHasRedundantConstraints: fit.length > 3,
    fitDegreesOfFreedomPerFullyObservedPixel: Math.max(0, fit.length - 3),
    maps,
    summary: Object.freeze({
      totalPixels: pixels,
      validPixels,
      coverageFraction: validPixels / pixels,
      meanFitRmse: mean(fitResiduals),
      meanValidationRmse: mean(validationResiduals),
      validationEvaluatedPixels: validationResiduals.length,
      statusCounts: maps.status.reduce((counts, status) => ({ ...counts, [status]: (counts[status] ?? 0) + 1 }), {}),
    }),
    semantics: Object.freeze({
      fitResidual: "Model mismatch on fitting captures; not defect probability or calibrated uncertainty.",
      validationResidual: "Held-out Lambertian prediction error; not physical defect depth or classification.",
      normal: "Estimated orientation under declared fixed-view, registered-pixel, linear-response, Lambertian assumptions; not height.",
      relight: "Synthetic Lambertian prediction; not a captured observation.",
    }),
  });
}

export function relight(result, light) {
  if (!Array.isArray(light) || light.length !== 3 || Object.keys(light).length !== 3 || !light.every(finite)) fail("RELIGHT_VECTOR", "Relight vector must contain three dense finite components.");
  return result.maps.normal.map((normal, pixel) => normal ? Math.max(0, dot(light, normal) * result.maps.albedo[pixel]) : null);
}

/**
 * Compare one admitted capture with the fitted Lambertian model.
 * "Observed minus predicted" is a signed scalar discrepancy, not a defect.
 * Refused fit pixels and shadow/saturation-masked observations never look
 * like zero residuals. Supplied light magnitude is preserved.
 */
export function compareCapture(project, result, captureId) {
  const capture = project?.captures?.find(item => item.id === captureId);
  if (!capture) fail("COMPARISON_CAPTURE", "Select a capture present in the admitted project.");
  const pixels = project.dimensions.width * project.dimensions.height;
  if (result?.width !== project.dimensions.width || result?.height !== project.dimensions.height ||
      result?.maps?.status?.length !== pixels || result?.maps?.normal?.length !== pixels ||
      result?.maps?.albedo?.length !== pixels || capture.intensities.length !== pixels) {
    fail("COMPARISON_SHAPE", "Capture, project and analysis dimensions must agree.");
  }
  const { shadowFloor, saturationCeiling } = validateOptions(project.settings);
  const predicted = Array(pixels).fill(null);
  const observedMinusPredicted = Array(pixels).fill(null);
  const status = Array(pixels);
  let comparablePixels = 0, sumSigned = 0, sumAbsolute = 0, maxAbsolute = 0;

  for (let pixel = 0; pixel < pixels; pixel += 1) {
    if (result.maps.status[pixel] !== "valid") {
      status[pixel] = "model-refused";
      continue;
    }
    const normal = result.maps.normal[pixel], albedo = result.maps.albedo[pixel];
    if (!Array.isArray(normal) || normal.length !== 3 || !normal.every(finite) || !finite(albedo)) {
      fail("COMPARISON_MODEL", "Valid model pixel lacks a finite inferred normal or albedo.");
    }
    const prediction = Math.max(0, dot(capture.light, normal) * albedo);
    if (!finite(prediction)) fail("COMPARISON_MODEL", "Non-finite model prediction.");
    predicted[pixel] = prediction;
    const observed = capture.intensities[pixel];
    if (observed <= shadowFloor) { status[pixel] = "shadow-masked"; continue; }
    if (observed >= saturationCeiling) { status[pixel] = "saturated-masked"; continue; }
    const difference = observed - prediction;
    observedMinusPredicted[pixel] = difference;
    status[pixel] = "comparable";
    comparablePixels += 1;
    sumSigned += difference;
    sumAbsolute += Math.abs(difference);
    maxAbsolute = Math.max(maxAbsolute, Math.abs(difference));
  }

  const role = project.selection.fitCaptureIds.includes(captureId) ? "fit"
    : project.selection.validationCaptureIds.includes(captureId) ? "held-out-validation" : "unused";
  return {
    captureId, role, predicted, observedMinusPredicted, status,
    summary: {
      comparablePixels, totalPixels: pixels,
      meanSignedResidual: comparablePixels ? sumSigned / comparablePixels : null,
      meanAbsoluteResidual: comparablePixels ? sumAbsolute / comparablePixels : null,
      maxAbsoluteResidual: comparablePixels ? maxAbsolute : null,
    },
    semantics: "Observed minus model-predicted scalar intensity, conditional on declared calibration, registration and Lambertian reflectance. Not a physical defect verdict."
  };
}


