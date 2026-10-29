import assert from 'node:assert/strict';import {fixedSchedule} from '../src/cue-fixed-schedule-core.mjs';
function sequences(alphabet,n){if(!n)return [[]];return sequences(alphabet,n-1).flatMap(p=>alphabet.map(v=>[...p,v]));}
const rows=sequences(['a','b',null],2),schedules=Array.from({length:4},(_,n)=>sequences([0,1],n)),answers=Array.from({length:4},(_,n)=>sequences(['a','b','OTHER'],n));
const separates=(rs,s)=>answers[s.length].every(a=>{const labels=new Set(rs.filter(r=>a.filter((v,i)=>r.values[s[i]]!==null&&r.values[s[i]]!==v).length<=r.remaining).map(r=>r.decision));return labels.size<=1;});
let cases=0;for(let i=0;i<rows.length;i++)for(let j=0;j<rows.length;j++)for(let k=0;k<rows.length;k++)for(let budget=0;budget<=2;budget++){
 const rs=[{values:rows[i],decision:'x',remaining:budget},{values:rows[j],decision:'y',remaining:budget},{values:rows[k],decision:'y',remaining:Math.max(0,budget-1)}];
 let minimum=null;for(let n=0;n<=3;n++)if(schedules[n].some(s=>separates(rs,s))){minimum=n;break;}
 const actual=fixedSchedule(rs,2,3);assert.equal(actual.minimumAdditional??null,minimum);
 if(actual.schedule){const s=actual.schedule.flatMap((n,c)=>Array(n).fill(c));assert.ok(separates(rs,s));}cases++;
}
assert.equal(fixedSchedule([{values:['a'],decision:null,remaining:0}],1,6).status,'unknown-decision');assert.equal(fixedSchedule([],1,6).status,'outside-evidence');assert.deepEqual(fixedSchedule([{values:['a'],decision:'x',remaining:2},{values:['b'],decision:'y',remaining:2}],1,6).schedule,[5]);
console.log(JSON.stringify({independentOrderedScheduleAndAnswerWorlds:cases,controls:'pass'}));
