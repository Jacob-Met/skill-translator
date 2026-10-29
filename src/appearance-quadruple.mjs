import {FORMAT as PAIR_FORMAT,admitAppearanceRequest,defaultAppearanceRequest,BOUNDARY as PAIR_BOUNDARY} from './appearance-pair.mjs';
import {profileTranslatedSamples,profileTranslatedBrightnessIntervals} from './visual-translation.mjs';
import {minimizeAdditiveAppearanceCosts} from './appearance-additive-cost.mjs';
export const FORMAT='skill-translator.appearance-quadruple/v1';
export const PAIRS=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
export const TRIANGLES=[[0,3,1],[0,4,2],[1,5,2],[3,5,4]];
export const MAX_RADIUS=4;
export const BOUNDARY='A least-cost common integer-offset account of six directed finite image comparisons, not an object track or physical correspondence. Each pair independently fits its brightness offset on its own reference-coordinate support; this is not global photometric registration. Positive excess over the four-triangle lower bound excludes simultaneous attainment of those triangle optima, not higher-cost common accounts or physical motion. Zero excess establishes no identity.';
const check=(ok,message)=>{if(!ok)throw Error(message);};
export function admitAppearanceQuadruple(raw,sequence){
 check(raw?.format===FORMAT&&raw.request?.frames?.length===4,'Retain exactly four original frames in a supported request');
 check(Number.isInteger(raw.request.radius)&&raw.request.radius>=1&&raw.request.radius<=MAX_RADIUS,'The four-original inquiry has an explicit radius domain 1–4; existing pair/triplet domains are separate');
 const pairs=PAIRS.map(([a,b])=>admitAppearanceRequest({format:PAIR_FORMAT,request:{...raw.request,frames:[raw.request.frames[a],raw.request.frames[b]]}},sequence));
 return {format:FORMAT,request:{...pairs[0].request,frames:[pairs[0].request.frames[0],pairs[0].request.frames[1],pairs[1].request.frames[1],pairs[2].request.frames[1]]}};
}
export function defaultAppearanceQuadruple(sequence,ids,settings){
 check(Array.isArray(ids)&&ids.length===4,'Choose four original frames');
 check(Number.isInteger(settings?.radius)&&settings.radius>=1&&settings.radius<=MAX_RADIUS,'The four-original inquiry has an explicit radius domain 1–4; existing pair/triplet domains are separate');
 const pairs=ids.slice(1).map(id=>defaultAppearanceRequest(sequence,ids[0],id,settings));
 return admitAppearanceQuadruple({format:FORMAT,request:{...pairs[0].request,frames:[pairs[0].request.frames[0],...pairs.map(p=>p.request.frames[1])]}},sequence);
}
export function appearanceQuadruplePairs(raw,sequence){const source=admitAppearanceQuadruple(raw,sequence);return PAIRS.map(([a,b])=>admitAppearanceRequest({format:PAIR_FORMAT,request:{...source.request,frames:[source.request.frames[a],source.request.frames[b]]}},sequence));}
/** Counts sampled-raster loops, not original PNG decoding or total CPU work. */
export function reserveQuadrupleWork({widthPx:w,heightPx:h,radius:r,support:s}){
 check([w,h,r].every(Number.isInteger)&&w>=1&&h>=1&&w<=160&&h<=160&&r>=1&&r<=4,'Admit the bounded four-profile raster/domain');
 check(s&&[s.left,s.top,s.width,s.height].every(Number.isInteger)&&s.width>=3&&s.height>=3&&s.left>=r&&s.top>=r&&s.left+s.width<=w-r&&s.top+s.height<=h-r,'Admit complete common reference support');
 const n=(2*r+1)**2,searchRGBChannelVisits=6*n*s.width*s.height*3,admissionRGBChannelVisits=12*w*h*3,commonAssignmentVisits=2*n**3,trianglePairVisits=8*n*n;
 const reservation={histogramSearches:6,fullFrameAdmissionCalls:6,fullSampledRasterRGBTraversals:12,searchRGBChannelVisits,admissionRGBChannelVisits,totalRGBChannelVisits:searchRGBChannelVisits+admissionRGBChannelVisits,histogramBinVisits:6*n*1533,commonAssignmentVisits,trianglePairVisits,totalAlgebraVisits:commonAssignmentVisits+trianglePairVisits};
 check(reservation.totalRGBChannelVisits<=200_000_000&&reservation.totalAlgebraVisits<=1_115_370,'Complete four-original work exceeds its reservation');return reservation;
}
/** Pure directed-cost algebra; no reversal symmetry of image comparisons is assumed. */
export function minimizeQuadrupleAppearanceCosts(profiles,{offset=0,limit=20}={}){
 check(Array.isArray(profiles)&&profiles.length===6,'Retain six complete directed profiles in AB, AC, AD, BC, BD, CD order');
 check(Number.isInteger(profiles[0]?.radius)&&profiles[0].radius>=1&&profiles[0].radius<=4,'Four-original cost domain is radius 1–4');
 check(Number.isSafeInteger(offset)&&offset>=0&&Number.isSafeInteger(limit)&&limit>=1&&limit<=100,'Choose a bounded optimum page');
 const reservation=reserveQuadrupleWork(profiles[0]);
 check(profiles.every(p=>p?.radius===profiles[0].radius),'Every profile must use the same small radius');
 // These maintained reductions also admit every complete cost population and common support.
 // Overlapping triangle memberships connect all six profiles to the same declared settings.
 const triangles=TRIANGLES.map(indices=>minimizeAdditiveAppearanceCosts(indices.map(i=>profiles[i]),{limit:1}));
 const sets=profiles.map(p=>p.candidates),maps=sets.map(set=>new Map(set.map((c,i)=>[c.dx+','+c.dy,i])));
 let optimum=Infinity,feasible=0;
 const visit=fn=>{for(let a=0;a<sets[0].length;a++)for(let b=0;b<sets[1].length;b++)for(let c=0;c<sets[2].length;c++){
  const B=sets[0][a],C=sets[1][b],D=sets[2][c],bc=maps[3].get((C.dx-B.dx)+','+(C.dy-B.dy)),bd=maps[4].get((D.dx-B.dx)+','+(D.dy-B.dy)),cd=maps[5].get((D.dx-C.dx)+','+(D.dy-C.dy));
  if(bc===undefined||bd===undefined||cd===undefined)continue;
  const indexes=[a,b,c,bc,bd,cd],cost=indexes.reduce((sum,i,p)=>sum+sets[p][i].absoluteResidual,0);fn(indexes,cost);
 }};
 visit((indexes,cost)=>{feasible++;if(cost<optimum)optimum=cost;});
 const independentLowerBound=sets.reduce((sum,set)=>sum+Math.min(...set.map(c=>c.absoluteResidual)),0),triangleSum=triangles.reduce((sum,t)=>sum+t.optimalIntegerResidual,0);
 check(Number.isSafeInteger(optimum)&&Number.isSafeInteger(triangleSum)&&2*optimum>=triangleSum&&optimum>=independentLowerBound,'Complete common domain must preserve exact lower bounds');
 const participating=sets.map(()=>new Set()),witnesses=sets.map(()=>new Map()),accounts=[];let count=0;
 visit((indexes,cost)=>{if(cost!==optimum)return;if(count>=offset&&accounts.length<limit)accounts.push(indexes);count++;indexes.forEach((index,p)=>{participating[p].add(index);if(!witnesses[p].has(index))witnesses[p].set(index,indexes);});});
 check(offset===0||offset<count,'Requested page is outside the complete optimum family');
 return {optimalIntegerResidual:optimum,independentLowerBound,excessOverIndependent:optimum-independentLowerBound,triangleOptima:triangles.map(t=>t.optimalIntegerResidual),triangleLowerBound:{numerator:triangleSum,denominator:2},twiceExcessOverTriangleBound:2*optimum-triangleSum,simultaneousTriangleOptima:2*optimum===triangleSum,count,feasibleAssignments:feasible,denominator:6*profiles[0].channelCount*255,participatingIndexes:participating.map(s=>[...s].sort((a,b)=>a-b)),participatingAlternatives:participating.map((s,p)=>[...s].sort((a,b)=>a-b).map(index=>({index,...sets[p][index]}))),witnessByAlternative:witnesses.map(m=>[...m].sort((a,b)=>a[0]-b[0]).map(([index,indexes])=>({index,indexes}))),page:{offset,limit,indexes:accounts,accounts:accounts.map(indices=>({positions:[{dx:0,dy:0},...indices.slice(0,3).map((i,p)=>({dx:sets[p][i].dx,dy:sets[p][i].dy}))],pairs:indices.map((i,p)=>({...sets[p][i]}))}))},workReservation:{commonAssignmentVisits:reservation.commonAssignmentVisits,trianglePairVisits:reservation.trianglePairVisits,totalAlgebraVisits:reservation.totalAlgebraVisits},boundary:BOUNDARY};
}
export function inspectAppearanceQuadrupleSamples(raw,sequence,samples){return inspectFourSamples(raw,sequence,samples,false);}
export function inspectAppearanceQuadrupleBrightnessSamples(raw,sequence,samples){return inspectFourSamples(raw,sequence,samples,true);}
function inspectFourSamples(raw,sequence,samples,includeIntervals){
 const source=admitAppearanceQuadruple(raw,sequence),q=source.request,pairSources=appearanceQuadruplePairs(source,sequence);
 check(Array.isArray(samples)&&samples.length===4&&samples.every(s=>s?.widthPx===q.widthPx&&s?.heightPx===q.heightPx),'Supply all four original samples at the declared raster');
 const workReservation=reserveQuadrupleWork(q);
 const fitted=PAIRS.map(([a,b])=>(includeIntervals?profileTranslatedBrightnessIntervals:profileTranslatedSamples)(samples[a],samples[b],{radius:q.radius,referenceSupport:q.support}));
 const profiles=includeIntervals?fitted.map(p=>p.profile):fitted;
 const comparisons=profiles.map((p,i)=>({source:pairSources[i],comparison:p.comparison,boundary:PAIR_BOUNDARY}));
 return {source,comparisons,commonCost:minimizeQuadrupleAppearanceCosts(profiles,{limit:10}),workReservation,profiles,boundary:BOUNDARY,...(includeIntervals?{intervals:fitted.map(p=>p.intervals)}:{})};
}
