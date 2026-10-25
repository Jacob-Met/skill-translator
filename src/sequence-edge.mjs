import {receiveEdgeField,edgeFieldSupport} from './sequence-edge-field.mjs';
import {validateSequence} from './demonstration-sequence.mjs';
export const EDGE_REPORT='skill-translator.sequence-edge-report/v1';
export const EDGE_FIELD_REPORT='skill-translator.sequence-edge-report/v2';
export const EDGE_ACCOUNT='skill-translator.sequence-edge-account/v1';
const check=(ok,msg)=>{if(!ok)throw Error(msg);},same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const text=(v,max,label)=>{check(typeof v==='string'&&v.trim()&&v.length<=max,label+' requires bounded text');return v.trim();};
export function receiveSequenceEdge(sequence,raw){
 const source=validateSequence(sequence);const compact=raw?.format===EDGE_FIELD_REPORT;check(raw?.format===EDGE_REPORT||compact,'Open a supported source-edge report');
 const moment=source.moments.find(m=>m.id===raw.momentId);check(moment,'Report moment is absent from original sequence');
 check(same(raw.image,moment.image)&&same(raw.origin,moment.origin),'Report image or presented-frame identity differs from original source');
 const roi=raw.roi;check(Array.isArray(roi)&&roi.length===4&&roi.every(Number.isSafeInteger),'Declare integer ROI coordinates');const[x,y,w,h]=roi;
 check(x>=0&&y>=0&&w>=3&&h>=3&&x+w<=moment.image.widthPx&&y+h<=moment.image.heightPx&&w*h<=1048576,'ROI leaves source or capacity');
 const method=raw.method;check(method?.name==='opencv-canny-hough-segments/v1'&&method.sourceDecode==='unchanged-u8-opaque'&&method.cannyLow===50&&method.cannyHigh===150&&method.aperture===3&&method.l2Gradient===true&&method.rhoPx===1&&method.thetaRadians===Math.PI/180&&method.votes===40&&method.minimumLengthPx===80&&method.maximumGapPx===10,'Unsupported proposal settings');
 text(method.opencvVersion,80,'OpenCV version');text(method.numpyVersion,80,'NumPy version');
 let field;if(compact){check(raw.points===undefined,'Compact report must retain one complete field');field=receiveEdgeField(raw.field,roi);}else { check(Array.isArray(raw.points)&&raw.points.length<=20000,'Complete edge cloud exceeds capacity');const seen=new Set();for(const p of raw.points){check(Number.isSafeInteger(p?.x)&&Number.isSafeInteger(p.y)&&p.x>=x&&p.y>=y&&p.x<x+w&&p.y<y+h,'Edge point outside ROI');const k=p.x+','+p.y;check(!seen.has(k),'Duplicate edge pixel');seen.add(k);}}
 check(Array.isArray(raw.candidates)&&raw.candidates.length<=256,'Complete candidate list exceeds capacity');const ids=new Set();for(const c of raw.candidates){check(typeof c.id==='string'&&!ids.has(c.id)&&c.id.length<=80,'Unique segment identity required');ids.add(c.id);for(const p of [c.a,c.b])check(Number.isSafeInteger(p?.x)&&Number.isSafeInteger(p.y)&&p.x>=x&&p.y>=y&&p.x<x+w&&p.y<y+h,'Candidate endpoint outside ROI');const dx=c.b.x-c.a.x,dy=c.b.y-c.a.y,length=Math.hypot(dx,dy);check(length>=80&&Number.isFinite(c.lengthPx)&&Math.abs(c.lengthPx-length)<=1e-9&&c.supportBandPx===2,'Candidate length or support convention differs');
 // Integer predicates: ROI area<=2^20 bounds |cross|<2^21, so its square is exact below2^42.
 if(compact){check(c.supportIndices===undefined,'Compact support uses exact recomputed count');check(edgeFieldSupport(field,roi,c.a,c.b).length===c.supportCount,'Reported support does not match retained edge field');}else { const support=[];raw.points.forEach((p,i)=>{const along=(p.x-c.a.x)*dx+(p.y-c.a.y)*dy,cross=(p.x-c.a.x)*dy-(p.y-c.a.y)*dx,squaredLength=dx*dx+dy*dy;if(along>=0&&along<=squaredLength&&cross*cross<=4*squaredLength)support.push(i);});check(same(support,c.supportIndices),'Reported support does not match retained edge cloud');}const near=[c.a,c.b].some(p=>p.x-x<=1||p.x-x>=w-2||p.y-y<=1||p.y-y>=h-2);check(c.roiBoundaryNear===near,'ROI clipping flag differs');}
 return structuredClone(raw);
}
export function createSequenceEdge(sequence,report,selection){
 const source=validateSequence(sequence),accepted=receiveSequenceEdge(source,report);
 check(selection&&['unreviewed','selected','rejected'].includes(selection.status),'Declare review disposition');
 let normalized={status:selection.status,segmentId:null,label:'',basis:'',identity:'unspecified'};
 if(selection.status!=='unreviewed'){normalized.basis=text(selection.basis,1600,'Review basis');if(selection.status==='selected'){check(accepted.candidates.some(c=>c.id===selection.segmentId),'Select an existing candidate');check(['unspecified','new-boundary'].includes(selection.identity),'Declare boundary identity without assumed persistence');normalized={...normalized,segmentId:selection.segmentId,label:text(selection.label,160,'Visible feature label'),identity:selection.identity};}}
 return {format:EDGE_ACCOUNT,sequence:source,report:accepted,selection:normalized};
}
export function importSequenceEdge(raw){check(raw?.format===EDGE_ACCOUNT,'Open a source-edge account');return createSequenceEdge(raw.sequence,raw.report,raw.selection);}
