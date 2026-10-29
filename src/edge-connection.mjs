/** Exact shortest eight-neighbour support in a caller-admitted original binary edge field. */
export function traceEdgeConnection(field,width,height,start,end,{maxVisits=8*width*height}={}){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>2097152)throw Error('Complete original field exceeds capacity');
 const size=width*height;
 if(!(field instanceof Uint8Array)||field.length!==Math.ceil(size/8))throw Error('Complete packed binary edge field required');
 if(size%8&&(field.at(-1)>>(size%8)))throw Error('Unused field bits must be zero');
 if(!Number.isSafeInteger(maxVisits)||maxVisits<0||maxVisits>8*size)throw Error('Declare a bounded neighbour-visit allowance');
 const present=i=>Boolean(field[i>>3]&(1<<(i&7)));
 const index=p=>{if(!Array.isArray(p)||p.length!==2||!p.every(Number.isSafeInteger)||p[0]<0||p[0]>=width||p[1]<0||p[1]>=height)throw Error('Select exact original pixel coordinates');const i=p[1]*width+p[0];if(!present(i))throw Error('Selected pixel is absent from the retained edge field; no snapping performed');return i;};
 const a=index(start),b=index(end),previous=new Int32Array(size).fill(-2),queue=new Int32Array(size);let head=0,tail=1,visits=0;queue[0]=a;previous[a]=-1;
 while(head<tail){const i=queue[head++];if(i===b)break;const x=i%width,y=Math.floor(i/width);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(dx===0&&dy===0)continue;
   if(++visits>maxVisits)throw Error('Complete connection inquiry exceeds declared neighbour-visit allowance; no partial answer');
   const xx=x+dx,yy=y+dy;if(xx<0||xx>=width||yy<0||yy>=height)continue;const j=yy*width+xx;
   if(present(j)&&previous[j]===-2){previous[j]=i;queue[tail++]=j;}
  }
 }
 const connected=previous[b]!==-2,path=[];
 if(connected){let i=b;while(i!==-1){path.push([i%width,Math.floor(i/width)]);i=previous[i];}path.reverse();}
 return {status:connected?'connected':'disconnected',start:[...start],end:[...end],minimumSteps:connected?path.length-1:null,path,discoveredPixels:tail,neighbourVisits:visits,connectivity:8,boundary:'Only connectivity in the complete retained binary field is tested. Each orthogonal or diagonal move counts as one step; this is not Euclidean length, a physical boundary, object identity or a claim that missing edge support means physical separation. A shortest path is one deterministic witness, not the only possible path.'};
}
