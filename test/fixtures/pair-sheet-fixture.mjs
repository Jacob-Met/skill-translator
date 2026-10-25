import {createPractice,placePractice} from '../../src/practice.mjs';
import {createPairInterpretations} from '../../src/pair-interpretations.mjs';
export function fixture(distance=32,width=10,height=10,tolerance=1,attempts=[{id:'a',xMm:2,yMm:3},{id:'b',xMm:5.2,yMm:3}]){
 const source={source:{widthMm:100,heightMm:100,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]},landmarks:[{id:'a',label:'A',kind:'fraction',sourcePx:{x:20,y:30},toleranceMm:1},{id:'b',label:'B',kind:'fraction',sourcePx:{x:20+distance,y:30},toleranceMm:1}]};
 let session=createPractice(source,width,height);for(const p of attempts)session=placePractice(source,width,height,session,p.id,p);
 return createPairInterpretations(source,session,{id:'pair',label:'Declared source separation',from:'a',to:'b',kind:'distance',toleranceMm:tolerance},'Authored nominal sheet-fit control');
}
