const view=new DataView(new ArrayBuffer(8));
export function dyadic(x){if(typeof x!=='number'||!Number.isFinite(x))throw Error('Finite binary64 quantity required');if(x===0)return{n:0n,e:0};view.setFloat64(0,x);const b=view.getBigUint64(0),e=Number(b>>52n&2047n);return{n:(b>>63n?-1n:1n)*((b&((1n<<52n)-1n))+(e?1n<<52n:0n)),e:e?e-1075:-1074};}
export const multiply=(a,b)=>({n:a.n*b.n,e:a.e+b.e});
export const negate=a=>({n:-a.n,e:a.e});
export function subtract(a,b){const e=Math.min(a.e,b.e);return{n:(a.n<<BigInt(a.e-e))-(b.n<<BigInt(b.e-e)),e};}
export function compare(a,b){const x=subtract(a,b).n;return x<0n?-1:x>0n?1:0;}
export const pack=a=>({integer:a.n.toString(),binaryExponent:a.e});
export const unpack=a=>({n:BigInt(a.integer),e:a.binaryExponent});
// Same bounded potential baseline as the maintained shared-height study.
export function solveDifferences(count,edges){
 if(!Number.isInteger(count)||count<1||count>65||!Array.isArray(edges)||edges.length>1024)throw Error('Difference-system capacity exceeded');
 for(const edge of edges)if(!Number.isInteger(edge.from)||!Number.isInteger(edge.to)||edge.from<0||edge.to<0||edge.from>=count||edge.to>=count||typeof edge.bound.n!=='bigint'||!Number.isInteger(edge.bound.e)||edge.bound.e< -2148||edge.bound.e>1942||(edge.bound.n<0n?-edge.bound.n:edge.bound.n).toString(2).length>106)throw Error('Invalid exact edge');
 const exponent=Math.min(0,...edges.map(e=>e.bound.e)),weights=edges.map(e=>e.bound.n<<BigInt(e.bound.e-exponent)),potential=Array(count).fill(0n),predecessor=Array(count).fill(-1);let changed=-1;
 for(let pass=0;pass<count;pass++){changed=-1;for(let i=0;i<edges.length;i++){const e=edges[i];if(potential[e.to]>potential[e.from]+weights[i]){potential[e.to]=potential[e.from]+weights[i];predecessor[e.to]=i;changed=e.to;}}if(changed<0){if(edges.some((e,i)=>potential[e.to]-potential[e.from]>weights[i]))throw Error('Internal exact witness failure');return{status:'feasible',potentials:potential.map(n=>pack({n,e:exponent})),edgeCount:edges.length};}}
 let v=changed;for(let i=0;i<count;i++)v=edges[predecessor[v]].from;const start=v,cycle=[];let total=0n;do{const i=predecessor[v],edge=edges[i];cycle.push({from:edge.from,to:edge.to,label:edge.label,bound:pack({n:weights[i],e:exponent})});total+=weights[i];v=edge.from;}while(v!==start);if(total>=0n)throw Error('Internal negative-cycle failure');return{status:'contradiction',cycle,sum:pack({n:total,e:exponent}),edgeCount:edges.length};
}
// This is only a candidate conversion; every constraint is rechecked exactly.
export function represent(a){let n=a.n;if(!n)return 0;const sign=n<0n?-1:1;if(n<0n)n=-n;const bits=n.toString(2).length,shift=Math.max(0,bits-53),head=Number(n>>BigInt(shift));return sign*(head/2**(bits-shift-1))*2**(a.e+bits-1);}
