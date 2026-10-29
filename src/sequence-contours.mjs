import {receiveSequenceEdge} from './sequence-edge.mjs';
import {receiveEdgeField} from './sequence-edge-field.mjs';

const check=(ok,message)=>{if(!ok)throw Error(message);};
export function receiveSequenceContours(sequence,raw){
  check(raw?.format==='skill-translator.sequence-contour-report/v1','Open a contour report');
  const edge=receiveSequenceEdge(sequence,raw.edgeReport);
  check(edge.format==='skill-translator.sequence-edge-report/v2','Complete original edge field required');
  const [x,y,w,h]=edge.roi, field=receiveEdgeField(edge.field,edge.roi);
  const method=raw.method;
  check(method?.name==='opencv-pixel-contours/v1'&&method.retrieval==='RETR_TREE'&&method.approximation==='CHAIN_APPROX_NONE'&&method.opencvVersion===edge.method.opencvVersion,'Unsupported contour method');
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
  const omitted=receiveEdgeField({encoding:'roi-row-major-lsb0/v1',data:coverage.omittedField,count:coverage.omittedEdgePixels},edge.roi);
  let count=0;
  for(let k=0;k<w*h;k++){
    count+=visited[k];
    check(Boolean(omitted[k>>3]&(1<<(k&7)))===(Boolean(field[k>>3]&(1<<(k&7)))&&!visited[k]),'Omitted field differs from exact contour coverage');
  }
  check(coverage.edgePixels===edge.field.count&&coverage.visitedEdgePixels===count&&count+coverage.omittedEdgePixels===edge.field.count,'Contour coverage totals differ');
  return structuredClone(raw);
}
