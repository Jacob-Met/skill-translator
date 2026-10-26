import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fitInstrumentChangeModels as fit} from '../src/instrument-change-models.mjs';
let state=672139,maxError=0,count=0;const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/2**32);
for(let k=0;k<60;k++) {let t=0;const samples=Array.from({length:12+k%19},(_,i)=>({timeSeconds:t+=(1+Math.floor(rand()*16))/32,value:Math.floor(rand()*1024)/64+(i>8?2:0)}));const original=fit(samples);for(const factor of [-256,1/128]){const changed=fit(samples.map(s=>({timeSeconds:2048+8*s.timeSeconds,value:factor*s.value+1024})));for(const key of Object.keys(original.alternatives)){const a=original.alternatives[key],b=changed.alternatives[key],error=Math.abs(a.score-b.score);maxError=Math.max(maxError,error);assert.ok(error<1e-8);assert.equal(a.rho,b.rho);assert.equal(a.index,b.index);}count++;}}
const receipt={signedUnitTimeCourses:count,allAlternativeScoreMaximumError:maxError};if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(receipt);
