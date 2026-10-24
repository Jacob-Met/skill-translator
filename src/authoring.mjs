// Add a human-authored source annotation. No inference from image data.
// All changes are transactional: original demonstration remains untouched on error.
import {derive,adapt,GeometryError} from "./geometry.mjs";
export function appendAnnotation(demo,input,widthMm,heightMm){
  if(!demo||!Array.isArray(demo.landmarks))throw new GeometryError("No source demonstration");
  if(!input||typeof input.label!=="string"||!input.label.trim()
    ||input.label.trim().length>100)
    throw new GeometryError("Add a landmark label of 1–100 characters");
  if(!input.sourcePx||!Number.isFinite(input.sourcePx.x)||!Number.isFinite(input.sourcePx.y))
    throw new GeometryError("Select a finite source-image point first");
  if(input.kind!=="fraction"&&input.kind!=="edge_offset_mm")
    throw new GeometryError("Choose a supported relationship");
  if(input.kind==="edge_offset_mm"&&
    !["left","right","top","bottom"].includes(input.edge))
    throw new GeometryError("Choose a physical edge");
  if(typeof input.toleranceMm!=="number"||
    !Number.isFinite(input.toleranceMm)||input.toleranceMm<=0||input.toleranceMm>50)
    throw new GeometryError("Tolerance must be within 0–50 mm");
  const copy=structuredClone(demo);
  let i=1;
  const ids=new Set(copy.landmarks.map(m=>m.id));
  while(ids.has("authored-"+i))i++;
  copy.landmarks.push({
    id:"authored-"+i,label:input.label.trim(),
    sourcePx:{x:input.sourcePx.x,y:input.sourcePx.y},
    kind:input.kind,
    ...(input.kind==="edge_offset_mm"?{edge:input.edge}:{}),
    toleranceMm:input.toleranceMm,
    why:String(input.why||"Human-authored relationship; review against the demonstration.").slice(0,350)
  });
  const derived=derive(copy);
  const target=adapt(derived,widthMm,heightMm);
  return {demo:copy,derived,target,selected:copy.landmarks.length-1};
}
