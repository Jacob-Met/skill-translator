import {validateSequence} from './demonstration-sequence.mjs';

const check=(ok,message)=>{if(!ok)throw Error(message);};
export function receiveWholeFrameContours(sequence,raw){
  check(raw?.format==='skill-translator.whole-frame-contours/v1'&&raw.scope==='whole-original-frame'&&raw.roi===undefined,'Explicit whole-original-frame report required');
  const source=validateSequence(sequence),moment=source.moments.find(m=>m.id===raw.momentId);
  check(moment&&JSON.stringify(moment.image)===JSON.stringify(raw.image)&&JSON.stringify(moment.origin)===JSON.stringify(raw.origin),'Whole report differs from original source identity');
  const x=0,y=0,w=moment.image.widthPx,h=moment.image.heightPx;
  const edge={field:raw.field,roi:[x,y,w,h]},field=receiveWholeFrameField(raw.field,edge.roi);
  const method=raw.method;
  check(method?.name==='opencv-whole-frame-canny-contours/v1'&&method.sourceDecode==='unchanged-u8-opaque'&&method.cannyLow===50&&method.cannyHigh===150&&method.aperture===3&&method.l2Gradient===true&&method.retrieval==='RETR_TREE'&&method.approximation==='CHAIN_APPROX_NONE'&&method.maximumPixels===2097152,'Unsupported whole-frame method');
  check(['opencvVersion','numpyVersion'].every(k=>typeof method[k]==='string'&&method[k].trim()&&method[k].length<=80),'Native runtime identity required');
  check(Array.isArray(raw.chains)&&raw.chains.length<=4096,'Complete contour list exceeds capacity');
  let total=0;const visited=new Uint8Array(w*h);
  for(const [i,chain] of raw.chains.entries()){
    check(chain?.id===i&&Array.isArray(chain.points)&&chain.points.length>0,'Ordered nonempty native walks required');
    total+=chain.points.length;check(total<=131072,'Complete contour vertices exceed capacity');
    check(Array.isArray(chain.hierarchy)&&chain.hierarchy.length===4&&chain.hierarchy.every(v=>Number.isInteger(v)&&v>=-1&&v<raw.chains.length&&v!==i),'Invalid native hierarchy references');
    for(let j=0;j<chain.points.length;j++){
      const p=chain.points[j],q=chain.points[(j+1)%chain.points.length];
      check(Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger)&&p[0]>=x&&p[0]<x+w&&p[1]>=y&&p[1]<y+h,'Contour vertex leaves original ROI');
      const k=(p[1]-y)*w+p[0]-x;
      check(field[k>>3]&(1<<(k&7)),'Contour vertex is absent from retained edge field');
      check(Array.isArray(q)&&q.length===2&&Math.max(Math.abs(p[0]-q[0]),Math.abs(p[1]-q[1]))<=1,'Native contour walk is not lattice-adjacent');
      visited[k]=1;
    }
  }
  for(const chain of raw.chains){
    const [next,previous,child,parent]=chain.hierarchy;
    if(next!==-1)check(raw.chains[next].hierarchy[1]===chain.id&&raw.chains[next].hierarchy[3]===parent,'Native sibling references disagree');
    if(previous!==-1)check(raw.chains[previous].hierarchy[0]===chain.id&&raw.chains[previous].hierarchy[3]===parent,'Native sibling references disagree');
    if(child!==-1)check(raw.chains[child].hierarchy[3]===chain.id,'Native child reference disagrees');
    const seen=new Set([chain.id]);let p=parent;
    while(p!==-1){check(!seen.has(p),'Cyclic native contour parent');seen.add(p);p=raw.chains[p].hierarchy[3];}
  }
  const coverage=raw.coverage;
  check(coverage&&Number.isSafeInteger(coverage.omittedEdgePixels)&&coverage.omittedEdgePixels>=0,'Contour coverage required');
  const omitted=receiveWholeFrameField({encoding:'roi-row-major-lsb0/v1',data:coverage.omittedField,count:coverage.omittedEdgePixels},edge.roi);
  let count=0;
  for(let k=0;k<w*h;k++){
    count+=visited[k];
    check(Boolean(omitted[k>>3]&(1<<(k&7)))===(Boolean(field[k>>3]&(1<<(k&7)))&&!visited[k]),'Omitted field differs from exact contour coverage');
  }
  check(coverage.edgePixels===edge.field.count&&coverage.visitedEdgePixels===count&&count+coverage.omittedEdgePixels===edge.field.count,'Contour coverage totals differ');
  return structuredClone(raw);
}

export function receiveWholeFrameField(field,roi){
 const [x,y,w,h]=roi,area=w*h;
 check(x===0&&y===0&&[w,h].every(v=>Number.isSafeInteger(v)&&v>=3&&v<=8192)&&area<=2097152,'Whole original raster exceeds explicit capacity');
 const size=Math.ceil(area/8);
 check(field?.encoding==='roi-row-major-lsb0/v1'&&typeof field.data==='string'&&field.data.length===4*Math.ceil(size/3),'Complete whole-frame field required');
 let decoded;try{decoded=atob(field.data);}catch{throw Error('Invalid field encoding');}
 check(decoded.length===size&&btoa(decoded)===field.data,'Canonical whole-frame field required');
 const bytes=Uint8Array.from(decoded,c=>c.charCodeAt(0));
 check(!(area%8&&(bytes.at(-1)>>(area%8))),'Whole-frame padding must be zero');
 let count=0;for(const byte of bytes){let n=byte;while(n){n&=n-1;count++;}}
 check(count===field.count,'Whole-frame pixel count differs');return bytes;
}

/** Selected original bytes only; no orientation or animation is silently normalized. */
export function inspectWholeFramePng(bytes){
 check(bytes instanceof Uint8Array&&bytes.length>=24&&bytes.length<=16*1024*1024,'Bounded original PNG bytes required');
 check([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v),'Original PNG required');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 let at=8;
 while(at<bytes.length){
  check(at+12<=bytes.length,'Truncated PNG chunk');
  const length=view.getUint32(at),kind=String.fromCharCode(...bytes.subarray(at+4,at+8));
  check(at+12+length<=bytes.length,'Truncated PNG chunk');
  check(kind!=='eXIf'&&kind!=='acTL','EXIF-oriented or animated PNG needs an explicit source interpretation');
  at+=12+length;if(kind==='IEND')break;
 }
}
