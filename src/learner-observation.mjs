// A separate calibrated image records reported placements, not verified skill.
import {calibrate,fromImage,GeometryError} from "./geometry.mjs";
import {createCapture} from "./capture.mjs";
export const LEARNER_OBSERVATION_SCHEMA="skill-translator-learner-observation/v1";
const fail=(ok,message)=>{if(!ok)throw new GeometryError(message);};
const finite=n=>typeof n==="number"&&Number.isFinite(n);

export function normalizeLearnerObservation(target,input){
  fail(input?.schema===LEARNER_OBSERVATION_SCHEMA,"Unsupported learner observation schema");
  fail(Array.isArray(target?.landmarks)&&target.landmarks.length>0,"A valid task target is required");
  const c=input.calibration;
  fail(c&&c.widthMm===target.widthMm&&c.heightMm===target.heightMm,
    "The observed workpiece dimensions must match this practice setup");
  const capture=createCapture(input.image,c.corners,c.widthMm,c.heightMm);
  fail(["reported-photo-annotation","authored-image-control"].includes(input.evidenceClass),
    "Declare a reported photo annotation or an authored image control");
  fail(input.note===undefined||(typeof input.note==="string"&&input.note.length<=800),"Observation note must be at most 800 characters");
  fail(Array.isArray(input.points)&&input.points.length>0&&input.points.length<=target.landmarks.length,
    "Annotate at least one task mark; missing marks remain missing");
  const h=calibrate(capture.source.corners),seen=new Set(),attempts=[];
  const points=input.points.map(p=>{
    fail(p&&target.landmarks.some(m=>m.id===p.id)&&!seen.has(p.id),
      "Each observed point must identify one distinct task mark");seen.add(p.id);
    const pixel=p.pixel,im=capture.source.image;
    fail(pixel&&finite(pixel.x)&&finite(pixel.y)&&pixel.x>=0&&pixel.y>=0&&pixel.x<=im.widthPx&&pixel.y<=im.heightPx,
      "Observed pixels must lie inside the identified image");
    const uv=fromImage(h,pixel);
    fail(uv.u>=-1e-8&&uv.u<=1+1e-8&&uv.v>=-1e-8&&uv.v<=1+1e-8,
      "An observed mark lies outside the calibrated workpiece");
    attempts.push({id:p.id,xMm:Math.max(0,Math.min(1,uv.u))*target.widthMm,
      yMm:Math.max(0,Math.min(1,uv.v))*target.heightMm});
    return {id:p.id,pixel:{x:pixel.x,y:pixel.y}};
  });
  return {record:{schema:LEARNER_OBSERVATION_SCHEMA,image:capture.source.image,
    calibration:{widthMm:c.widthMm,heightMm:c.heightMm,corners:capture.source.corners},
    evidenceClass:input.evidenceClass,note:input.note??"",points},attempts};
}
