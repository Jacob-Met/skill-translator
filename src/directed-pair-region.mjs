import {inspectDistancePairRegions} from './distance-pair-region.mjs';
// Conditional extrema over two independently declared photo regions.
import {inspectAnnotationBound,annotationContext} from './annotation-bound.mjs';
import {evaluateRelationships} from './task-relationships.mjs';
export function inspectDirectedPairRegion(setup,observation,rule,declarations){
 if(!['horizontal','vertical','distance'].includes(rule.kind))throw Error('Choose a supported relationship criterion');
 if(!Array.isArray(declarations)||declarations.length!==2||declarations[0].id!==rule.from||declarations[1].id!==rule.to)throw Error('Declare both endpoint regions in relationship order');
 const context=annotationContext(setup,observation);
 const nominal=evaluateRelationships(setup.demo,setup.widthMm,setup.heightMm,context.attempts,[rule]);
 const regions=declarations.map(d=>inspectAnnotationBound(setup,observation,d)),axis=rule.kind==='horizontal'?'x':'y';
 if(rule.kind==='distance')return inspectDistancePairRegions(nominal,regions,rule.toleranceMm);
 const extreme=(r,min)=>r.polygon.reduce((best,p)=>min?p[axis]<best[axis]?p:best:p[axis]>best[axis]?p:best);
 const witnesses={minimum:[extreme(regions[0],false),extreme(regions[1],true)],maximum:[extreme(regions[0],true),extreme(regions[1],false)]};
 const minMm=witnesses.minimum[1][axis]-witnesses.minimum[0][axis],maxMm=witnesses.maximum[1][axis]-witnesses.maximum[0][axis];
 const referenceMm=nominal.results[0].expectedMm,guardMm=regions.reduce((sum,r)=>sum+r.guardMm,0);
 const lower=referenceMm-rule.toleranceMm,upper=referenceMm+rule.toleranceMm;
 const pointOnly=regions.every(r=>r.dimension==='point');
 const status=pointOnly?(nominal.passed?'all-within':'all-outside'):minMm>lower+guardMm&&maxMm<upper-guardMm?'all-within':maxMm<lower-guardMm||minMm>upper+guardMm?'all-outside':'unresolved';
 return {nominal,regions,minMm,maxMm,referenceMm,guardMm,witnesses,status};
}
export const DIRECTED_PAIR_REGION_SCHEMA='skill-translator-directed-pair-region/v1';
export const DIRECTED_PAIR_REGION_LIMIT=4*1024*1024;
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const copy=x=>JSON.parse(JSON.stringify(x));
function budget(raw){if(new TextEncoder().encode(JSON.stringify(raw)).length>DIRECTED_PAIR_REGION_LIMIT)throw Error('Pair-region notebook exceeds 4 MiB');}
export function createDirectedPairRegion(setup,observation,rule,declarations){
 const c=annotationContext(setup,observation),result=inspectDirectedPairRegion(c.setup,c.observation,rule,declarations);
 const normalizedRule=result.nominal.results[0];
 const bundle={schema:DIRECTED_PAIR_REGION_SCHEMA,setup:c.setup,observation:c.observation,reference:{practice:c.setup.session.reference,observation:copy(c.observation)},rule:Object.fromEntries(['id','label','from','to','kind','toleranceMm'].map(k=>[k,normalizedRule[k]])),declarations:declarations.map(d=>({id:d.id,halfWidthPx:d.halfWidthPx,halfHeightPx:d.halfHeightPx}))};budget(bundle);return bundle;
}
export function importDirectedPairRegion(raw,expected=null){
 if(raw?.schema!==DIRECTED_PAIR_REGION_SCHEMA)throw Error('Unsupported directed pair-region notebook');budget(raw);
 const accepted=createDirectedPairRegion(raw.setup,raw.observation,raw.rule,raw.declarations);
 if(!same(raw.reference,accepted.reference))throw Error('Notebook source observation differs from its retained reference');
 if(expected){const c=annotationContext(expected.setup,expected.observation);if(!same(accepted.reference,{practice:c.setup.session.reference,observation:c.observation}))throw Error('Notebook belongs to a different source observation');}
 return accepted;
}
export const exportDirectedPairRegion=raw=>JSON.stringify(importDirectedPairRegion(raw));
