// Invoke through the authorized execution owner with baseline budget module,
// candidate budget module, and the maintained cue-budget fixture module paths.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const load=path=>import(pathToFileURL(resolve(path)));
const [baseline,candidate,{study}]=await Promise.all(process.argv.slice(2,5).map(load));
let comparisons=0;
function capture(fn){try{return {value:fn()};}catch(error){return {error:{name:error.name,message:error.message}};}}
function compare(method,args,context){
 const before=structuredClone(args);
 const expected=capture(()=>baseline[method](...args));
 assert.deepEqual(args,before,`baseline mutation: ${context}`);
 const actual=capture(()=>candidate[method](...args));
 assert.deepEqual(args,before,`candidate mutation: ${context}`);
 assert.deepEqual(actual,expected,context);comparisons++;
}
const profile=costs=>({format:'skill-translator.cue-question-plan/v1',cues:costs.map((cost,i)=>({cueId:'c'+i,available:cost!==null,effort:cost??1,basis:'  Authored test conditions  '}))});
let seed=0x518ed47b;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
for(let trial=0;trial<48;trial++){
 const width=1+random()%4,count=2+random()%5;
 const values=Array.from({length:count},()=>Array.from({length:width},()=>random()%5===0?null:String(random()%3)));
 const labels=Array.from({length:count},(_,i)=>trial%13===0&&i===0?null:String.fromCharCode(65+random()%4));
 const source=study(values,labels);
 const readings=trial%3===0?[{cueId:'c'+(random()%width),value:trial%6===0?' unseen ':String(random()%3)}]:[];
 for(const budget of [0,1,3,8])compare('inspectCueBudget',[source,readings,budget],`unit trial ${trial}, budget ${budget}`);
 const costs=Array.from({length:width},()=>random()%5===0?null:1+random()%1000),plan=profile(costs);
 if(trial%2)plan.cues.reverse();
 for(const budget of [0,1,1001,8000])compare('inspectCueEffortBudget',[source,readings,budget,plan],`weighted trial ${trial}, budget ${budget}`);
}
const source=study([[null,'0'],['Unrecorded analysis category','1'],['Unrecorded analysis category_','2']],['A','B','C']);
for(const readings of [[],[{cueId:'c0',value:' Unrecorded analysis category '}],[{cueId:'c0',value:' novel '}],[{cueId:'c1',value:'0'}]]){
 for(const budget of [0,1,2,8])compare('inspectCueBudget',[source,readings,budget],`synthetic collision/normalization ${JSON.stringify(readings)}, ${budget}`);
 for(const budget of [0,1,1000,8000])compare('inspectCueEffortBudget',[source,readings,budget,profile([null,1000])],`unavailable historical reading ${JSON.stringify(readings)}, ${budget}`);
}
for(const readings of [null,{},[{cueId:'missing',value:'x'}],[{cueId:'c0',value:''}],[{cueId:'c0',value:' '.repeat(3)}],[{cueId:'c0',value:'x'.repeat(161)}],[{cueId:'c0',value:3}],[{cueId:'c0',value:'a'},{cueId:'c0',value:'b'}]]){
 compare('inspectCueBudget',[source,readings,1],`unit readings refusal ${JSON.stringify(readings)}`);
 compare('inspectCueEffortBudget',[source,readings,1,profile([1,2])],`weighted readings refusal ${JSON.stringify(readings)}`);
}
for(const budget of [-1,0.1,9,NaN,Infinity,'1',null])compare('inspectCueBudget',[source,[],budget],`unit budget refusal ${String(budget)}`);
for(const budget of [-1,0.1,8001,NaN,Infinity,'1',null])compare('inspectCueEffortBudget',[source,[],budget,profile([1,2])],`weighted budget refusal ${String(budget)}`);
for(const plan of [null,undefined,{}, {...profile([1,2]),format:'unsupported'},profile([0,2]),profile([1,1001]),{...profile([1,2]),cues:[]}]){
 compare('inspectCueEffortBudget',[source,null,1,plan],`combined admission refusal ${JSON.stringify(plan)}`);
}
// Source and effort changes between calls must not retain a previous session.
for(const change of [()=>{},()=>{source.rows[1].decision='changed';},()=>{source.rows[0].values[0]='known';}]){
 change();compare('inspectCueBudget',[source,[],2],'changed source across independent reports');
 for(const costs of [[1,2],[2,1],[null,1]])compare('inspectCueEffortBudget',[source,[],3,profile(costs)],'changed costs across independent reports');
}
console.log(JSON.stringify({comparisons,claim:'Exact full-output/error parity including statesExamined; source inputs unchanged.'}));
