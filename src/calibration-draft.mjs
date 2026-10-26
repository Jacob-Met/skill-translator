import {createCapture, imageMetadata, validateCapturedDemo} from './capture.mjs';

export const FIDUCIAL_KERNEL = Object.freeze({repository:'Jacob-Met/microverse',
  commit:'b762d8c26db6b314c612cbb53a14e7cb165a7c3f', path:'calibration/fiducials.py',
  sha256:'b7c8728e5fefafb7e10ebe4e05e2c65dbce299b01d2f7234517e5e3f4f750743'});
export const FIDUCIAL_SETTINGS = Object.freeze({search:16,minScore:.85,minMargin:.08,maxDisagreement:1.5});
const fail = message => {throw Error(message);};
const canonical = value => Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const same = (a,b) => JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function calibrationDraftRequest(reference, target, rois, declaration) {
  // Detach before asynchronous native work; callers retain their original task.
  const task=structuredClone(reference); validateCapturedDemo(task);
  const source=imageMetadata(task.source.image), image=imageMetadata(target);
  task.source.image=source;
  if(source.mimeType!=='image/png'||image.mimeType!=='image/png')fail('Calibration transfer requires original PNGs.');
  if(source.widthPx!==image.widthPx||source.heightPx!==image.heightPx||Math.min(image.widthPx,image.heightPx)<16||image.widthPx*image.heightPx>16_000_000)fail('Choose equal-sized original PNGs within the 16 megapixel transfer limit.');
  if(declaration?.stationaryPlane!==true||typeof declaration.basis!=='string'||!declaration.basis.trim()||declaration.basis.length>800)fail('Declare why the reference patches remain stationary relative to the calibrated workpiece plane.');
  if(!Array.isArray(rois)||rois.length<2||rois.length>8)fail('Select 2–8 separate stationary reference patches.');
  rois.forEach((r,i)=>{
    if(!Array.isArray(r)||r.length!==4||r.some(v=>!Number.isInteger(v)))fail('Each patch needs integer x, y, width and height.');
    const [x,y,w,h]=r;
    if(x<0||y<0||Math.min(w,h)<7||Math.max(w,h)>128||x+w>image.widthPx||y+h>image.heightPx)fail('Patches must be inside the original image and 7–128 pixels per side.');
    if(rois.slice(0,i).some(([a,b,c,d])=>Math.max(a,x)<Math.min(a+c,x+w)&&Math.max(b,y)<Math.min(b+d,y+h)))fail('Stationary patches must not overlap.');
  });
  return {reference:task,target:image,rois:structuredClone(rois),declaration:{stationaryPlane:true,basis:declaration.basis.trim()}};
}

/** A source-bound, editable proposal. This never applies calibration or marks. */
export function receiveCalibrationDraft(request, report) {
  const q=calibrationDraftRequest(request.reference,request.target,request.rois,request.declaration);
  const r=structuredClone(report), registration=r?.registration;
  if(r?.format!=='skill-translator.calibration-translation/v1'||!same(r.kernel,FIDUCIAL_KERNEL)||
      !same(r.reference,imageMetadata(q.reference.source.image))||!same(r.target,q.target))fail('Native translation source identity or pinned kernel mismatch.');
  if(registration?.format!=='microverse-fiducial-translation/v1'||registration.width!==q.target.widthPx||registration.height!==q.target.heightPx||registration.referenceFrame!==0||!same(registration.rois,q.rois)||!same(registration.settings,FIDUCIAL_SETTINGS)||registration.frames?.length!==2)fail('Native translation profile mismatch.');
  for(const [index,frame] of registration.frames.entries()) {
    if(frame.frame!==index||!/^[a-f0-9]{64}$/.test(frame.sha256)||frame.accepted!==true||!Array.isArray(frame.stage)||frame.stage.length!==2||frame.stage.some(v=>!Number.isFinite(v)||Math.abs(v)>=16)||!Number.isFinite(frame.maxResidualPixels)||frame.maxResidualPixels<0||frame.maxResidualPixels>1.5||frame.matches?.length!==q.rois.length)fail('Stationary reference translation unresolved; no zero-shift fallback.');
    for(const match of frame.matches)if(match.accepted!==true||!Number.isFinite(match.score)||match.score<.85||match.score>1.000001||!Number.isFinite(match.margin)||match.margin<.08||!Array.isArray(match.offset)||match.offset.length!==2||match.offset.some(v=>!Number.isInteger(v)||Math.abs(v)>=16))fail('Stationary patch matching is unresolved.');
    const center=[0,1].map(axis=>{const sorted=frame.matches.map(m=>m.offset[axis]).sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;});
    const residual=Math.max(...frame.matches.map(m=>Math.hypot(m.offset[0]-center[0],m.offset[1]-center[1])));
    if(!same(center,frame.stage)||Math.abs(residual-frame.maxResidualPixels)>1e-9)fail('Native patch offsets and consensus translation disagree.');
  }
  if(registration.frames[0].stage.some(v=>v!==0))fail('The source reference does not self-register at zero translation.');
  const [dx,dy]=registration.frames[1].stage;
  const corners=q.reference.source.corners.map(p=>({x:p.x+dx,y:p.y+dy}));
  const {widthMm,heightMm}=q.reference.source;
  createCapture(q.target,corners,widthMm,heightMm);
  return {corners,widthMm,heightMm,evidence:{format:'skill-translator.calibration-draft-evidence/v1',
    referenceCalibration:structuredClone(q.reference.source),declaration:q.declaration,report:r,
    proposedCorners:structuredClone(corners),limits:'Editable integer-translation draft only. Subpixel motion, rotation and deformation are not modeled. Agreed moving patches can be wrong. Review corners before applying; no task marks or physical accuracy are inferred.'}};
}
