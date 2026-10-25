/** Complete ROI edge pixels, row-major bits with least-significant bit first.
 * The field is detector evidence, not a semantic boundary or confidence map. */
export const EDGE_FIELD_ENCODING='roi-row-major-lsb0/v1';
export function receiveEdgeField(field,roi){
 const [,,w,h]=roi,area=w*h;
 if(!Number.isSafeInteger(area)||area<9||area>1048576)throw Error('Invalid edge field area');
 const size=Math.ceil(area/8),encoded=4*Math.ceil(size/3);
 if(field?.encoding!==EDGE_FIELD_ENCODING||typeof field.data!=='string'||field.data.length!==encoded)throw Error('Unsupported or incomplete edge field');
 let decoded;try{decoded=atob(field.data);}catch{throw Error('Invalid edge field base64');}
 if(decoded.length!==size||btoa(decoded)!==field.data)throw Error('Edge field requires canonical complete bytes');
 const bytes=Uint8Array.from(decoded,c=>c.charCodeAt(0));
 if(area%8&&(bytes.at(-1)>>(area%8)))throw Error('Edge field padding must be zero');
 let count=0;for(const byte of bytes){let n=byte;while(n){n&=n-1;count++;}}
 if(count!==field.count)throw Error('Edge field pixel count differs');
 return bytes;
}
export function edgeFieldSupport(bytes,roi,a,b){
 const [x,y,w,h]=roi,ax=a.x-x,ay=a.y-y,bx=b.x-x,by=b.y-y,dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;
 if(!l2)throw Error('Support requires distinct endpoints');
 const horizontal=Math.abs(dx)>=Math.abs(dy),start=horizontal?ax:ay,end=horizontal?bx:by;
 // Perpendicular distance<=2 implies |secondary-line|<=2*sqrt(2)<3
 // when the primary axis is dominant. Integer predicates decide membership;
 // interpolation only selects a conservative scan strip with a spare cell.
 const first=Math.max(0,Math.min(start,end)-3),last=Math.min((horizontal?w:h)-1,Math.max(start,end)+3),indices=[];
 for(let u=first;u<=last;u++){
  const v=(horizontal?ay:ax)+(u-start)*(horizontal?dy/dx:dx/dy);
  for(let q=Math.max(0,Math.floor(v-3)-1);q<=Math.min((horizontal?h:w)-1,Math.ceil(v+3)+1);q++){
   const px=horizontal?u:q,py=horizontal?q:u,k=py*w+px;
   if(!(bytes[k>>3]&(1<<(k&7))))continue;
   const dot=(px-ax)*dx+(py-ay)*dy,cross=(px-ax)*dy-(py-ay)*dx;
   if(dot>=0&&dot<=l2&&cross*cross<=4*l2)indices.push(k);
  }
 }
 return indices.sort((a,b)=>a-b);
}
