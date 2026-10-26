import {compareSamplePixels} from './visual-scan.mjs';
import {compareContainedPlacements, WIDE_TRANSLATION_RADIUS} from './visual-translation.mjs';
import {compareRegionalTranslations, REGIONAL_TRANSLATION_GRID} from './regional-translation.mjs';

export const MAX_CONTAINED_CHANNEL_COMPARISONS = 800_000_000;

/** Same complete fixed reference partition as the maintained regional model;
 * all fully contained destination placements, with no manual target centers. */
export function compareContainedRegionalPlacements(before, after,
    {maxChannelComparisons = MAX_CONTAINED_CHANNEL_COMPARISONS} = {}) {
  compareSamplePixels(before, after);
  if (!Number.isSafeInteger(maxChannelComparisons) || maxChannelComparisons < 1
      || maxChannelComparisons > MAX_CONTAINED_CHANNEL_COMPARISONS)
    throw Error('Use a positive complete-work limit no greater than the maintained maximum.');
  const radius = WIDE_TRANSLATION_RADIUS, {columns,rows} = REGIONAL_TRANSLATION_GRID;
  const width=before.widthPx-2*radius, height=before.heightPx-2*radius;
  if(width<columns*3||height<rows*3)
    return {status:'unavailable', reason:'The common interior is too small for the complete fixed regional partition.'};
  const supports=[];
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
    const left=radius+Math.floor(column*width/columns),right=radius+Math.floor((column+1)*width/columns);
    const top=radius+Math.floor(row*height/rows),bottom=radius+Math.floor((row+1)*height/rows);
    supports.push({left,top,width:right-left,height:bottom-top});
  }
  const candidates=supports.map(s=>(before.widthPx-s.width+1)*(before.heightPx-s.height+1));
  const containedChannels=supports.reduce((n,s,i)=>n+s.width*s.height*3*candidates[i],0);
  const baselineChannels=2*width*height*3*(2*radius+1)**2;
  const work={baselineChannelComparisons:baselineChannels,containedChannelComparisons:containedChannels,
    totalChannelComparisons:baselineChannels+containedChannels,
    containedCandidates:candidates.reduce((n,x)=>n+x,0),maxChannelComparisons};
  if(work.totalChannelComparisons>maxChannelComparisons)
    return {status:'work-limit',reason:'The complete regional placement inquiry exceeds its declared work limit.',work};
  const baseline=compareRegionalTranslations(before,after),tiles=[];
  for(let i=0;i<supports.length;i++)tiles.push({index:i,row:Math.floor(i/columns),column:i%columns,
    comparison:compareContainedPlacements(before,after,supports[i])});
  const key=a=>`${a.dx},${a.dy}`,sets=tiles.map(t=>new Set(t.comparison.alternatives.map(key)));
  const commonShifts=tiles[0].comparison.alternatives.filter(a=>sets.every(s=>s.has(key(a)))).map(({dx,dy})=>({dx,dy}));
  const residual=tiles.reduce((n,t)=>n+Math.round(t.comparison.meanAdjustedChange*t.comparison.support.pixelCount*3*255),0);
  return {status:'compared',format:'skill-translator.contained-regional-appearance/v1',
    grid:{columns,rows},support:{...baseline.support},baseline,tiles,commonShifts,work,
    independentRegionalMean:residual/(width*height*3*255),
    limitation:'The same eight fixed reference regions and all their pixels are retained. Every fully contained integer destination is compared, retaining every exact minimum. Additional placements can reduce appearance residual without improving physical correspondence. Omitted borders, partial visibility, rotation, deformation and unseen frames remain unassessed.'};
}
