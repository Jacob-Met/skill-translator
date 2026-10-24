import {polygonPairDistance} from './polygon-pair-distance.mjs';
import {rational as q,add,sub,mul,cmp,enclosure} from '../vendor/chronos/exact-halfplanes.mjs';
// Only deserialize rational values produced internally by the bounded geometry.
const rational=x=>[BigInt(x.numerator),BigInt(x.denominator)];
export function inspectDistancePairRegions(nominal,regions,toleranceMm){
 const exact=polygonPairDistance(...regions.map(r=>r.polygon)),minimum=rational(exact.minimum.squared),maximum=rational(exact.maximum.squared);
 const referenceMm=nominal.results[0].expectedMm,guardMm=regions.reduce((sum,r)=>sum+r.guardMm,0),zero=q(0),reference=q(referenceMm),tolerance=q(toleranceMm),guard=q(guardMm);
 const lower=sub(reference,tolerance),upper=add(reference,tolerance),insideLower=add(lower,guard),insideUpper=sub(upper,guard),outsideLower=sub(lower,guard),outsideUpper=add(upper,guard);
 const square=x=>mul(x,x),pointOnly=regions.every(r=>r.dimension==='point');
 let status='unresolved';
 if(pointOnly)status=nominal.passed?'all-within':'all-outside';
 else if((cmp(insideLower,zero)<0||cmp(minimum,square(insideLower))>0)&&cmp(insideUpper,zero)>0&&cmp(maximum,square(insideUpper))<0)status='all-within';
 else if((cmp(outsideLower,zero)>0&&cmp(maximum,square(outsideLower))<0)||cmp(minimum,square(outsideUpper))>0)status='all-outside';
 const display=p=>({x:(enclosure(rational(p.x)).lower+enclosure(rational(p.x)).upper)/2,y:(enclosure(rational(p.y)).lower+enclosure(rational(p.y)).upper)/2});
 return {nominal,regions,referenceMm,guardMm,status,exactSquaredExtrema:exact,approximateDisplay:true,minMm:Math.sqrt(exact.minimum.squaredBounds.lower),maxMm:Math.sqrt(exact.maximum.squaredBounds.upper),witnesses:{minimum:exact.minimum.witness.map(display),maximum:exact.maximum.witness.map(display)},semantics:'Status uses exact rational squared comparisons on mapped binary64 vertices and the inherited numerical allowance. Displayed square roots and witness decimals are approximate. Calibration and physical measurements are not exact.'};
}
