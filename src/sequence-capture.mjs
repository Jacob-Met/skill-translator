// Bind a human-authored calibrated task to an already retained video moment.
// The capture editor remains the owner of calibration and annotation admission.
import {reopenCapture,exportCapture,MAX_ANNOTATION_BYTES} from './capture-editing.mjs';
import {validateCapturedDemo} from './capture.mjs';
import {validateFrameOrigin} from './frame-origin.mjs';

export {MAX_ANNOTATION_BYTES};
export function bindMomentCapture(moment,input){
  const expected=validateFrameOrigin(moment?.origin,moment?.image);
  const task=reopenCapture(JSON.stringify(input),moment.image);
  if(!task.landmarks.length)throw Error('Add at least one source mark before attaching a calibrated task.');
  validateCapturedDemo(task);
  if(task.source.origin){
    const supplied=validateFrameOrigin(task.source.origin,moment.image);
    const fields=['kind','timing','requestedTimeSeconds','mediaTimeSeconds','frameSha256','widthPx','heightPx','decodedWidthPx','decodedHeightPx'];
    const clipFields=['sha256','mimeType','sizeBytes','durationSeconds'];
    if(fields.some(k=>supplied[k]!==expected[k])||clipFields.some(k=>supplied.clip[k]!==expected.clip[k]))
      throw Error('These annotations carry a different video-frame record. Choose annotations for this retained moment.');
  }
  // A downloaded PNG can be annotated as a still. Its independently matched
  // bytes let this consumer retain the existing moment's timeline alongside it.
  task.source.origin=expected;
  // This consumer regenerates its derived context from the accepted account.
  // An imported copy must not override later step or moment revisions.
  delete task.sequenceContext;
  exportCapture(task);
  return task;
}
