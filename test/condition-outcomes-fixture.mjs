// Exploration only; not a product schema, label authenticator or learning study.
import {createPractice,placePractice,retryPractice} from '../src/practice.mjs';
import {createConditionSet,inspectConditionSet} from '../src/condition-set.mjs';
const source={source:{widthMm:100,heightMm:100,corners:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]},landmarks:[[20,50],[50,50],[50,80]].map(([x,y],i)=>({id:'m'+i,label:'M'+i,kind:'fraction',toleranceMm:2,sourcePx:{x,y}}))};
const conditions=[{id:'length',kind:'pair',rule:{label:'Length',basis:'Authored experiment',from:'m0',to:'m1',kind:'distance',toleranceMm:1}},{id:'guide',kind:'guide',rule:{label:'Offset',basis:'Authored experiment',from:'m0',to:'m1',point:'m2',toleranceMm:1}}];
let session=createPractice(source,100,100);
for(const [i,points]of [[[20,50],[50,50],[50,80]],[[29,50],[50,50],[50,80]],[[25,50],[55,50],[55,80]],[[20,50],[50,50]]].entries()){
 if(i)session=retryPractice(source,100,100,session);
 for(const [j,[xMm,yMm]]of points.entries())session=placePractice(source,100,100,session,'m'+j,{xMm,yMm});
}
const raw=createConditionSet(source,session,conditions);

export {raw};
