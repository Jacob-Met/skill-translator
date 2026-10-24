// Transactional revision of authored source annotations. Source identity and
// unrelated metadata are preserved; edits do not upgrade their evidence class.
import {createCapture, validateCapturedDemo, assertImageMatches} from './capture.mjs';
import {appendAnnotation} from './authoring.mjs';

export const MAX_ANNOTATION_BYTES = 256 * 1024;
function validatedDraft(demo) {
  if (!demo || !Array.isArray(demo.landmarks)) throw Error('Source marks are missing.');
  createCapture(demo.source?.image, demo.source?.corners,
    demo.source?.widthMm, demo.source?.heightMm, {origin:demo.source?.origin});
  if (demo.landmarks.length) validateCapturedDemo(demo);
  return demo;
}

/** Reopen only with a matching, independently admitted local image. */
export function reopenCapture(text, image) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_ANNOTATION_BYTES)
    throw Error('Annotations must be JSON up to 256 KiB.');
  const demo = JSON.parse(text);
  validatedDraft(demo);
  assertImageMatches(demo, image);
  return demo;
}

/** Every saved source must fit the same reader that will reopen it later. */
export function exportCapture(demo) {
  validateCapturedDemo(demo);
  const text=JSON.stringify(demo,null,2);
  if(new TextEncoder().encode(text).length>MAX_ANNOTATION_BYTES)
    throw Error('Saved annotations exceed the 256 KiB reopening limit; accepted work is unchanged.');
  return text;
}

/** Recalibration changes the declared mapping without erasing author/source context. */
export function reviseCaptureCalibration(demo, corners, widthMm, heightMm, title) {
  validatedDraft(demo);
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 160)
    throw Error('Use a demonstration name of 1–160 characters.');
  const calibration = createCapture(demo.source.image, corners, widthMm, heightMm,
    {origin:demo.source.origin, title});
  const next = structuredClone(demo);
  next.title = title.trim();
  next.source = {...next.source, corners:calibration.source.corners,
    widthMm:calibration.source.widthMm, heightMm:calibration.source.heightMm};
  validatedDraft(next);
  return next;
}

/** Preserve stable identity and all context while changing explicit mark fields. */
export function reviseCaptureMark(demo, id, input) {
  validatedDraft(demo);
  const index = demo.landmarks.findIndex(mark => mark.id === id);
  if (index < 0) throw Error('Choose an existing source mark to edit.');
  // Reuse the maintained authoring admission on a temporary copy. Removing the
  // edited mark first permits edits when all thirty supported slots are used.
  const candidate = structuredClone(demo);
  const original = candidate.landmarks[index];
  candidate.landmarks.splice(index, 1);
  const admitted = appendAnnotation(candidate, input,
    demo.source.widthMm, demo.source.heightMm).demo.landmarks.at(-1);
  const replacement = {...original, ...admitted, id:original.id,
    sourcePx:{...original.sourcePx,...admitted.sourcePx}};
  // The studio does not edit explanations. Do not truncate or invent one when
  // the author revises a different field on an imported source.
  if (!Object.hasOwn(input,'why') || input.why === original.why) {
    if (Object.hasOwn(original,'why')) replacement.why=structuredClone(original.why);
    else delete replacement.why;
  }
  if (replacement.kind === 'fraction') delete replacement.edge;
  const next = structuredClone(demo);
  next.landmarks[index] = replacement;
  validateCapturedDemo(next);
  return next;
}

/** Empty captures remain editable drafts and cannot be exported as task sources. */
export function removeCaptureMark(demo, id) {
  validatedDraft(demo);
  if (!demo.landmarks.some(mark => mark.id === id)) throw Error('Choose an existing source mark to remove.');
  const next = structuredClone(demo);
  next.landmarks = next.landmarks.filter(mark => mark.id !== id);
  validatedDraft(next);
  return next;
}
