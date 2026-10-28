import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {initialChoices,correctChoice,acceptTrace} from '../src/temporal-point-proposals.mjs';
import {createRestartRequest,receiveRestartProposal,acceptRestart} from '../src/temporal-point-restart.mjs';
const dir=fs.mkdtempSync('/tmp/temporal-restart-course-');
const parent=JSON.parse(fs.readFileSync('test/fixtures/restart-parent-report.json'));
const options={reviewedOriginalFrames:true,annotation:{label:'Original reviewed point',kind:'fraction',toleranceMm:1},reference:{samePlaneAndCorners:true,label:'Independent plane',basis:'Original common corners explicitly reviewed'}};
let choices=correctChoice(parent,initialChoices(parent),'moment-2',{x:106.25,y:101.75},'Explicit independent restart on original');
const accepted=acceptTrace(parent,choices,options),request=createRestartRequest(parent,choices,'moment-2','Point manually located after flat original',accepted);
fs.writeFileSync(`${dir}/request.json`,JSON.stringify(request));
function run(input,output){return spawnSync(process.execPath,['tools/temporal-points/restart.mjs',input,output],{encoding:'utf8',env:process.env});}
let r=run(`${dir}/request.json`,`${dir}/report.json`);assert.equal(r.status,0,r.stderr);
const bytes=fs.readFileSync(`${dir}/report.json`),raw=JSON.parse(bytes),got=receiveRestartProposal(raw),path=acceptRestart(raw,got.choices,options);
assert.deepEqual(path.samples.slice(0,3),accepted.samples.slice(0,3));assert.deepEqual(path.sequence.moments.slice(0,3),accepted.sequence.moments.slice(0,3));assert.equal(path.samples[1].markId,null);assert.deepEqual(got.choices[1].sourcePx,{x:109.25,y:104.75});
r=run(`${dir}/request.json`,`${dir}/report.json`);assert.notEqual(r.status,0);assert.deepEqual(fs.readFileSync(`${dir}/report.json`),bytes);
const bad=structuredClone(request);bad.acceptedParent.sequence.moments[0].image.sha256='0'.repeat(64);fs.writeFileSync(`${dir}/bad.json`,JSON.stringify(bad));r=run(`${dir}/bad.json`,`${dir}/bad-report.json`);assert.notEqual(r.status,0);assert.equal(fs.existsSync(`${dir}/bad-report.json`),false);
const receipt={groups:3,result:'pass',directory:dir,claims:['actual unchanged native grayscale producer suffix','exact accepted prefix and explicit gap retained','existing output and changed source refuse'],scope:'authored translational grayscale raster; no continuity inference across gap'};fs.writeFileSync('restart-cli-receiving.json',JSON.stringify(receipt,null,2)+'\n');console.log(receipt);
