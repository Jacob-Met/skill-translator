import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inspectRepeatedReadings} from '../src/cue-repeated-readings.mjs';
const bundle=JSON.parse(await readFile(new URL('./fixtures/repeated-cue-study.json',import.meta.url),'utf8'));
let checks=0;
for(const unknown of [false,true])for(const E of [0,1,2])for(let n=0;n<=5;n++)for(let code=0;code<3**n;code++){
 const study=structuredClone(bundle.study);study.cues=study.cues.slice(0,1);study.rows.forEach((r,i)=>r.values=[unknown&&i===1?null:['a','b'][i]]);
 let v=code;const answers=Array.from({length:n},()=>{const a=['a','b','OTHER'][v%3];v=Math.floor(v/3);return a;});
 const readings=answers.map(value=>({cue:study.cues[0].id,value}));const actual=inspectRepeatedReadings(study,{maxErrors:E,basis:'Authored total bound',readings});
 // Enumerate permissible error-position subsets, independently of candidate mismatch counting.
 const expected=[];for(let row=0;row<2;row++){let possible=false;for(let mask=0;mask<2**n;mask++){if(mask.toString(2).replaceAll('0','').length>E)continue;if(answers.every((a,j)=>(mask&(1<<j))||study.rows[row].values[0]===null||a===study.rows[row].values[0]))possible=true;}if(possible)expected.push(row);}
 assert.deepEqual(actual.indexes,expected);checks++;
}
const s=bundle.study, input={maxErrors:1,basis:'Total',readings:[{cue:s.cues[0].id,value:'a'},{cue:s.cues[0].id,value:'b'},{cue:s.cues[0].id,value:'a'}]};
assert.equal(inspectRepeatedReadings(s,input).status,'one-retained-label');
for(const bad of [{...input,readings:Array(31).fill(input.readings[0])},{...input,maxErrors:3},{...input,basis:''},{...input,readings:[{cue:'foreign',value:'a'}]}])assert.throws(()=>inspectRepeatedReadings(s,bad));
const before=JSON.stringify(s);inspectRepeatedReadings(s,input);assert.equal(JSON.stringify(s),before);
const literal=structuredClone(s);literal.rows[0].values[0]='OTHER';assert.equal(inspectRepeatedReadings(literal,{maxErrors:0,basis:'literal',readings:[]}).next[0].branches.at(-1).value,'OTHER_');
const unknownDecision=structuredClone(s);unknownDecision.rows[0].decision=null;assert.equal(inspectRepeatedReadings(unknownDecision,{maxErrors:0,basis:'unknown decision',readings:[]}).status,'unknown-decision');
console.log(JSON.stringify({independentErrorPositionWorlds:checks,controls:'pass'}));
