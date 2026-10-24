// Source-pixel proposals reuse the exact maintained MICROVERSE region extractor.
// A chosen connected region is not an automatically identified craft landmark.
import {analyzePixels,PIXEL_VERSION} from '../vendor/microverse/pixel-observations.mjs';
import {PIXEL_SOURCE} from '../vendor/microverse/source-pin.mjs';
import {validateCapturedDemo,assertImageMatches,imageMetadata} from './capture.mjs';
import {fromImage} from './geometry.mjs';
import {observationReference} from './evidence.mjs';
import {reviseCaptureMark,exportCapture} from './capture-editing.mjs';

export const MARK_INSPECTION_SCHEMA='skill-translator-mark-inspection/v1';
export const MAX_CROP_SIDE=512;
const requireThat=(ok,message)=>{if(!ok)throw Error(message);};
export function inspectionCrop(raw,image){
 requireThat(raw&&['x','y','width','height'].every(k=>Number.isInteger(raw[k])),'Crop coordinates must be whole pixels.');
 const {x,y,width,height}=raw;
 requireThat(x>=0&&y>=0&&width>=16&&height>=16&&width<=MAX_CROP_SIDE&&height<=MAX_CROP_SIDE&&x+width<=image.widthPx&&y+height<=image.heightPx,'Choose an in-image crop from 16 to 512 pixels per side.');
 return {x,y,width,height};
}
function imageIdentity(image){const {sha256,widthPx,heightPx,mimeType,pixelCoordinates}=imageMetadata(image);return {sha256,widthPx,heightPx,mimeType,pixelCoordinates};}

/** Caller supplies pixels decoded from the independently paired local image. */
export function inspectSourceMark(demo,landmarkId,image,raster,rawCrop,settings={}){
 const derived=validateCapturedDemo(demo);assertImageMatches(demo,image);
 const mark=demo.landmarks.find(m=>m.id===landmarkId);requireThat(mark,'Choose an existing source mark.');
 const crop=inspectionCrop(rawCrop,image);
 requireThat(raster?.width===crop.width&&raster?.height===crop.height,'Decoded crop dimensions differ from the selected region.');
 const extraction=analyzePixels(raster,settings);
 const candidates=extraction.components.map(component=>{
  const sourcePx={x:component.x+crop.x,y:component.y+crop.y};
  const uv=fromImage(derived.h,sourcePx),inside=uv.u>=0&&uv.u<=1&&uv.v>=0&&uv.v<=1;
  const reason=component.reason||(component.touchesBoundary?'truncated-at-crop-boundary':!inside?'outside-calibrated-workpiece':null);
  return {...component,sourcePx,bboxPx:[component.bbox[0]+crop.x,component.bbox[1]+crop.y,component.bbox[2]+crop.x,component.bbox[3]+crop.y],
   physicalMm:{x:uv.u*demo.source.widthMm,y:uv.v*demo.source.heightMm},eligible:reason===null,proposalReason:reason};
 });
 return {schema:MARK_INSPECTION_SCHEMA,sourceReference:observationReference(demo,landmarkId),sourceImage:imageIdentity(image),
  upstream:{...PIXEL_SOURCE},methodVersion:PIXEL_VERSION,crop,settings:extraction.settings,candidates,
  mask:extraction.mask,labels:extraction.labels,
  meaning:'Thresholded connected-region centroids proposed for human review; not automatic landmark identity or measured accuracy.',
  limitations:['Touching features may be merged; inspect the highlighted pixels before choosing a region.',
   'A region centroid may not represent the intended mark, contact or edge.',
   'Local contrast depends on the crop, window and threshold; broad or weak features may fragment or disappear.',
   'Boundary-truncated regions cannot be adopted. No uncertainty or craft-success estimate is produced.']};
}

/** Recompute from supplied source pixels, then preserve the explicit human choice. */
export function adoptSourceComponent(demo,landmarkId,image,raster,crop,settings,componentId){
 const report=inspectSourceMark(demo,landmarkId,image,raster,crop,settings);
 const component=report.candidates.find(c=>c.id===componentId);
 requireThat(component,'Choose a region from the current extraction.');
 requireThat(component.eligible,'This region cannot be adopted: '+component.proposalReason+'.');
 const original=demo.landmarks.find(m=>m.id===landmarkId);
 const history=original.pixelInspections??[];
 requireThat(Array.isArray(history)&&history.length<8,'A mark supports at most eight retained pixel inspections. Keep this source before starting a new annotation.');
 const next=reviseCaptureMark(demo,landmarkId,{label:original.label,kind:original.kind,edge:original.edge,toleranceMm:original.toleranceMm,sourcePx:component.sourcePx});
 next.landmarks.find(m=>m.id===landmarkId).pixelInspections=[...structuredClone(history),{
  schema:MARK_INSPECTION_SCHEMA,upstream:report.upstream,methodVersion:report.methodVersion,
  sourceReference:report.sourceReference,sourceImage:report.sourceImage,crop:report.crop,settings:report.settings,
  selectedComponent:component.id,area:component.area,bboxPx:component.bboxPx,meanIntensity:component.meanIntensity,
  adoptedPoint:component.sourcePx,priorPoint:structuredClone(original.sourcePx),
  decision:'Human selected this connected-region centroid; no automatic semantic match or accuracy claim.'
 }];
 // New evidence must remain saveable and reopenable by the actual source reader.
 exportCapture(next);return next;
}

/** Saved evidence is a past decision, not a standing verification of later edits. */
export function inspectionRelation(demo,landmarkId){
 const mark=demo?.landmarks?.find(m=>m.id===landmarkId);
 if(mark?.pixelInspections!==undefined&&!Array.isArray(mark.pixelInspections))return {status:'invalid',message:'Retained pixel-inspection metadata is malformed; no verification is claimed.'};
 const record=mark?.pixelInspections?.at(-1);
 if(!record)return {status:'none',message:'No retained pixel inspection for this mark.'};
 const image=demo.source.image,point=record.adoptedPoint;
 const sameImage=['sha256','widthPx','heightPx','mimeType','pixelCoordinates'].every(k=>record.sourceImage?.[k]===image?.[k]);
 if(!sameImage||point?.x!==mark.sourcePx.x||point?.y!==mark.sourcePx.y)
  return {status:'changed',message:'Current coordinates or source differ from the retained pixel proposal; the old inspection is historical evidence only.'};
 return {status:'recorded',message:'Coordinates match the saved human choice. Recompute with the original image to inspect its current pixel support.'};
}

export function reproduceSourceInspection(demo,landmarkId,image,raster){
 const mark=demo?.landmarks?.find(m=>m.id===landmarkId),records=mark?.pixelInspections;
 requireThat(Array.isArray(records)&&records.length>0,'No saved pixel inspection can be reproduced.');
 const record=records.at(-1);
 requireThat(record?.schema===MARK_INSPECTION_SCHEMA&&record.methodVersion===PIXEL_VERSION&&Object.entries(PIXEL_SOURCE).every(([key,value])=>record.upstream?.[key]===value),'The saved extraction uses an unsupported source pin or format.');
 requireThat(inspectionRelation(demo,landmarkId).status==='recorded','The current source point differs from the retained inspection.');
 const report=inspectSourceMark(demo,landmarkId,image,raster,record.crop,record.settings);
 const actual=report.candidates.find(c=>c.id===record.selectedComponent);
 requireThat(actual?.eligible&&actual.sourcePx.x===record.adoptedPoint.x&&actual.sourcePx.y===record.adoptedPoint.y&&actual.area===record.area&&actual.meanIntensity===record.meanIntensity&&JSON.stringify(actual.bboxPx)===JSON.stringify(record.bboxPx),'The saved region measurements do not reproduce from these pixels and settings.');
 return {status:'reproduced',report,component:actual,message:'Saved region measurements reproduced from the paired image crop. Landmark meaning and physical accuracy remain supplied by the author.'};
}
