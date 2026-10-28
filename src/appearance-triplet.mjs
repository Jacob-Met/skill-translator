import {FORMAT as PAIR_FORMAT,admitAppearanceRequest,defaultAppearanceRequest,inspectAppearanceSamples} from './appearance-pair.mjs';
export const FORMAT='skill-translator.appearance-triplet/v1';
export const PAIRS=[[0,1],[1,2],[0,2]];
export const BOUNDARY='This joins only integer shifts among the three finite pairwise minima. An empty join may reflect finite search/support or different appearance; it does not exclude a coherent higher-residual fit or physical motion. A nonempty join establishes no object identity or physical correspondence. Brightness offsets and residuals are not added.';
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function admitAppearanceTriplet(raw,sequence){
 check(raw?.format===FORMAT&&raw.request?.frames?.length===3,'Retain exactly three original frames in a supported composition request');
 const requests=PAIRS.map(([a,b])=>admitAppearanceRequest({format:PAIR_FORMAT,request:{...raw.request,frames:[raw.request.frames[a],raw.request.frames[b]]}},sequence));
 const q=requests[0].request;
 return {format:FORMAT,request:{...q,frames:[q.frames[0],q.frames[1],requests[1].request.frames[1]]}};
}
export function appearanceTripletPairs(raw,sequence){const source=admitAppearanceTriplet(raw,sequence);return PAIRS.map(([a,b])=>admitAppearanceRequest({format:PAIR_FORMAT,request:{...source.request,frames:[source.request.frames[a],source.request.frames[b]]}},sequence));}
export function defaultAppearanceTriplet(sequence,first,middle,last,settings){const pair=defaultAppearanceRequest(sequence,first,last,settings),second=defaultAppearanceRequest(sequence,middle,last,settings);return admitAppearanceTriplet({format:FORMAT,request:{...pair.request,frames:[pair.request.frames[0],second.request.frames[0],pair.request.frames[1]]}},sequence);}
/** Exact set algebra only. Reversing image comparisons is not assumed to reverse their minima. */
export function joinAppearanceMinima(comparisons,{offset=0,limit=50}={}){
 check(Array.isArray(comparisons)&&comparisons.length===3,'Retain all three complete pair comparisons');
 check(Number.isSafeInteger(offset)&&offset>=0&&Number.isSafeInteger(limit)&&limit>=1&&limit<=100,'Choose a bounded witness page');
 const sets=comparisons.map(c=>{check(Array.isArray(c.alternatives)&&c.alternatives.length>=1&&c.alternatives.length<=1089,'Retain every admitted finite minimizer');const seen=new Set();return c.alternatives.map(a=>{check(Number.isInteger(a.dx)&&Number.isInteger(a.dy)&&Math.abs(a.dx)<=16&&Math.abs(a.dy)<=16,'Admit bounded integer appearance shifts');const key=a.dx+','+a.dy;check(!seen.has(key),'Minimizing shift identities must be unique');seen.add(key);return {dx:a.dx,dy:a.dy};});});
 const checkedCombinations=sets[0].length*sets[1].length;check(checkedCombinations<=1_200_000,'Complete additive join exceeds its work limit');
 const direct=new Map(sets[2].map((a,i)=>[a.dx+','+a.dy,i])),participating=sets.map(()=>new Set()),witnesses=sets.map(()=>new Map()),page=[];let count=0;
 for(let i=0;i<sets[0].length;i++)for(let j=0;j<sets[1].length;j++){const a=sets[0][i],b=sets[1][j],k=direct.get((a.dx+b.dx)+','+(a.dy+b.dy));if(k===undefined)continue;const triple=[i,j,k];if(count>=offset&&page.length<limit)page.push(triple);count++;triple.forEach((id,p)=>{participating[p].add(id);if(!witnesses[p].has(id))witnesses[p].set(id,triple);});}
 check(offset===0||offset<count,'Requested witness page is outside the complete join');
 return {status:count?'compatible-pairwise-minima':'no-additive-pairwise-minima',count,checkedCombinations,participatingIndexes:participating.map(s=>[...s].sort((a,b)=>a-b)),witnessByAlternative:witnesses.map(m=>[...m].sort((a,b)=>a[0]-b[0]).map(([index,triple])=>({index,triple}))),page:{offset,limit,triples:page},boundary:BOUNDARY};
}
export function inspectAppearanceTripletSamples(raw,sequence,samples){
 const source=admitAppearanceTriplet(raw,sequence),pairs=appearanceTripletPairs(source,sequence),q=source.request;
 check(Array.isArray(samples)&&samples.length===3,'Supply all three admitted original samples');
 const channelComparisons=3*(2*q.radius+1)**2*q.support.width*q.support.height*3;check(channelComparisons<=200_000_000,'Complete image comparison exceeds its work limit');
 const comparisons=PAIRS.map(([a,b],i)=>inspectAppearanceSamples(pairs[i],sequence,samples[a],samples[b]));
 return {source,comparisons,join:joinAppearanceMinima(comparisons.map(r=>r.comparison)),channelComparisons,boundary:BOUNDARY};
}
