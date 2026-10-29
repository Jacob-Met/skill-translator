import test from'node:test';import assert from'node:assert/strict';import{traceEdgeConnection}from'../src/edge-connection.mjs';
test('all 512 three-by-three fields against independent all-pairs shortest distances',()=>{
 let pairs=0;
 for(let mask=0;mask<512;mask++){
  const bits=new Uint8Array([mask&255,mask>>8]),d=Array.from({length:9},()=>Array(9).fill(Infinity));
  for(let i=0;i<9;i++)if(mask>>i&1){d[i][i]=0;for(let j=0;j<9;j++)if((mask>>j&1)&&Math.max(Math.abs(i%3-j%3),Math.abs(Math.floor(i/3)-Math.floor(j/3)))===1)d[i][j]=1;}
  for(let k=0;k<9;k++)for(let i=0;i<9;i++)for(let j=0;j<9;j++)d[i][j]=Math.min(d[i][j],d[i][k]+d[k][j]);
  for(let a=0;a<9;a++)for(let b=0;b<9;b++)if((mask>>a&1)&&(mask>>b&1)){
   const before=[...bits],r=traceEdgeConnection(bits,3,3,[a%3,Math.floor(a/3)],[b%3,Math.floor(b/3)]);assert.equal(r.minimumSteps,Number.isFinite(d[a][b])?d[a][b]:null);assert.deepEqual([...bits],before);
   for(let i=0;i<r.path.length;i++){const [x,y]=r.path[i];assert(mask>>(y*3+x)&1);if(i)assert.equal(Math.max(Math.abs(x-r.path[i-1][0]),Math.abs(y-r.path[i-1][1])),1);}pairs++;
  }
 }
 assert.equal(pairs,11520);
});
test('no snapping, complete capacity refusal, literal diagonal metric and degenerate equality',()=>{
 assert.throws(()=>traceEdgeConnection(new Uint8Array([1]),2,2,[1,1],[0,0]),/absent/);
 assert.throws(()=>traceEdgeConnection(new Uint8Array([255]),2,2,[0,0],[1,1]),/Unused/);
 assert.throws(()=>traceEdgeConnection(new Uint8Array([9]),2,2,[0,0],[1,1],{maxVisits:0}),/no partial/);
 assert.equal(traceEdgeConnection(new Uint8Array([9]),2,2,[0,0],[1,1]).minimumSteps,1);
 assert.equal(traceEdgeConnection(new Uint8Array([1]),1,1,[0,0],[0,0],{maxVisits:0}).minimumSteps,0);
});
