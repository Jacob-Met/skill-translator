// Reproduce the historical gate experiment without editing production source.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sourceBlobs={
  "src/instrument-change-study.mjs": "eac031a1ddf6cca2f52983b822791dfc0b6c163f",
  "src/instrument-trace.mjs": "223baaf6c340b2130522fc03edbb7d3eaab1def7",
  "src/narration-clock.mjs": "4f7a26a7c091881225d3d852b00da7c4e79a091c",
  "src/demonstration-sequence.mjs": "3030edd3ad809cab11fc220365aacb34e2d01b42",
  "src/frame-origin.mjs": "9154d9e63255de95152e3137d5790de5e9f00e42",
  "src/capture.mjs": "763d09298e03c4275b802c83df92c773de62cd67",
  "src/geometry.mjs": "ff9fb2268ead7ea4c78b8d74e1da0b00fdbf3061",
  "src/sequence-capture.mjs": "cd583d5a4d3c3c28b6d4e1dd4fec3a1c2cd5847b",
  "src/capture-editing.mjs": "570ee1ac63928e5837920288243e8ea7621936c9",
  "src/authoring.mjs": "01c7a2c25a2ce45f0786d6247f71cc2c239e1af5",
  "src/instrument-change-models.mjs": "7ac7c9030b692bea794ee50a2b4b726ce44ef2d3",
  "src/instrument-change-proposals.mjs": "55472fedd184d87e9ce66bd0708ac12f331b6899"
};
const destination=new URL('./interventions/step-gate-all/',import.meta.url);
fs.mkdirSync(destination,{recursive:true});
const gate="if(candidateScore<step.score||(totalZ>0&&sse<=64*Number.EPSILON*(Math.abs(totalZ)+Math.abs(left*d)+Math.abs(right*e))))",manifest=[];
for(const [path,blob] of Object.entries(sourceBlobs)){
 const raw=fs.readFileSync(new URL('../../'+path,import.meta.url));
 const actual=createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex');
 assert.equal(actual,blob,'Frozen diagnostic source changed: '+path);
 const original=raw.toString('utf8');let candidate=original;
 if(path.endsWith('/instrument-change-models.mjs')){
  assert.equal(original.split(gate).length,2,'The step gate must occur exactly once');
  candidate=original.replace(gate,'if(true)');
 }
 const file=new URL(path.split('/').at(-1),destination);
 try{fs.writeFileSync(file,candidate,{flag:'wx'});}
 catch(error){if(error.code!=='EEXIST')throw error;assert.equal(fs.readFileSync(file,'utf8'),candidate,'Existing diagnostic differs');}
 manifest.push({path,sourceBlob:blob,sha256:createHash('sha256').update(candidate).digest('hex')});
}
console.log(JSON.stringify({scope:'Temporary quadratic gate-only diagnostic; production files untouched',files:manifest},null,2));
