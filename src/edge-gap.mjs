import {traceEdgeConnection} from './edge-connection.mjs';
export function explainEdgeGap(field,width,height,start,end,{maxVisits=8*width*height}={}){
 const original=traceEdgeConnection(field,width,height,start,end);const n=width*height;
 if(!Number.isSafeInteger(maxVisits)||maxVisits<0||maxVisits>8*n)throw Error('Declare a bounded unsupported-pixel inquiry');
 if(original.status==='connected')return {original,minimumUnsupportedPixels:0,path:original.path,unsupportedPixels:[],neighbourVisits:0};
 const present=i=>Boolean(field[i>>3]&(1<<(i&7))),a=start[1]*width+start[0],b=end[1]*width+end[0];
 const distance=new Int32Array(n).fill(2147483647),parent=new Int32Array(n).fill(-1),next=new Int32Array(n).fill(-1),previous=new Int32Array(n).fill(-1),queued=new Uint8Array(n),settled=new Uint8Array(n);let head=-1,tail=-1,visits=0;
 function remove(i){const p=previous[i],q=next[i];if(p<0)head=q;else next[p]=q;if(q<0)tail=p;else previous[q]=p;previous[i]=next[i]=-1;queued[i]=0;}
 function push(i,front){if(queued[i])remove(i);queued[i]=1;if(head<0){head=tail=i;return;}if(front){next[i]=head;previous[head]=i;head=i;}else{previous[i]=tail;next[tail]=i;tail=i;}}
 distance[a]=0;push(a,true);
 while(head>=0){const i=head;remove(i);if(settled[i])throw Error('Internal duplicate settlement');settled[i]=1;if(i===b)break;const x=i%width,y=Math.floor(i/width);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(!dx&&!dy)continue;if(++visits>maxVisits)throw Error('Complete minimum-gap inquiry exceeds declared visits; no partial result');const xx=x+dx,yy=y+dy;if(xx<0||xx>=width||yy<0||yy>=height)continue;const j=yy*width+xx;if(settled[j])continue;const weight=present(j)?0:1,cost=distance[i]+weight;if(cost<distance[j]){distance[j]=cost;parent[j]=i;push(j,weight===0);}
  }
 }
 const path=[];for(let i=b;i!==-1;i=parent[i])path.push([i%width,Math.floor(i/width)]);path.reverse();const unsupportedPixels=path.filter(([x,y])=>!present(y*width+x));if(unsupportedPixels.length!==distance[b])throw Error('Internal gap witness disagreement');
 return {original,minimumUnsupportedPixels:distance[b],path,unsupportedPixels,neighbourVisits:visits,boundary:'This hypothetical raster route minimizes the number of absent edge pixels traversed. The original field and its disconnected result remain unchanged. It is not a repaired contour, physical gap length, shortest geometric route, object identity or evidence that any missing pixel should be an edge.'};
}
