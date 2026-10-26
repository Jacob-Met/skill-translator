import {compareSamplePixels} from './visual-scan.mjs';
import {compareTranslatedSamples, compareSupportedTranslations, WIDE_TRANSLATION_RADIUS} from './visual-translation.mjs';

export const REGIONAL_TRANSLATION_GRID = Object.freeze({columns:4, rows:2});

/** Partition the entire common reference support. No texture-selected subset,
 * seed coordinates, best tile or physical correspondence is supplied. */
export function compareRegionalTranslations(before, after, {radius=WIDE_TRANSLATION_RADIUS}={}) {
  compareSamplePixels(before, after);
  const global=compareTranslatedSamples(before,after,{radius});
  if(global.status==='insufficient-common-support')return {status:'unavailable',reason:'There is insufficient common image support.',global};
  const {columns,rows}=REGIONAL_TRANSLATION_GRID,s=global.support;
  if(s.width<columns*3||s.height<rows*3)return {status:'unavailable',reason:'The common interior is too small for the complete fixed regional partition.',global};
  const tiles=[];
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
    const left=s.left+Math.floor(column*s.width/columns),right=s.left+Math.floor((column+1)*s.width/columns);
    const top=s.top+Math.floor(row*s.height/rows),bottom=s.top+Math.floor((row+1)*s.height/rows);
    const comparison=compareSupportedTranslations(before,after,{left,top,width:right-left,height:bottom-top},{radius});
    tiles.push({index:tiles.length,row,column,comparison});
  }
  const key=a=>`${a.dx},${a.dy}`,sets=tiles.map(t=>new Set(t.comparison.alternatives.map(key)));
  const commonShifts=tiles[0].comparison.alternatives.filter(a=>sets.every(s=>s.has(key(a)))).map(({dx,dy})=>({dx,dy}));
  const localResidual=tiles.reduce((n,t)=>n+Math.round(t.comparison.meanAdjustedChange*t.comparison.support.pixelCount*3*255),0);
  return {status:'compared',format:'skill-translator.regional-appearance-shifts/v1',radius,grid:{columns,rows},support:{...s},global,tiles,commonShifts,
    independentRegionalMean:localResidual/(s.pixelCount*3*255),
    work:{globalCandidates:global.candidateCount,regionalCandidates:tiles.length*global.candidateCount,
      globalReferencePixelCandidates:s.pixelCount*global.candidateCount,regionalReferencePixelCandidates:s.pixelCount*global.candidateCount},
    limitation:'Each fixed sample region retains every exact minimum under its own additive brightness offset. A shared preferred shift is a finite appearance-model property, not camera motion, rigidity, object identity or a physical point correspondence. Independent regional fitting has more freedom, so a lower residual alone is not evidence of accuracy. Omitted original detail and borders remain unassessed.'};
}
