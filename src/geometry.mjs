// Physical landmark transfer from an explicitly annotated planar demonstration.
// Pure geometry: never infers unobserved force, contact, or acquired skill.
export class GeometryError extends Error {
  constructor(message) { super(message); this.name = "GeometryError"; }
}
const finite = x => typeof x === "number" && Number.isFinite(x);
function assert(value, message) { if (!value) throw new GeometryError(message); }
function dimension(x, label) {
  assert(finite(x) && x >= 1 && x <= 10000, label + " must be 1–10,000 mm");
  return x;
}
function point(p, label) {
  assert(p && finite(p.x) && finite(p.y) && Math.abs(p.x) <= 1e7 && Math.abs(p.y) <= 1e7,
    label + " must be a finite point");
  return p;
}
function cross(a,b,c) {
  return (b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
}
function solve8(rows, values) {
  const a = rows.map((row,i)=>[...row,values[i]]);
  const scales = a.map(row=>Math.max(...row.slice(0,8).map(Math.abs)));
  for(let j=0;j<8;j++){
    let pivot=j;
    for(let i=j+1;i<8;i++)
      if(Math.abs(a[i][j])/scales[i]>Math.abs(a[pivot][j])/scales[pivot]) pivot=i;
    assert(scales[pivot]>0 && Math.abs(a[pivot][j])/scales[pivot]>1e-12,
      "These four corners cannot calibrate the pictured page");
    [a[j],a[pivot]]=[a[pivot],a[j]];
    [scales[j],scales[pivot]]=[scales[pivot],scales[j]];
    const d=a[j][j];
    for(let k=j;k<9;k++) a[j][k]/=d;
    for(let i=0;i<8;i++){
      if(i===j) continue;
      const f=a[i][j];
      for(let k=j;k<9;k++) a[i][k]-=f*a[j][k];
    }
  }
  return a.map(row=>row[8]);
}
function imagePoint(h,u,v){
  const d=h[6]*u+h[7]*v+1;
  assert(finite(d)&&Math.abs(d)>1e-10,"Perspective transform has a singular location");
  return point({x:(h[0]*u+h[1]*v+h[2])/d,
                y:(h[3]*u+h[4]*v+h[5])/d},"Projected point");
}
// Corner order is clockwise: TL, TR, BR, BL.
export function calibrate(corners){
  assert(Array.isArray(corners)&&corners.length===4,
    "Supply four page corners in TL, TR, BR, BL order");
  corners.forEach((p,i)=>point(p,"Corner "+(i+1)));
  const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y);
  const span=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
  assert(span>1e-5,"The page corners have no usable extent");
  const turns=corners.map((p,i)=>cross(p,corners[(i+1)%4],corners[(i+2)%4]));
  assert(turns.every(t=>t>span*span*1e-5)||turns.every(t=>t< -span*span*1e-5),
    "Page corners must form a noncollapsed convex quadrilateral in order");
  const uv=[[0,0],[1,0],[1,1],[0,1]],rows=[],values=[];
  uv.forEach(([u,v],i)=>{
    const {x,y}=corners[i];
    rows.push([u,v,1,0,0,0,-x*u,-x*v]);values.push(x);
    rows.push([0,0,0,u,v,1,-y*u,-y*v]);values.push(y);
  });
  const h=solve8(rows,values);
  uv.forEach(([u,v],i)=>{
    const p=imagePoint(h,u,v);
    assert(Math.hypot(p.x-corners[i].x,p.y-corners[i].y)<span*1e-6,
      "Page calibration has excessive reprojection error");
  });
  return h;
}
export function toImage(h,u,v){
  assert(finite(u)&&finite(v),"Normalized location must be finite");
  return imagePoint(h,u,v);
}
export function fromImage(h,p){
  point(p,"Source annotation");
  assert(Array.isArray(h)&&h.length===8&&h.every(finite),"Invalid calibration");
  const [a,b,c,d,e,f,g,k]=h;
  const A=a-p.x*g,B=b-p.x*k,C=p.x-c;
  const D=d-p.y*g,E=e-p.y*k,F=p.y-f;
  const det=A*E-B*D;
  assert(finite(det)&&Math.abs(det)>1e-12,
    "Source position cannot be mapped back into the page");
  const u=(C*E-B*F)/det,v=(A*F-C*D)/det;
  assert(finite(u)&&finite(v),"Source position maps to an invalid location");
  return {u,v};
}
function normalizedInPage(uv,label){
  assert(uv.u>=-1e-8&&uv.u<=1+1e-8&&uv.v>=-1e-8&&uv.v<=1+1e-8,
    label+" is outside the annotated source page");
  return {u:Math.max(0,Math.min(1,uv.u)),v:Math.max(0,Math.min(1,uv.v))};
}
export function derive(demo){
  assert(demo&&demo.source&&Array.isArray(demo.landmarks),"Invalid annotated demonstration");
  const width=dimension(demo.source.widthMm,"Source width");
  const height=dimension(demo.source.heightMm,"Source height");
  const h=calibrate(demo.source.corners);
  assert(demo.landmarks.length>0&&demo.landmarks.length<=30,
    "A demonstration must have 1–30 landmarks");
  const ids=new Set();
  const landmarks=demo.landmarks.map(mark=>{
    assert(mark&&typeof mark.id==="string"&&/^[a-z0-9-]{1,32}$/.test(mark.id)&&!ids.has(mark.id),
      "Every landmark needs a distinct stable id");
    ids.add(mark.id);
    assert(typeof mark.label==="string"&&mark.label.length>0&&mark.label.length<=100,
      "Landmark needs a short label");
    assert(finite(mark.toleranceMm)&&mark.toleranceMm>0&&mark.toleranceMm<=50,
      "Landmark tolerance must be positive and at most 50 mm");
    const uv=normalizedInPage(fromImage(h,point(mark.sourcePx,mark.label)),mark.label);
    assert(mark.kind==="fraction"||mark.kind==="edge_offset_mm",
      "Unknown landmark relationship");
    let edge=null,distanceMm=null;
    if(mark.kind==="edge_offset_mm"){
      edge=mark.edge;
      assert(["left","right","top","bottom"].includes(edge),"Invalid physical edge");
      distanceMm=edge==="left"?uv.u*width:
        edge==="right"?(1-uv.u)*width:
        edge==="top"?uv.v*height:(1-uv.v)*height;
    }
    return Object.freeze({...mark,uv,edge,distanceMm});
  });
  return Object.freeze({source:demo.source,h,landmarks,
    provenance:demo.provenance||"Authored annotation"});
}
export function adapt(derived,widthMm,heightMm){
  const w=dimension(widthMm,"Target width"),ht=dimension(heightMm,"Target height");
  assert(derived&&Array.isArray(derived.landmarks),"Derive the annotated demonstration first");
  const landmarks=derived.landmarks.map(mark=>{
    let xMm=mark.uv.u*w,yMm=mark.uv.v*ht;
    if(mark.kind==="edge_offset_mm"){
      const dist=mark.distanceMm;
      const available=mark.edge==="left"||mark.edge==="right"?w:ht;
      assert(dist<=available,mark.label+": "+dist.toFixed(1)
        +" mm clearance cannot fit a "+available.toFixed(1)+" mm workpiece");
      if(mark.edge==="left")xMm=dist;
      if(mark.edge==="right")xMm=w-dist;
      if(mark.edge==="top")yMm=dist;
      if(mark.edge==="bottom")yMm=ht-dist;
    }
    return Object.freeze({...mark,xMm,yMm});
  });
  return Object.freeze({widthMm:w,heightMm:ht,landmarks});
}
export function toDisplay(mmPoint,target,box,mirrored=false){
  point({x:mmPoint.xMm,y:mmPoint.yMm},"Physical position");
  const x=mmPoint.xMm/target.widthMm,y=mmPoint.yMm/target.heightMm;
  return {x:box.x+(mirrored?1-x:x)*box.width,y:box.y+y*box.height};
}
export function fromDisplay(displayPoint,target,box,mirrored=false){
  point(displayPoint,"Display position");
  assert(box.width>0&&box.height>0,"Invalid display workpiece rectangle");
  const u=(displayPoint.x-box.x)/box.width;
  return {xMm:(mirrored?1-u:u)*target.widthMm,
          yMm:(displayPoint.y-box.y)/box.height*target.heightMm};
}
export function evaluate(mark,attempt){
  assert(mark&&finite(mark.xMm)&&finite(mark.yMm)&&finite(mark.toleranceMm),
    "Invalid target landmark");
  point({x:attempt?.xMm,y:attempt?.yMm},"Learner attempt");
  const dxMm=attempt.xMm-mark.xMm,dyMm=attempt.yMm-mark.yMm;
  const errorMm=Math.hypot(dxMm,dyMm);
  return {within:errorMm<=mark.toleranceMm+1e-9,errorMm,dxMm,dyMm,
    toleranceMm:mark.toleranceMm};
}
