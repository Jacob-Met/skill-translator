import {derive} from './geometry.mjs';
import {validateCapturedDemo} from './capture.mjs';
/** Original calibrated geometry; correspondence models never rewrite source IDs. */
export function spatialSourcePoints(annotation){
 const task=annotation?.source?.image?validateCapturedDemo(annotation):derive(annotation);
 return task.landmarks.map(m=>({id:m.id,x:m.uv.u*task.source.widthMm,y:m.uv.v*task.source.heightMm}));
}
