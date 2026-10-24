// Competing *authored* interpretations of the same 2D observed landmark.
// Predictions are geometric counterfactuals, never causal or learning claims.
import {GeometryError} from "./geometry.mjs";
const edges=["left","right","top","bottom"];
function position(mark, source, widthMm, heightMm, candidate){
  if(!Number.isFinite(widthMm)||!Number.isFinite(heightMm)||
    widthMm<1||heightMm<1||widthMm>10000||heightMm>10000)
    throw new GeometryError("Invalid workpiece dimensions");
  if(candidate==="fraction")
    return {xMm:mark.uv.u*widthMm,yMm:mark.uv.v*heightMm};
  if(!edges.includes(candidate))throw new GeometryError("Unknown alternative rule");
  const sw=source.widthMm,sh=source.heightMm;
  const dist=candidate==="left"?mark.uv.u*sw:
    candidate==="right"?(1-mark.uv.u)*sw:
    candidate==="top"?mark.uv.v*sh:(1-mark.uv.v)*sh;
  const available=["left","right"].includes(candidate)?widthMm:heightMm;
  if(dist>available)throw new GeometryError(
    "Alternative physical clearance cannot fit the proposed workpiece");
  return {xMm:candidate==="left"?dist:candidate==="right"?widthMm-dist:mark.uv.u*widthMm,
          yMm:candidate==="top"?dist:candidate==="bottom"?heightMm-dist:mark.uv.v*heightMm};
}
function original(mark,source,w,h){
  const mode=mark.kind==="fraction"?"fraction":mark.edge;
  return position(mark,source,w,h,mode);
}
export function compareInterpretations(mark,source,widthMm,heightMm,alternative){
  if(alternative===(mark.kind==="fraction"?"fraction":mark.edge))
    throw new GeometryError("Choose a different interpretation for comparison");
  const primary=original(mark,source,widthMm,heightMm);
  const rival=position(mark,source,widthMm,heightMm,alternative);
  const separationMm=Math.hypot(primary.xMm-rival.xMm,primary.yMm-rival.yMm);
  return {primary,rival,separationMm,
    distinguishableByMark:separationMm>mark.toleranceMm*2,
    alternative};
}
// One transparent hypothetical dimension-change candidate, not acquisition advice.
// Look at both axes; keep observed source and authored tolerances unchanged.
export function proposeVariation(mark,source,alternative){
  const widths=[source.widthMm*0.7,source.widthMm*1.3,source.widthMm*1.7];
  const heights=[source.heightMm*0.7,source.heightMm*1.3,source.heightMm*1.7];
  let best=null;
  for(const [w,h] of [
    ...widths.map(w=>[w,source.heightMm]),
    ...heights.map(h=>[source.widthMm,h]),
    [source.widthMm*1.4,source.heightMm*1.4]
  ]){
    try{
      const result=compareInterpretations(mark,source,w,h,alternative);
      if(!best||result.separationMm>best.separationMm)
        best={widthMm:w,heightMm:h,...result};
    }catch(e){if(!(e instanceof GeometryError))throw e;}
  }
  if(!best)throw new GeometryError("No valid bounded geometric comparison could be formed");
  return best;
}
