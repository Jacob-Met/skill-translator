import {analyzePixels, PIXEL_VERSION} from '../vendor/microverse/pixel-observations.mjs';

/** Image geometry proposal only. No workpiece identity or physical scale. */
export const PHOTO_CORNERS_VERSION = 'skill-translator.photo-corners/v1';
export const PHOTO_CORNERS_LIMITS = Object.freeze({pixels: 1_048_576, side: 1024, candidates: 8});
const cross = (o,a,b) => (a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
const area = p => Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-a.y*b.x;},0))/2;
const distance = (p,a,b) => {
  const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
};
function hull(points) {
  points.sort((a,b)=>a.x-b.x||a.y-b.y);
  const lower=[],upper=[];
  for(const p of points){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
  for(let i=points.length-1;i>=0;i--){const p=points[i];while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
  lower.pop();upper.pop();return lower.concat(upper);
}
function simplifyOpen(points,epsilon) {
  const stack=[[0,points.length-1]],keep=new Set([0,points.length-1]);
  while(stack.length){
    const [a,b]=stack.pop();let best=epsilon,index=-1;
    for(let i=a+1;i<b;i++){const d=distance(points[i],points[a],points[b]);if(d>best){best=d;index=i;}}
    if(index>=0){keep.add(index);stack.push([a,index],[index,b]);}
  }
  return [...keep].sort((a,b)=>a-b).map(i=>points[i]);
}
function quadrilateral(points) {
  if(points.length<4)return null;
  // Start at a diameter extreme: a leftmost raster point can lie mid-edge.
  let start=0;
  for(let i=1;i<points.length;i++)if(Math.hypot(points[i].x-points[0].x,points[i].y-points[0].y)>Math.hypot(points[start].x-points[0].x,points[start].y-points[0].y))start=i;
  points=points.slice(start).concat(points.slice(0,start));
  // Split the closed hull at a distant vertex, avoiding an arbitrary closing seam.
  let opposite=1;
  for(let i=2;i<points.length;i++)if(Math.hypot(points[i].x-points[0].x,points[i].y-points[0].y)>Math.hypot(points[opposite].x-points[0].x,points[opposite].y-points[0].y))opposite=i;
  const perimeter=points.reduce((s,p,i)=>s+Math.hypot(p.x-points[(i+1)%points.length].x,p.y-points[(i+1)%points.length].y),0);
  const epsilon=Math.max(1,perimeter*.012);
  const q=simplifyOpen(points.slice(0,opposite+1),epsilon).slice(0,-1)
    .concat(simplifyOpen(points.slice(opposite).concat(points[0]),epsilon).slice(0,-1));
  if(q.length!==4||area(q)/area(points)<.94||q.some((p,i)=>Math.hypot(p.x-q[(i+1)%4].x,p.y-q[(i+1)%4].y)<12))return null;
  let first=0;for(let i=1;i<4;i++)if(q[i].x+q[i].y<q[first].x+q[first].y)first=i;
  return q.slice(first).concat(q.slice(0,first));
}
function thresholdFor(data) {
  const bins=new Uint32Array(256);let total=0,sum=0;
  for(let i=0;i<data.length;i+=4){if(data[i+3]!==255)throw Error('Corner proposals require an opaque image; manual corners remain available.');const v=Math.round((77*data[i]+150*data[i+1]+29*data[i+2])/256);bins[v]++;sum+=v;total++;}
  let weight=0,leftSum=0,best=-1,first=0,last=0;
  for(let i=0;i<255;i++){weight+=bins[i];leftSum+=i*bins[i];if(!weight||weight===total)continue;
    const difference=leftSum/weight-(sum-leftSum)/(total-weight),score=weight*(total-weight)*difference*difference;
    if(score>best){best=score;first=last=i;}else if(score===best)last=i;
  }
  return {threshold:(first+last)/2+.5,contrast:best>0?Math.sqrt(best/(total*total)):0};
}
function sideSupport(corners,labels,label,width,height) {
  return corners.map((a,i)=>{
    const b=corners[(i+1)%4],count=Math.max(12,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2));
    let supported=0;
    for(let k=0;k<count;k++){
      const t=(k+.5)/count,x=Math.floor(a.x+(b.x-a.x)*t),y=Math.floor(a.y+(b.y-a.y)*t);let found=false;
      for(let dy=-2;dy<=2&&!found;dy++)for(let dx=-2;dx<=2;dx++){
        const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<width&&ny<height&&labels[ny*width+nx]===label){found=true;break;}
      }
      if(found)supported++;
    }
    return supported/count;
  });
}
export function proposePhotoCorners(image) {
  const {width,height,data}=image??{};
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<16||height<16||width>1024||height>1024||
    width*height>PHOTO_CORNERS_LIMITS.pixels||!(data instanceof Uint8Array||data instanceof Uint8ClampedArray)||data.length!==width*height*4)
    throw Error('Supply an opaque RGBA analysis raster from 16 to 1024 pixels per side.');
  const {threshold,contrast}=thresholdFor(data),candidates=[],rejected={boundary:0,shape:0,small:0};
  if(contrast<8)return {version:PHOTO_CORNERS_VERSION,kernel:PIXEL_VERSION,width,height,threshold,contrast,candidates,rejected,omitted:0};
  for(const profile of [{method:'global',threshold},{method:'local-contrast',threshold:16},{method:'local-contrast',threshold:8,fallback:true}]){
    // Weak local contrast can outline an exterior halo around an already clear
    // edge. Use it only when the original passes found no selectable outline.
    if(profile.fallback&&candidates.length)break;
    for(const polarity of ['bright','dark']){
    const {method}=profile;
    const analysis=analyzePixels(image,{method,polarity,threshold:profile.threshold,radius:24,minArea:Math.max(64,Math.ceil(width*height*.001)),maxArea:width*height});
    const eligible=new Map();
    for(const c of analysis.components){
      if(!c.accepted){rejected.small++;continue;}if(c.touchesBoundary){rejected.boundary++;continue;}
      eligible.set(c.label,{component:c,points:[]});
    }
    // Two row extrema suffice for the exact convex hull of each pixel-cell union.
    for(let y=0;y<height;y++){
      const spans=new Map();
      for(let x=0;x<width;x++){const label=analysis.labels[y*width+x];if(!eligible.has(label))continue;const span=spans.get(label);if(span)span[1]=x;else spans.set(label,[x,x]);}
      for(const [label,[left,right]] of spans)eligible.get(label).points.push({x:left,y},{x:right+1,y},{x:left,y:y+1},{x:right+1,y:y+1});
    }
    for(const {component,points} of eligible.values()){
      const outline=hull(points),hullArea=area(outline),corners=quadrilateral(outline);
      if(!corners||hullArea<width*height*.01){rejected.shape++;continue;}
      const fill=component.area/hullArea,support=sideSupport(corners,analysis.labels,component.label,width,height);
      // Sparse printed grids and outlined boards are useful only when every
      // proposed side is supported by the same observed connected component.
      if(fill<.85&&(fill<.035||support.some(value=>value<.92))){rejected.shape++;continue;}
      const candidate={polarity,method,settings:{...analysis.settings},corners,areaPx:component.area,outlineAreaPx:area(corners),coverage:area(corners)/(width*height),fill,sideSupport:support};
      const duplicate=candidates.findIndex(c=>c.corners.every((p,i)=>Math.hypot(p.x-corners[i].x,p.y-corners[i].y)<5));
      if(duplicate<0)candidates.push(candidate);
      else if(Math.min(...support)>Math.min(...candidates[duplicate].sideSupport))candidates[duplicate]=candidate;
    }
    }
  }
  candidates.sort((a,b)=>b.outlineAreaPx-a.outlineAreaPx||a.corners[0].y-b.corners[0].y||a.corners[0].x-b.corners[0].x);
  const omitted=Math.max(0,candidates.length-PHOTO_CORNERS_LIMITS.candidates);
  return {version:PHOTO_CORNERS_VERSION,kernel:PIXEL_VERSION,width,height,threshold,contrast,
    candidates:candidates.slice(0,PHOTO_CORNERS_LIMITS.candidates).map((c,i)=>({...c,id:'outline-'+(i+1)})),rejected,omitted};
}
export function originalPhotoCorners(candidate,analysisWidth,analysisHeight,originalWidth,originalHeight,rotation=0) {
  if(!candidate?.corners||candidate.corners.length!==4||![analysisWidth,analysisHeight,originalWidth,originalHeight].every(x=>Number.isInteger(x)&&x>0)||!Number.isInteger(rotation))throw Error('A complete image-bound proposal is required.');
  const points=candidate.corners.map(p=>({x:p.x*originalWidth/analysisWidth,y:p.y*originalHeight/analysisHeight}));
  const start=((rotation%4)+4)%4;return points.slice(start).concat(points.slice(0,start));
}
