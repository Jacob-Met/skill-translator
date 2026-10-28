import {profileTranslatedSamples} from './visual-translation.mjs';
import {admitAppearanceTriplet,appearanceTripletPairs,joinAppearanceMinima,PAIRS,BOUNDARY} from './appearance-triplet.mjs';
import {BOUNDARY as PAIR_BOUNDARY} from './appearance-pair.mjs';
// Finite image-cost arithmetic only: pair brightness fits and supports remain separate.
export const MAX_ADDITIVE_PAIR_VISITS = 2_400_000;
export const ADDITIVE_COST_BOUNDARY = 'Least equal-weight sum of three directed finite image costs under additive integer shifts. Pair brightness offsets are fitted independently on each pair’s reference support. This is not one globally registered photometric model, an object identity, or a physical motion. Excess above independent minima is descriptive, not a significance or correctness threshold.';
const check=(ok,message)=>{if(!ok)throw Error(message);};
function admitProfiles(profiles){
 check(Array.isArray(profiles)&&profiles.length===3,'Retain exactly three complete finite cost profiles');
 for(const p of profiles){
  check(p?.status==='complete','Every cost profile must be complete');
  const {radius:r,widthPx:w,heightPx:h,support:s,channelCount:n}=p;
  check([r,w,h].every(Number.isInteger)&&r>=1&&r<=16&&w>=1&&h>=1&&w<=160&&h<=160,'Use maintained finite raster and radius bounds');
  check(s&&[s.left,s.top,s.width,s.height].every(Number.isInteger)&&s.width>=3&&s.height>=3&&s.left>=r&&s.top>=r&&s.left+s.width<=w-r&&s.top+s.height<=h-r,'Retain an admitted common reference support');
  check(s.pixelCount===s.width*s.height&&s.omittedPixels===w*h-s.pixelCount&&n===s.pixelCount*3&&Number.isSafeInteger(n)&&n<=76800,'Cost channel population differs from support');
  check(Array.isArray(p.candidates)&&p.candidates.length===(2*r+1)**2,'Retain every finite shift cost');const seen=new Set();
  for(const c of p.candidates){
   check(c&&Number.isInteger(c.dx)&&Number.isInteger(c.dy)&&Math.abs(c.dx)<=r&&Math.abs(c.dy)<=r,'Use bounded integer shifts');const key=c.dx+','+c.dy;check(!seen.has(key),'Duplicate finite shift cost');seen.add(key);
   check(Number.isInteger(c.uniformBrightnessShift)&&Math.abs(c.uniformBrightnessShift)<=255,'Use an integer fitted brightness offset');
   check(Number.isSafeInteger(c.absoluteResidual)&&c.absoluteResidual>=0&&c.absoluteResidual<=n*255,'Use an exact bounded median-optimal integer cost');
   check(c.searchBoundary===(Math.abs(c.dx)===r||Math.abs(c.dy)===r),'Shift boundary attribution differs');
  }
 }
 const q=profiles[0];for(const p of profiles.slice(1))check(['radius','widthPx','heightPx','channelCount'].every(k=>p[k]===q[k])&&['left','top','width','height','pixelCount','omittedPixels'].every(k=>p.support[k]===q.support[k]),'All three profiles must share declared raster, support and radius');
 return profiles;
}
export function minimizeAdditiveAppearanceCosts(input,{offset=0,limit=50}={}){
 const profiles=admitProfiles(input);check(Number.isSafeInteger(offset)&&offset>=0&&Number.isSafeInteger(limit)&&limit>=1&&limit<=100,'Choose a bounded optimum page');
 const sets=profiles.map(p=>p.candidates),visits=2*sets[0].length*sets[1].length;check(visits<=MAX_ADDITIVE_PAIR_VISITS,'Complete additive enumeration exceeds its reserved work');
 const independentLowerBound=sets.reduce((sum,a)=>sum+Math.min(...a.map(c=>c.absoluteResidual)),0),direct=new Map(sets[2].map((c,i)=>[c.dx+','+c.dy,i]));let optimum=Infinity,feasibleTriples=0;
 const visit=fn=>{for(let i=0;i<sets[0].length;i++)for(let j=0;j<sets[1].length;j++){const a=sets[0][i],b=sets[1][j],k=direct.get((a.dx+b.dx)+','+(a.dy+b.dy));if(k!==undefined)fn(i,j,k,a.absoluteResidual+b.absoluteResidual+sets[2][k].absoluteResidual);}};
 visit((i,j,k,cost)=>{feasibleTriples++;if(cost<optimum)optimum=cost;});check(Number.isSafeInteger(optimum)&&optimum>=independentLowerBound,'Complete finite domain must have a valid zero-shift additive account');
 const participating=sets.map(()=>new Set()),witness=sets.map(()=>new Map()),triples=[];let count=0;
 visit((i,j,k,cost)=>{if(cost!==optimum)return;const triple=[i,j,k];if(count>=offset&&triples.length<limit)triples.push(triple);count++;triple.forEach((index,p)=>{participating[p].add(index);if(!witness[p].has(index))witness[p].set(index,triple);});});
 check(offset===0||offset<count,'Requested page exceeds the complete optimum family');
 const denominator=3*profiles[0].channelCount*255,excessIntegerResidual=optimum-independentLowerBound;
 return {independentLowerBound,optimalIntegerResidual:optimum,excessIntegerResidual,denominator,meanResidual:optimum/denominator,meanExcess:excessIntegerResidual/denominator,simultaneousPairwiseMinima:excessIntegerResidual===0,count,feasibleTriples,work:{pairVisits:visits,costProfiles:3},participatingIndexes:participating.map(s=>[...s].sort((a,b)=>a-b)),witnessByAlternative:witness.map(m=>[...m].sort((a,b)=>a[0]-b[0]).map(([index,triple])=>({index,triple}))),page:{offset,limit,triples,accounts:triples.map(t=>t.map((index,p)=>({...sets[p][index]})))},boundary:ADDITIVE_COST_BOUNDARY};
}

export function inspectAdditiveAppearanceSamples(raw,sequence,samples){
 const source=admitAppearanceTriplet(raw,sequence),q=source.request,pairs=appearanceTripletPairs(source,sequence);
 check(Array.isArray(samples)&&samples.length===3,'Supply all three admitted original samples');
 check(samples.every(s=>s?.widthPx===q.widthPx&&s?.heightPx===q.heightPx),'Raster dimensions differ from retained request');
 const candidates=(2*q.radius+1)**2,channelComparisons=3*candidates*q.support.width*q.support.height*3,pairVisits=2*candidates*candidates;
 const admissionChannelVisits=6*q.widthPx*q.heightPx*3,totalRGBChannelVisits=channelComparisons+admissionChannelVisits;
 check(totalRGBChannelVisits<=200_000_000&&pairVisits<=MAX_ADDITIVE_PAIR_VISITS&&pairVisits+candidates*candidates<=3_600_000,'Complete three-profile, independent join and additive work exceeds its reservation');
 const profiles=PAIRS.map(([a,b])=>profileTranslatedSamples(samples[a],samples[b],{radius:q.radius}));
 const comparisons=profiles.map((p,i)=>({source:pairs[i],comparison:p.comparison,boundary:PAIR_BOUNDARY}));
 return {source,comparisons,join:joinAppearanceMinima(comparisons.map(c=>c.comparison)),channelComparisons,boundary:BOUNDARY,additiveCost:{...minimizeAdditiveAppearanceCosts(profiles,{limit:10}),initialWorkReservation:{histogramSearches:3,channelComparisons,fullFrameAdmissionCalls:3,fullFrameRGBTraversals:6,admissionChannelVisits,totalRGBChannelVisits,independentMinimaPairVisits:candidates*candidates,additivePairVisits:pairVisits,totalAlgebraPairVisits:pairVisits+candidates*candidates}},profiles};
}
